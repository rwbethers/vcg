"use client";
import { useState } from "react";

interface Policy {
  product_type: string;
  owner_type: string;
  owner_name: string;
  death_benefit: number;
  cash_value: number;
  net_cash_value: number;
  dividend_value: number;
  status: string;
  carrier: string;
  policy_number: string;
}

interface Props {
  policies: Policy[];
  clientName: string;
  illustratedRate?: number;
}

const ESTATE_TAX_RATE = 0.40;

const fmt = (n: number) =>
  !n || n === 0 ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });


const taxBenefits = [
  {
    icon: "◈",
    title: "Tax-Deferred Cash Value Growth",
    description:
      "Your cash value grows every year without generating a taxable event. Unlike a brokerage account, you receive no 1099 — the IRS does not tax internal policy growth.",
    tag: "IRC § 7702",
    color: "border-[#C9A84C]",
    tagColor: "bg-[#C9A84C]/10 text-[#C9A84C]",
  },
  {
    icon: "⟁",
    title: "Income Tax-Free Policy Loans",
    description:
      "When you access your cash value via a policy loan, you receive funds income-tax-free. Loans are not considered income and do not appear on your tax return.",
    tag: "IRC § 72(e)",
    color: "border-blue-400",
    tagColor: "bg-blue-50 text-blue-700",
  },
  {
    icon: "◆",
    title: "Income Tax-Free Death Benefit",
    description:
      "Your beneficiaries receive the death benefit completely free of federal income tax. This is one of the most efficient wealth transfer vehicles available.",
    tag: "IRC § 101(a)",
    color: "border-green-400",
    tagColor: "bg-green-50 text-green-700",
  },
  {
    icon: "▦",
    title: "Estate Tax Planning via Trust Ownership",
    description:
      "Policies owned by an irrevocable trust are removed from your taxable estate. This shields the death benefit from estate taxes and ensures proceeds pass directly to heirs.",
    tag: "ILIT Strategy",
    color: "border-purple-400",
    tagColor: "bg-purple-50 text-purple-700",
  },
  {
    icon: "⊟",
    title: "Dividend Income Not Currently Taxable",
    description:
      "Dividends paid by Penn Mutual are considered a return of premium — not income — up to your cost basis. They accumulate tax-free when used to purchase paid-up additions.",
    tag: "IRS Rev. Rul. 2009-13",
    color: "border-amber-400",
    tagColor: "bg-amber-50 text-amber-700",
  },
  {
    icon: "◇",
    title: "No Contribution Limits",
    description:
      "Unlike IRAs or 401(k)s, permanent life insurance has no annual contribution cap (subject to MEC rules). High earners can move significant capital into a tax-advantaged structure.",
    tag: "Non-Qualified",
    color: "border-slate-400",
    tagColor: "bg-slate-100 text-slate-600",
  },
];

