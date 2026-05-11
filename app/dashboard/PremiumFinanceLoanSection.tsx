"use client";
import { useState } from "react";
import RefinanceSection from "./RefinanceSection";

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

interface Policy {
  id: string;
  policy_number: string;
  carrier: string;
  product_name: string;
  product_type: string;
  face_amount: number;
  cash_value: number;
  loan_balance: number;
  net_cash_value: number;
  annual_premium: number;
  dividend_value: number;
  status: string;
}

interface Props {
  accounts: CollateralAccount[];
  policies: Policy[];
  advisorName: string;
  clientId: string;
  clientName: string;
}

const fmt = (n: number) =>
  !n || n === 0 ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtRate = (r: number) => (r * 100).toFixed(2) + "%";

const fmtPct = (n: number, d: number) =>
  d === 0 ? "—" : (n / d * 100).toFixed(1) + "%";

const coverageColor = (ratio: number, required: number) => {
  if (ratio >= required * 1.2) return { bar: "bg-green-400", text: "text-green-700", badge: "bg-green-50 text-green-700 border-green-200" };
  if (ratio >= required)       return { bar: "bg-amber-400", text: "text-amber-700", badge: "bg-amber-50 text-amber-700 border-amber-200" };
  return                              { bar: "bg-red-400",   text: "text-red-600",   badge: "bg-red-50 text-red-600 border-red-200" };
};

