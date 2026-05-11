import PptxGenJS from "pptxgenjs";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Brand palette (hex without #)
const NAVY  = "0A1628";
const GOLD  = "AE8422"; // matches template exactly
const DARK  = "1A1A1A";
const LIGHT = "F2F2F2"; // matches template lt2
const WHITE = "FFFFFF";
const GRAY  = "575249"; // dark warm gray from template
const LGRAY = "8A8680"; // medium gray for labels

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined || n === 0) return "—";
  const abs = Math.abs(n);
  const str = "$" + abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n < 0 ? `(${str})` : str;
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtPayUp(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function fmtPct(n: number | null | undefined) {
  if (!n) return "—";
  return n.toFixed(2) + "%";
}

interface Policy {
  id: string;
  policy_number: string;
  carrier: string;
  product_name: string;
  product_type: string;
  insured_name: string;
  owner_name: string;
  owner_type: string;
  issue_date: string | null;
  issue_age: number | null;
  face_amount: number;
  death_benefit: number;
  cash_value: number;
  loan_balance: number;
  net_cash_value: number;
  annual_premium: number;
  annual_prem: number;
  pay_up_date: string | null;
  dividend_option: string | null;
  dividend_value: number;
  mec_status: boolean;
  riders: string[] | null;
  status: string;
  illustrated_rate: number | null;
  total_premium_paid: number | null;
  interest_rate: number | null;
}

interface CollateralAccount {
  id: string;
  lender: string;
  loan_amount: number;
  loan_balance: number;
  interest_rate: number;
  collateral_value: number;
  required_ratio: number;
  status: string;
  notes: string | null;
  policy_id: string | null;
}

interface Client {
  id: string;
  name: string;
  advisor: string;
  type: string;
  member_since: string;
  state: string;
}

export async function POST(req: Request) {
  const { client_id, quarter } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: client }, { data: policies }, { data: collateral }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", client_id).single(),
    supabase.from("policies").select("*").eq("client_id", client_id).order("issue_date"),
    supabase.from("collateral_accounts").select("*").eq("client_id", client_id),
  ]);

  if (!client || !policies) {
    return Response.json({ error: "Client or policies not found" }, { status: 404 });
  }

  const cl  = client as Client;
  const pol = policies as Policy[];
  const col = (collateral ?? []) as CollateralAccount[];
  const active = pol.filter(p => p.status === "Active");

  // Aggregate totals
  const totalDB       = active.reduce((s, p) => s + (p.death_benefit  ?? 0), 0);
  const totalCV       = active.reduce((s, p) => s + (p.cash_value     ?? 0), 0);
  const totalLoan     = active.reduce((s, p) => s + (p.loan_balance   ?? 0), 0);
  const totalPrem     = active.reduce((s, p) => s + (p.annual_premium ?? p.annual_prem ?? 0), 0);
  const totalPremPaid = active.reduce((s, p) => s + (p.total_premium_paid ?? 0), 0);
  const totalGap      = col.reduce((s, a) => s + (a.collateral_value ?? 0), 0);

  const avgRate = active.length
    ? active.reduce((s, p) => s + (p.illustrated_rate ?? 0), 0) / active.length
    : null;

  const latestPayUp = active
    .map(p => p.pay_up_date)
    .filter(Boolean)
    .sort()
    .pop() ?? null;

  const avgIntRate = col.length
    ? col.reduce((s, a) => s + (a.interest_rate ?? 0), 0) / col.length
    : active.reduce((s, p) => s + (p.interest_rate ?? 0), 0) / (active.length || 1);

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const monthYear = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();

  const pptx = new PptxGenJS();
  pptx.layout  = "LAYOUT_16x9";
  pptx.author  = "Vision Consulting Group";
  pptx.company = "Vision Consulting Group";
  pptx.subject = `Inforce Policy Review — ${cl.name} — ${quarter}`;
  pptx.title   = `VCG Policy Review — ${cl.name}`;

  // ─────────────────────────────────────────────
  // SLIDE 1 — Cover
  // ─────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: DARK };

    // Top gold bar
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });

    // Left gold accent strip
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.5, h: "100%", fill: { color: GOLD }, line: { color: GOLD } });

    // Client name — all caps, large
    s.addText(cl.name.toUpperCase(), {
      x: 1.0, y: 1.4, w: 11.5, h: 1.8,
      fontSize: 54, bold: false, color: WHITE,
      fontFace: "Calibri Light",
    });

    // Review label
    s.addText("INFORCE POLICY REVIEW", {
      x: 1.0, y: 3.3, w: 11, h: 0.6,
      fontSize: 18, bold: false, color: GOLD,
      charSpacing: 5, fontFace: "Calibri",
    });

    // Date
    s.addText(monthYear, {
      x: 1.0, y: 4.0, w: 6, h: 0.45,
      fontSize: 14, color: LIGHT, fontFace: "Calibri",
    });

    // Bottom bar
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 6.8, w: "100%", h: 0.7, fill: { color: "111111" }, line: { color: "111111" } });
    s.addText(`Prepared by  ${cl.advisor}  ·  Vision Consulting Group  ·  Confidential`, {
      x: 1.0, y: 6.9, w: 12, h: 0.4,
      fontSize: 9, color: LGRAY, fontFace: "Calibri",
    });

    // Bottom gold bar
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.42, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
  }

  // ─────────────────────────────────────────────
  // SLIDES 2–4 — Illustration placeholders
  // ─────────────────────────────────────────────
  const illusLabels = [
    "CURRENT MODEL",
    `INFORCE ILLUSTRATION  ·  ${avgRate ? fmtPct(avgRate) + " ILLUSTRATED RATE" : "CURRENT RATE"}`,
    "INFORCE ILLUSTRATION  ·  7.00% ILLUSTRATED RATE",
  ];

  illusLabels.forEach((label) => {
    const s = pptx.addSlide();
    s.background = { color: LIGHT };

    // Top gold bar
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });

    // Section label top-left
    s.addText(label, {
      x: 0.4, y: 0.2, w: 12, h: 0.4,
      fontSize: 9, bold: true, color: GRAY,
      charSpacing: 2, fontFace: "Calibri",
    });

    // Large placeholder box
    s.addShape(pptx.ShapeType.rect, {
      x: 0.4, y: 0.75, w: 12.55, h: 6.3,
      fill: { color: "E8E8E5" }, line: { color: "C8C5BF", pt: 1 },
    });

    s.addText("[ ILLUSTRATION IMAGE ]", {
      x: 0.4, y: 3.2, w: 12.55, h: 0.8,
      fontSize: 14, color: "B0ADA8", align: "center",
      fontFace: "Calibri Light",
    });
    s.addText("Insert carrier illustration screenshot or PDF image here", {
      x: 0.4, y: 4.0, w: 12.55, h: 0.4,
      fontSize: 9, color: "B0ADA8", align: "center",
      fontFace: "Calibri",
    });

    // Bottom gold bar
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.42, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
  });

  // ─────────────────────────────────────────────
  // SLIDE 5 — "SUMMARY" section divider
  // ─────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: DARK };

    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.5, h: "100%", fill: { color: GOLD }, line: { color: GOLD } });

    s.addText("SUMMARY", {
      x: 1.2, y: 2.8, w: 10, h: 1.2,
      fontSize: 60, bold: false, color: WHITE,
      fontFace: "Calibri Light",
    });

    s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.42, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
  }

  // ─────────────────────────────────────────────
  // SLIDE 6 — Policy & Loan Snapshot (9 metrics)
  // ─────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: LIGHT };

    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });

    s.addText("POLICY & LOAN SNAPSHOT", {
      x: 0.4, y: 0.22, w: 12, h: 0.4,
      fontSize: 9, bold: true, color: GRAY,
      charSpacing: 2, fontFace: "Calibri",
    });
    s.addText(`${cl.name.toUpperCase()}  ·  ${monthYear}`, {
      x: 0.4, y: 0.58, w: 12, h: 0.35,
      fontSize: 11, color: GRAY, fontFace: "Calibri Light",
    });

    // Divider
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.0, w: 12.55, h: 0.02, fill: { color: GOLD }, line: { color: GOLD } });

    // 9 metrics in a 3-column × 3-row grid
    const metrics = [
      { label: "CURRENT DEATH BENEFIT", sup: "1", value: fmt(totalDB) },
      { label: "CURRENT POLICY VALUE", sup: "1", value: fmt(totalCV) },
      { label: "AVG. ANNUAL CREDITING", sup: "2", value: fmtPct(avgRate) },
      { label: "ANNUAL PREMIUM AMOUNT", sup: "",  value: fmt(-totalPrem) },
      { label: "TOTAL PREMIUM PAID", sup: "",     value: totalPremPaid ? fmt(-totalPremPaid) : "—" },
      { label: "FINAL PREMIUM DATE", sup: "",     value: fmtPayUp(latestPayUp) },
      { label: "LOAN BALANCE (EOY)", sup: "",     value: fmt(-totalLoan) },
      { label: "CURRENT INT. RATE", sup: "3",    value: avgIntRate ? fmtPct(avgIntRate) : "—" },
      { label: "GAP COLLATERAL REQUIRED", sup: "4", value: totalGap ? fmt(totalGap) : "—" },
    ];

    const cols = 3;
    const cellW = 4.15;
    const cellH = 1.65;
    const startX = 0.4;
    const startY = 1.18;
    const padX = 0.1;

    metrics.forEach((m, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cellW + padX);
      const y = startY + row * (cellH + 0.08);

      // Cell background — alternating very subtle
      const bg = (row + col) % 2 === 0 ? "ECECEA" : "E4E4E1";
      s.addShape(pptx.ShapeType.rect, { x, y, w: cellW, h: cellH, fill: { color: bg }, line: { color: "D8D5D0", pt: 0.5 } });

      // Gold left accent
      s.addShape(pptx.ShapeType.rect, { x, y, w: 0.07, h: cellH, fill: { color: GOLD }, line: { color: GOLD } });

      // Label
      s.addText(m.label + (m.sup ? ` ${m.sup}` : ""), {
        x: x + 0.18, y: y + 0.2, w: cellW - 0.25, h: 0.38,
        fontSize: 8, bold: true, color: LGRAY,
        charSpacing: 1, fontFace: "Calibri",
      });

      // Value — large
      s.addText(m.value, {
        x: x + 0.18, y: y + 0.62, w: cellW - 0.25, h: 0.8,
        fontSize: 28, bold: false, color: GRAY,
        fontFace: "Calibri Light",
      });
    });

    // Footnotes
    const footnotes = [
      "1 As of most recent carrier statement",
      "2 Blended average across all active policies",
      "3 Per loan agreement",
      "4 Required to maintain collateral ratio",
    ];
    const fnY = startY + 3 * (cellH + 0.08) + 0.1;
    footnotes.forEach((fn, i) => {
      s.addText(fn, {
        x: startX + (i % 2) * 6.4, y: fnY + Math.floor(i / 2) * 0.22,
        w: 6, h: 0.22,
        fontSize: 7, color: LGRAY, fontFace: "Calibri",
        italic: true,
      });
    });

    s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.42, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
  }

  // ─────────────────────────────────────────────
  // SLIDE 7 — Summary & Action Items
  // ─────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: LIGHT };

    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });

    s.addText("SUMMARY & ACTION ITEMS", {
      x: 0.4, y: 0.22, w: 12, h: 0.4,
      fontSize: 9, bold: true, color: GRAY,
      charSpacing: 2, fontFace: "Calibri",
    });

    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.7, w: 12.55, h: 0.02, fill: { color: GOLD }, line: { color: GOLD } });

    // Left column: Projections summary
    s.addText("POLICY PROJECTIONS", {
      x: 0.4, y: 0.88, w: 6, h: 0.32,
      fontSize: 8, bold: true, color: GOLD, charSpacing: 1.5, fontFace: "Calibri",
    });

    const projRows = [
      ["Total Death Benefit",  fmt(totalDB)],
      ["Total Cash Value",     fmt(totalCV)],
      ["Active Policies",      active.length.toString()],
      ["Annual Premium",       fmt(totalPrem)],
      ...(avgRate ? [["Avg. Crediting Rate", fmtPct(avgRate)]] : []),
    ];

    projRows.forEach(([label, val], i) => {
      const y = 1.28 + i * 0.52;
      s.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 5.9, h: 0.48, fill: { color: i % 2 === 0 ? "E8E8E5" : "DDDBD7" }, line: { color: "D0CEC9", pt: 0.5 } });
      s.addText(label, { x: 0.55, y: y + 0.12, w: 3.2, h: 0.28, fontSize: 9, color: GRAY, fontFace: "Calibri" });
      s.addText(val, { x: 3.8, y: y + 0.12, w: 2.3, h: 0.28, fontSize: 9, bold: true, color: GRAY, align: "right", fontFace: "Calibri" });
    });

    // Right column: Action Items
    s.addText("CONSIDERATIONS", {
      x: 6.7, y: 0.88, w: 6.2, h: 0.32,
      fontSize: 8, bold: true, color: GOLD, charSpacing: 1.5, fontFace: "Calibri",
    });

    const considerations = [
      `Review updated inforce illustrations from each carrier for ${quarter}.`,
      `Confirm loan balance and interest rate with lender — ensure collateral ratio is maintained.`,
      `Evaluate any policy loans against current illustrated rate projections.`,
      `Discuss upcoming premium payment schedule and pay-up date: ${fmtPayUp(latestPayUp)}.`,
      `Schedule next quarterly review — confirm all carrier data is current.`,
    ];

    considerations.forEach((item, i) => {
      const y = 1.28 + i * 0.76;
      s.addShape(pptx.ShapeType.rect, { x: 6.7, y, w: 0.06, h: 0.6, fill: { color: GOLD }, line: { color: GOLD } });
      s.addText(item, {
        x: 6.88, y, w: 6.0, h: 0.68,
        fontSize: 9, color: GRAY, fontFace: "Calibri",
        lineSpacingMultiple: 1.2,
      });
    });

    s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.42, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
  }

  // ─────────────────────────────────────────────
  // SLIDE 8 — Disclosures header
  // ─────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: DARK };

    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.5, h: "100%", fill: { color: GOLD }, line: { color: GOLD } });

    s.addText("DISCLOSURES", {
      x: 1.2, y: 2.8, w: 10, h: 1.2,
      fontSize: 60, bold: false, color: WHITE,
      fontFace: "Calibri Light",
    });

    s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.42, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
  }

  // ─────────────────────────────────────────────
  // SLIDE 9 — Full disclosures text
  // ─────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: DARK };

    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });

    s.addText("DISCLOSURES & IMPORTANT INFORMATION", {
      x: 0.5, y: 0.22, w: 12, h: 0.38,
      fontSize: 9, bold: true, color: GOLD, charSpacing: 2, fontFace: "Calibri",
    });

    s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.68, w: 12.4, h: 0.02, fill: { color: GOLD }, line: { color: GOLD } });

    const disclosures = `This presentation has been prepared by Vision Consulting Group ("VCG") exclusively for the named client and is strictly confidential. The information contained herein is based on data provided by insurance carriers, lenders, and other third-party sources and is believed to be accurate as of the date shown. Policy values are from the most recent carrier inforce illustrations and may not reflect current account values.

THIS MATERIAL DOES NOT CONSTITUTE FINANCIAL, LEGAL, OR TAX ADVICE. Life insurance policy illustrations are not guarantees of future performance. Non-guaranteed policy elements — including but not limited to interest credits, dividend scales, and index participation rates — are subject to change at the sole discretion of the issuing carrier and are not guaranteed. Actual results may be higher or lower than those illustrated.

PREMIUM FINANCE DISCLOSURE: Premium financing involves borrowing funds to pay life insurance premiums. This strategy involves significant risks, including the risk that policy performance may not be sufficient to cover loan interest, that lenders may change terms or call loans, and that collateral requirements may increase. Clients should review all loan documents carefully and consult qualified legal and tax counsel before entering into any premium finance arrangement.

POLICY LOANS: Outstanding policy loans reduce the death benefit and cash value available to the policy owner. If a policy lapses with an outstanding loan, the loan amount may be treated as a taxable distribution. Clients are encouraged to monitor loan balances and accrued interest on a regular basis.

The tax information provided herein is general in nature and is not intended to be used, and cannot be relied upon, as a basis for avoiding tax penalties. VCG does not provide legal or tax advice. Clients should consult their attorney and CPA regarding their specific circumstances.

Securities offered through licensed broker-dealers. Insurance products offered through Vision Consulting Group. Not a deposit · Not FDIC insured · Not insured by any federal government agency · No bank guarantee · May lose value.

© ${new Date().getFullYear()} Vision Consulting Group. All rights reserved. Prepared for: ${cl.name}. Advisor: ${cl.advisor}. Date: ${today}.`;

    s.addText(disclosures, {
      x: 0.5, y: 0.82, w: 12.4, h: 6.4,
      fontSize: 7.5, color: LGRAY, fontFace: "Calibri",
      lineSpacingMultiple: 1.4, paraSpaceBefore: 5,
    });

    s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.42, w: "100%", h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
  }

  // ─── Generate and return ───
  const buffer = await pptx.write({ outputType: "nodebuffer" });
  const fileName = `VCG_PolicyReview_${cl.name.replace(/\s+/g, "_")}_${quarter.replace(/\s+/g, "_")}.pptx`;

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

function nextQuarter(q: string) {
  const [qPart, year] = q.split(" ");
  const qNum = parseInt(qPart.replace("Q", ""));
  if (qNum === 4) return `Q1 ${parseInt(year) + 1}`;
  return `Q${qNum + 1} ${year}`;
}