export default function TaxStrategySection({ policies, clientName, illustratedRate = 7 }: Props) {
  const [bracket, setBracket] = useState(35);
  const [loanAmount, setLoanAmount] = useState(100_000);

  const activePolicies = policies.filter((p) => p.status === "Active");
  const totalDB        = activePolicies.reduce((s, p) => s + (p.death_benefit  ?? 0), 0);
  const totalCV        = activePolicies.reduce((s, p) => s + (p.cash_value     ?? 0), 0);
  const totalDividend  = activePolicies.reduce((s, p) => s + (p.dividend_value ?? 0), 0);
  const trustPolicies  = activePolicies.filter((p) => p.owner_type === "Trust" || p.owner_type === "LLC");
  const hasTrustOwnership = trustPolicies.length > 0;
  const trustDB        = trustPolicies.reduce((s, p) => s + (p.death_benefit ?? 0), 0);

  const firstName = clientName.split(" ")[0];
  const rate      = illustratedRate / 100;

  // ── Tax Drag ──
  const annualGrowth   = totalCV * rate;
  const annualTaxDrag  = annualGrowth * (bracket / 100);

  const tenYearDrag = (() => {
    let taxFree = totalCV, taxable = totalCV;
    for (let i = 0; i < 10; i++) {
      const g = taxFree * rate;
      taxFree += g;
      const gT = taxable * rate;
      taxable  += gT - gT * (bracket / 100);
    }
    return Math.round(taxFree - taxable);
  })();

  // ── Scorecard ──
  const savedGrowthTax   = annualTaxDrag;
  const savedDividendTax = totalDividend * (bracket / 100);
  const estateShield     = trustDB * ESTATE_TAX_RATE;

  // ── Loan comparison ──
  const k401AfterTax       = Math.round(loanAmount * (1 - bracket / 100));
  const brokerageAfterTax  = Math.round(loanAmount * (1 - 0.20));
  const taxCostK401        = loanAmount - k401AfterTax;
  const taxCostBrokerage   = loanAmount - brokerageAfterTax;

  return (
    <div className="space-y-8">

      {/* ── PERSONALIZED BANNER ── */}
      <div className="bg-[#0A1628] rounded-2xl p-6">
        <p className="text-[#C9A84C] text-[10px] uppercase tracking-widest mb-3">Your Tax Position</p>
        <h2 className="text-white text-xl font-light mb-4">
          {firstName}, your portfolio is structured for maximum tax efficiency.
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Tax-Free Death Benefit</p>
            <p className="text-[#C9A84C] text-lg font-semibold">{fmt(totalDB)}</p>
            <p className="text-slate-500 text-[10px] mt-1">Passes to heirs income-tax-free</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Tax-Deferred Cash Value</p>
            <p className="text-[#C9A84C] text-lg font-semibold">{fmt(totalCV)}</p>
            <p className="text-slate-500 text-[10px] mt-1">No 1099 · No annual tax event</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Trust / LLC Ownership</p>
            <p className="text-[#C9A84C] text-lg font-semibold">
              {hasTrustOwnership ? `${trustPolicies.length} ${trustPolicies.length === 1 ? "Policy" : "Policies"}` : "None"}
            </p>
            <p className="text-slate-500 text-[10px] mt-1">
              {hasTrustOwnership ? "Estate tax shielded" : "Consider trust ownership"}
            </p>
          </div>
        </div>
      </div>

      {/* ── ANNUAL TAX SAVINGS SCORECARD ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-[#0A1628] font-medium text-sm">Annual Tax Savings Scorecard</h3>
            <p className="text-slate-400 text-xs mt-0.5">The tax bill your portfolio is legally avoiding each year</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">Your bracket:</p>
            <div className="flex gap-1">
              {[24, 32, 35, 37].map((b) => (
                <button
                  key={b}
                  onClick={() => setBracket(b)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    bracket === b
                      ? "bg-[#0A1628] text-white"
                      : "bg-gray-100 text-slate-400 hover:bg-gray-200"
                  }`}
                >
                  {b}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-3 gap-5">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-500 text-lg">◈</span>
              <p className="text-green-700 text-xs font-semibold uppercase tracking-widest">Growth Tax Avoided</p>
            </div>
            <p className="text-[#0A1628] text-2xl font-light mb-1">{fmt(Math.round(savedGrowthTax))}</p>
            <p className="text-slate-400 text-[10px]">
              {fmt(Math.round(annualGrowth))} in growth at {illustratedRate}% · {bracket}% bracket
            </p>
            <p className="text-slate-400 text-[10px] mt-1">Taxable account would owe this annually</p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-blue-500 text-lg">⊟</span>
              <p className="text-blue-700 text-xs font-semibold uppercase tracking-widest">Dividend Tax Avoided</p>
            </div>
            <p className="text-[#0A1628] text-2xl font-light mb-1">{fmt(Math.round(savedDividendTax))}</p>
            <p className="text-slate-400 text-[10px]">
              {fmt(Math.round(totalDividend))} in dividends · {bracket}% ordinary income rate
            </p>
            <p className="text-slate-400 text-[10px] mt-1">Paid-up additions accumulate tax-free</p>
          </div>

          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-purple-500 text-lg">▦</span>
              <p className="text-purple-700 text-xs font-semibold uppercase tracking-widest">Estate Tax Shielded</p>
            </div>
            <p className="text-[#0A1628] text-2xl font-light mb-1">{hasTrustOwnership ? fmt(Math.round(estateShield)) : "—"}</p>
            <p className="text-slate-400 text-[10px]">
              {hasTrustOwnership
                ? `${fmt(trustDB)} in trust · 40% estate tax avoided`
                : "No trust-owned policies currently"}
            </p>
            <p className="text-slate-400 text-[10px] mt-1">Benefit passes directly to heirs</p>
          </div>
        </div>

        <div className="mx-6 mb-6 bg-[#0A1628] rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Total Annual Tax Savings</p>
            <p className="text-[#C9A84C] text-2xl font-semibold">
              {fmt(Math.round(savedGrowthTax + savedDividendTax))}
            </p>
            <p className="text-slate-500 text-[10px] mt-1">Tax drag eliminated by your policy structure vs. a taxable account</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">10-Year Compounding Benefit</p>
            <p className="text-white text-2xl font-light">{fmt(tenYearDrag)}</p>
            <p className="text-slate-500 text-[10px] mt-1">Additional wealth vs. taxable account at {bracket}%</p>
          </div>
        </div>
      </div>

      {/* ── TAX DRAG CALCULATOR ── */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-[#0A1628] font-medium text-sm mb-1">Tax Drag Calculator</h3>
        <p className="text-slate-400 text-xs mb-6">
          What a taxable account at {bracket}% would cost you on the same {illustratedRate}% growth — compounded over 10 years
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-red-100 rounded-xl p-5">
            <p className="text-red-500 text-[10px] font-semibold uppercase tracking-widest mb-3">Taxable Account</p>
            <div className="space-y-3">
              {[1, 3, 5, 10].map((yr) => {
                let bal = totalCV;
                for (let i = 0; i < yr; i++) {
                  const g = bal * rate;
                  bal += g - g * (bracket / 100);
                }
                return (
                  <div key={yr} className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Year {yr}</span>
                    <span className="text-slate-700 text-sm font-medium">{fmt(Math.round(bal))}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border border-green-100 bg-green-50/20 rounded-xl p-5">
            <p className="text-green-600 text-[10px] font-semibold uppercase tracking-widest mb-3">Your Policy (Tax-Free Growth)</p>
            <div className="space-y-3">
              {[1, 3, 5, 10].map((yr) => {
                const bal = Math.round(totalCV * Math.pow(1 + rate, yr));
                return (
                  <div key={yr} className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Year {yr}</span>
                    <span className="text-green-600 text-sm font-semibold">{fmt(bal)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-[#F4F5F7] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[#0A1628] text-sm font-medium">10-Year Tax Drag at {bracket}% Bracket</p>
            <p className="text-red-500 text-xl font-semibold">−{fmt(tenYearDrag)}</p>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full"
              style={{
                width: `${100 - (tenYearDrag / (totalCV * (Math.pow(1 + rate, 10) - 1))) * 100}%`
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-[10px] text-green-600">Policy keeps this</p>
            <p className="text-[10px] text-red-400">IRS takes this</p>
          </div>
        </div>
      </div>

      {/* ── POLICY LOAN VS TAXABLE WITHDRAWAL ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h3 className="text-[#0A1628] font-medium text-sm mb-1">Policy Loan vs. Taxable Withdrawal</h3>
          <p className="text-slate-400 text-xs">When you need cash — how much you actually keep</p>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm font-medium">Amount Needed</p>
              <p className="text-[#0A1628] text-lg font-semibold">{fmt(loanAmount)}</p>
            </div>
            <input
              type="range"
              min={25_000}
              max={1_000_000}
              step={25_000}
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full accent-[#C9A84C]"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-400">$25K</span>
              <span className="text-[10px] text-slate-400">$1M</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#0A1628] rounded-2xl p-5">
              <p className="text-[#C9A84C] text-[10px] font-semibold uppercase tracking-widest mb-3">Policy Loan</p>
              <p className="text-white text-2xl font-light mb-1">{fmt(loanAmount)}</p>
              <p className="text-green-400 text-sm font-semibold mb-3">$0 in taxes</p>
              <ul className="space-y-1.5">
                {["Not reported as income", "No withholding", "Cash value continues growing", "Repay on your schedule"].map(item => (
                  <li key={item} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                    <span className="text-green-400 flex-shrink-0">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-red-100 rounded-2xl p-5">
              <p className="text-red-500 text-[10px] font-semibold uppercase tracking-widest mb-3">401(k) / IRA Withdrawal</p>
              <p className="text-[#0A1628] text-2xl font-light mb-1">{fmt(k401AfterTax)}</p>
              <p className="text-red-500 text-sm font-semibold mb-3">−{fmt(taxCostK401)} in taxes</p>
              <ul className="space-y-1.5">
                {[
                  `Taxed at ${bracket}% ordinary income`,
                  "Mandatory withholding",
                  "10% penalty if under 59½",
                  "Reduces future tax-deferred growth",
                ].map(item => (
                  <li key={item} className="flex items-start gap-1.5 text-[10px] text-slate-500">
                    <span className="text-red-400 flex-shrink-0">✕</span>{item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-orange-100 rounded-2xl p-5">
              <p className="text-orange-500 text-[10px] font-semibold uppercase tracking-widest mb-3">Brokerage Sale</p>
              <p className="text-[#0A1628] text-2xl font-light mb-1">{fmt(brokerageAfterTax)}</p>
              <p className="text-orange-500 text-sm font-semibold mb-3">−{fmt(taxCostBrokerage)} in taxes</p>
              <ul className="space-y-1.5">
                {[
                  "20% long-term capital gains",
                  "3.8% net investment income tax",
                  "May trigger state tax",
                  "Reduces invested capital permanently",
                ].map(item => (
                  <li key={item} className="flex items-start gap-1.5 text-[10px] text-slate-500">
                    <span className="text-orange-400 flex-shrink-0">✕</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-xl px-5 py-3">
            <p className="text-[#0A1628] text-xs font-semibold">
              A policy loan gives you the full {fmt(loanAmount)} — the 401(k) costs you {fmt(taxCostK401)} more and the brokerage sale costs you {fmt(taxCostBrokerage)} more to access the same amount.
            </p>
          </div>
        </div>
      </div>

      {/* ── ESTATE TAX SHIELD ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h3 className="text-[#0A1628] font-medium text-sm mb-1">Estate Tax Shield Meter</h3>
          <p className="text-slate-400 text-xs">Death benefit removed from your taxable estate via trust ownership</p>
        </div>

        <div className="p-6">
          {hasTrustOwnership ? (
            <>
              <div className="grid grid-cols-3 gap-5 mb-6">
                <div className="bg-[#F4F5F7] rounded-xl p-5">
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">Trust-Owned Death Benefit</p>
                  <p className="text-[#0A1628] text-2xl font-light">{fmt(trustDB)}</p>
                  <p className="text-slate-400 text-[10px] mt-1">Excluded from taxable estate</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
                  <p className="text-purple-600 text-[10px] uppercase tracking-widest mb-2">Estate Tax Avoided</p>
                  <p className="text-purple-700 text-2xl font-semibold">{fmt(Math.round(estateShield))}</p>
                  <p className="text-slate-400 text-[10px] mt-1">At 40% federal estate tax rate</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                  <p className="text-green-600 text-[10px] uppercase tracking-widest mb-2">Heirs Receive</p>
                  <p className="text-green-700 text-2xl font-semibold">{fmt(trustDB)}</p>
                  <p className="text-slate-400 text-[10px] mt-1">100% — zero tax at transfer</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                  <span>Heirs keep ({fmt(trustDB)})</span>
                  <span>Estate tax avoided ({fmt(Math.round(estateShield))})</span>
                </div>
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-green-400 rounded-l-full"
                    style={{ width: `${(1 - ESTATE_TAX_RATE) * 100}%` }}
                  />
                  <div
                    className="h-full bg-purple-400"
                    style={{ width: `${ESTATE_TAX_RATE * 100}%` }}
                  />
                </div>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="text-[10px] text-slate-400">What heirs receive (60%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    <span className="text-[10px] text-slate-400">Estate tax avoided (40%)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {trustPolicies.map((p) => (
                  <div key={p.policy_number} className="flex items-center justify-between bg-[#F4F5F7] rounded-lg px-4 py-3">
                    <div>
                      <p className="text-[#0A1628] text-xs font-medium">{p.carrier} — Policy {p.policy_number}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Owner: {p.owner_name} · {p.owner_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#C9A84C] text-sm font-semibold">{fmt(p.death_benefit)}</p>
                      <p className="text-slate-400 text-[10px]">Outside estate</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm mb-2">No trust-owned policies currently</p>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Moving your {fmt(totalDB)} death benefit into an irrevocable trust could shield{" "}
                {fmt(Math.round(totalDB * ESTATE_TAX_RATE))} in potential estate taxes. Ask your advisor about an ILIT strategy.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── TAXABLE VS TAX-ADVANTAGED ── */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-[#0A1628] font-medium text-sm mb-1">Taxable vs. Tax-Advantaged Growth</h3>
        <p className="text-slate-400 text-xs mb-6">How your cash value compares to a taxable account at the same growth rate</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-red-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <p className="text-slate-600 text-sm font-medium">Taxable Brokerage Account</p>
            </div>
            <ul className="space-y-2.5">
              {[
                "Annual gains taxed at capital gains rate (15–20%)",
                "Dividends taxed as ordinary income",
                "Included in taxable estate",
                "Heirs pay income tax on IRD",
                "1099 issued every year",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-500">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-green-100 bg-green-50/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <p className="text-slate-600 text-sm font-medium">Your VCG Life Insurance Portfolio</p>
            </div>
            <ul className="space-y-2.5">
              {[
                "Cash value grows with zero annual tax event",
                "Dividends accumulate tax-free as PUAs",
                "Trust-owned policies excluded from estate",
                "Heirs receive death benefit income-tax-free",
                "No 1099 · No K-1 · No schedule D",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── TAX BENEFIT CARDS ── */}
      <div>
        <h3 className="text-[#0A1628] font-medium text-sm mb-4">Tax Advantages in Your Portfolio</h3>
        <div className="grid grid-cols-2 gap-4">
          {taxBenefits.map((b) => (
            <div key={b.title} className={`bg-white rounded-2xl shadow-sm p-5 border-l-4 ${b.color}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#C9A84C]">{b.icon}</span>
                  <h4 className="text-[#0A1628] text-sm font-medium">{b.title}</h4>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-2 ${b.tagColor}`}>
                  {b.tag}
                </span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── DISCLAIMER ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
        <span className="text-amber-500 text-lg">⚠</span>
        <p className="text-amber-700 text-xs">
          This overview is for educational purposes only and does not constitute tax advice. Consult your CPA or tax attorney regarding your specific situation. IRC references are provided for informational purposes.
        </p>
      </div>

    </div>
  );
}