export default function PremiumFinanceLoanSection({ accounts, policies, advisorName, clientId, clientName }: Props) {
  const [tab, setTab] = useState<"details" | "refinance">("details");
  const active = accounts.filter(a => a.status === "active");

  const totalBalance  = active.reduce((s, a) => s + a.loan_balance,  0);
  const totalOriginal = active.reduce((s, a) => s + a.loan_amount,   0);
  const totalAnnualInterest = active.reduce((s, a) => s + a.loan_balance * a.interest_rate, 0);
  const blendedRate = totalBalance > 0
    ? active.reduce((s, a) => s + a.interest_rate * a.loan_balance, 0) / totalBalance
    : 0;

  if (active.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
        <p className="text-slate-400 text-sm">No active premium finance loans on file.</p>
        <p className="text-slate-300 text-xs mt-1">Contact {advisorName} to explore premium financing options.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Tab switcher */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[
            { key: "details"  as const, label: "Loan Details",      sub: "Balance · Rate · Collateral coverage" },
            { key: "refinance" as const, label: "Refinance Options", sub: "Competitive rates · Savings analysis · Request refi" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-6 py-4 text-left border-b-2 transition-all ${
                tab === t.key
                  ? "border-[#C9A84C] bg-[#C9A84C]/5"
                  : "border-transparent hover:bg-gray-50"
              }`}
            >
              <p className={`text-sm font-semibold ${tab === t.key ? "text-[#0A1628]" : "text-slate-400"}`}>{t.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{t.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Refinance tab */}
      {tab === "refinance" && (
        <RefinanceSection
          policies={policies}
          clientId={clientId}
          clientName={clientName}
          advisorName={advisorName}
          collateralAccounts={accounts}
        />
      )}

      {/* Loan details tab */}
      {tab === "details" && <>

      {/* Portfolio summary — only if multiple loans */}
      {active.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Outstanding", value: fmt(totalBalance),         sub: `${active.length} active loans`,          accent: "border-[#C9A84C]" },
            { label: "Original Loan Total", value: fmt(totalOriginal),      sub: "Combined facility size",                  accent: "border-slate-300" },
            { label: "Annual Interest",     value: fmt(totalAnnualInterest),sub: "Total carrying cost",                     accent: "border-red-400" },
            { label: "Blended Rate",        value: fmtRate(blendedRate),    sub: "Weighted average APR",                    accent: "border-blue-400" },
          ].map(m => (
            <div key={m.label} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${m.accent}`}>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">{m.label}</p>
              <p className="text-[#0A1628] text-xl font-light">{m.value}</p>
              <p className="text-xs text-slate-400 mt-1">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Individual loan cards */}
      {active.map((loan, i) => {
        const annualInterest  = loan.loan_balance * loan.interest_rate;
        const monthlyInterest = annualInterest / 12;
        const paidDown        = loan.loan_amount > 0 ? loan.loan_amount - loan.loan_balance : null;
        const paidDownPct     = loan.loan_amount > 0 ? (paidDown! / loan.loan_amount) * 100 : null;
        const coverageRatio   = loan.collateral_value > 0 && loan.loan_balance > 0
          ? loan.collateral_value / loan.loan_balance
          : null;
        const linkedPolicy    = loan.policy_id ? policies.find(p => p.id === loan.policy_id) : null;
        const colors = coverageRatio != null ? coverageColor(coverageRatio, loan.required_ratio) : null;

        return (
          <div key={loan.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#C9A84C] text-xs font-bold">{loan.lender.slice(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-[#0A1628] font-semibold text-sm">{loan.lender}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Premium Finance Loan{linkedPolicy ? ` · ${linkedPolicy.carrier} Policy ${linkedPolicy.policy_number}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {colors && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${colors.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.bar}`} />
                    {coverageRatio! >= loan.required_ratio ? "Coverage Met" : "Below Required Coverage"}
                  </span>
                )}
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Main detail grid */}
            <div className="p-6 grid grid-cols-3 gap-6">

              {/* Column 1 — Loan figures */}
              <div className="space-y-4">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest">Loan Details</p>
                {loan.loan_amount > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Original Loan Amount</p>
                    <p className="text-[#0A1628] text-sm font-medium">{fmt(loan.loan_amount)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Outstanding Balance</p>
                  <p className="text-[#C9A84C] text-2xl font-semibold">{fmt(loan.loan_balance)}</p>
                </div>
                {paidDown != null && paidDown > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Principal Paid Down</p>
                    <p className="text-green-600 text-sm font-medium">{fmt(paidDown)}</p>
                    <p className="text-slate-400 text-[10px]">{paidDownPct!.toFixed(1)}% of original</p>
                  </div>
                )}
              </div>

              {/* Column 2 — Interest cost */}
              <div className="space-y-4">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest">Interest Cost</p>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Interest Rate</p>
                  <p className="text-red-500 text-2xl font-semibold">{fmtRate(loan.interest_rate)}</p>
                  <p className="text-slate-400 text-[10px]">APR · Fixed</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Annual Interest</p>
                  <p className="text-[#0A1628] text-sm font-medium">{fmt(Math.round(annualInterest))}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Monthly Interest</p>
                  <p className="text-[#0A1628] text-sm font-medium">{fmt(Math.round(monthlyInterest))}</p>
                </div>
              </div>

              {/* Column 3 — Collateral */}
              <div className="space-y-4">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest">Collateral Position</p>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Pledged Collateral Value</p>
                  <p className="text-[#0A1628] text-sm font-medium">{fmt(loan.collateral_value)}</p>
                </div>
                {loan.required_ratio > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Required Coverage Ratio</p>
                    <p className="text-[#0A1628] text-sm font-medium">{(loan.required_ratio * 100).toFixed(0)}%</p>
                    <p className="text-slate-400 text-[10px]">Min. collateral as % of balance</p>
                  </div>
                )}
                {coverageRatio != null && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Actual Coverage</p>
                    <p className={`text-sm font-semibold ${colors!.text}`}>
                      {(coverageRatio * 100).toFixed(1)}%
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      {coverageRatio >= loan.required_ratio
                        ? `${((coverageRatio - loan.required_ratio) * 100).toFixed(1)}% above requirement`
                        : `${((loan.required_ratio - coverageRatio) * 100).toFixed(1)}% below requirement`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Coverage bar */}
            {coverageRatio != null && (
              <div className="px-6 pb-5 space-y-2">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Collateral Coverage</span>
                  <span className={colors!.text + " font-semibold"}>
                    {fmt(loan.collateral_value)} pledged vs {fmt(loan.loan_balance)} owed
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden relative">
                  {/* Required ratio marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                    style={{ left: `${Math.min(loan.required_ratio / (coverageRatio * 1.2), 0.95) * 100}%` }}
                  />
                  <div
                    className={`h-full rounded-full transition-all ${colors!.bar}`}
                    style={{ width: `${Math.min((coverageRatio / (Math.max(coverageRatio, loan.required_ratio) * 1.2)) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-300">
                  <span>Required: {(loan.required_ratio * 100).toFixed(0)}%</span>
                  <span>Actual: {(coverageRatio * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}

            {/* Key numbers summary bar */}
            <div className="px-6 py-4 bg-[#F9FAFB] border-t border-gray-50">
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 mb-0.5">Loan-to-Value</p>
                  <p className="text-[#0A1628] font-semibold">
                    {loan.collateral_value > 0 ? fmtPct(loan.loan_balance, loan.collateral_value) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">Daily Interest</p>
                  <p className="text-[#0A1628] font-semibold">{fmt(Math.round(annualInterest / 365))}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">5-Year Interest Cost</p>
                  <p className="text-[#0A1628] font-semibold">{fmt(Math.round(annualInterest * 5))}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">Net Collateral Surplus</p>
                  <p className={`font-semibold ${loan.collateral_value - loan.loan_balance > 0 ? "text-green-600" : "text-red-500"}`}>
                    {fmt(Math.round(loan.collateral_value - loan.loan_balance))}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {loan.notes && (
              <div className="px-6 py-3 border-t border-gray-50">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Notes</p>
                <p className="text-slate-600 text-xs">{loan.notes}</p>
              </div>
            )}
          </div>
        );
      })}

      {/* Interest cost context */}
      <div className="bg-[#0A1628] rounded-2xl px-7 py-6 grid grid-cols-3 gap-8">
        <div>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-2">Annual Interest Burden</p>
          <p className="text-white text-2xl font-light">{fmt(Math.round(totalAnnualInterest))}</p>
          <p className="text-slate-400 text-xs mt-1">Total carrying cost this year</p>
        </div>
        <div>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-2">10-Year Interest Cost</p>
          <p className="text-[#C9A84C] text-2xl font-light">{fmt(Math.round(totalAnnualInterest * 10))}</p>
          <p className="text-slate-400 text-xs mt-1">At current rate and balance</p>
        </div>
        <div>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-2">Refinance Options</p>
          <p className="text-white text-sm font-medium mt-2">See what you could save</p>
          <button
            onClick={() => setTab("refinance")}
            className="mt-2 text-[#C9A84C] text-xs hover:text-[#E8C96C] transition-colors"
          >
            View rate comparison →
          </button>
        </div>
      </div>

      </> /* end details tab */}

    </div>
  );
}
