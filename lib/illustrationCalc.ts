export interface IllustrationParams {
  faceAmount: number;
  annualPrem: number;
  premYears: number;
  illustratedRate: number; // percent e.g. 7.19
  issueAge: number;
  startDate: string; // ISO date — when policy was illustrated/issued
}

export interface PolicyYearRow {
  year: number;
  age: number;
  premiumPaid: number;
  cumulativePremium: number;
  cashValue: number;
  deathBenefit: number;
  netGain: number;
  returnMultiple: number;
}

export interface LiveSnapshot {
  policyYear: number;         // e.g. 3.2
  policyYearInt: number;      // floor — current full year
  monthsIn: number;
  projectedCV: number;
  projectedDB: number;
  cumulativePremiums: number;
  netGain: number;
  returnMultiple: number;     // CV / premiums paid
  premiumsRemaining: number;  // years of premiums left (0 if done)
  rows: PolicyYearRow[];      // full year-by-year table
}

// Simplified IUL accumulation model.
// Applies an 8% load to premiums in premium-paying years (covers COI + expense charges),
// then compounds at the illustrated rate. Post-pay years use a lighter 3% drag for ongoing COI.
function buildRows(p: IllustrationParams, yearsToProject: number): PolicyYearRow[] {
  const rate = p.illustratedRate / 100;
  const rows: PolicyYearRow[] = [];
  let cv = 0;
  let cumPrem = 0;

  for (let yr = 1; yr <= yearsToProject; yr++) {
    const inPayPeriod = yr <= p.premYears;
    const premThisYear = inPayPeriod ? p.annualPrem : 0;
    cumPrem += premThisYear;

    if (inPayPeriod) {
      cv = (cv + premThisYear * 0.92) * (1 + rate);
    } else {
      cv = cv * (1 + rate * 0.97);
    }

    const db = Math.max(p.faceAmount, cv * 1.05); // DB at least face, grows with CV for IUL
    rows.push({
      year: yr,
      age: p.issueAge + yr,
      premiumPaid: premThisYear,
      cumulativePremium: cumPrem,
      cashValue: Math.round(cv),
      deathBenefit: Math.round(db),
      netGain: Math.round(cv - cumPrem),
      returnMultiple: cumPrem > 0 ? cv / cumPrem : 0,
    });
  }
  return rows;
}

export function calcLiveSnapshot(p: IllustrationParams): LiveSnapshot {
  const start = new Date(p.startDate).getTime();
  const now = Date.now();
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const yearsElapsed = Math.max(0, (now - start) / msPerYear);
  const policyYearInt = Math.floor(yearsElapsed);
  const monthsIn = Math.round((yearsElapsed - policyYearInt) * 12);

  const rows = buildRows(p, 30); // 30-year projection table

  // Interpolate CV between full years for the "right now" snapshot
  const prevRow = rows[policyYearInt - 1];
  const currRow = rows[policyYearInt];

  let projectedCV = 0;
  let projectedDB = p.faceAmount;
  let cumulativePremiums = 0;

  if (policyYearInt === 0) {
    // Less than 1 year in — prorate
    const frac = yearsElapsed;
    const firstYearCV = rows[0]?.cashValue ?? 0;
    projectedCV = firstYearCV * frac;
    cumulativePremiums = p.annualPrem * Math.min(frac, 1);
    projectedDB = p.faceAmount;
  } else if (currRow) {
    const frac = yearsElapsed - policyYearInt;
    projectedCV = prevRow.cashValue + (currRow.cashValue - prevRow.cashValue) * frac;
    cumulativePremiums = prevRow.cumulativePremium + (currRow.cumulativePremium - prevRow.cumulativePremium) * frac;
    projectedDB = prevRow.deathBenefit + (currRow.deathBenefit - prevRow.deathBenefit) * frac;
  } else {
    // Past end of projection table
    const last = rows[rows.length - 1];
    projectedCV = last.cashValue;
    cumulativePremiums = last.cumulativePremium;
    projectedDB = last.deathBenefit;
  }

  projectedCV = Math.round(projectedCV);
  projectedDB = Math.round(projectedDB);
  cumulativePremiums = Math.round(cumulativePremiums);

  const netGain = projectedCV - cumulativePremiums;
  const returnMultiple = cumulativePremiums > 0 ? projectedCV / cumulativePremiums : 0;
  const premiumsRemaining = Math.max(0, p.premYears - yearsElapsed);

  return {
    policyYear: Math.round(yearsElapsed * 10) / 10,
    policyYearInt,
    monthsIn,
    projectedCV,
    projectedDB,
    cumulativePremiums,
    netGain,
    returnMultiple,
    premiumsRemaining,
    rows,
  };
}
