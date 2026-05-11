"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

interface Props {
  policies: Policy[];
  clientId: string;
  clientName: string;
  advisorName: string;
  collateralAccounts: CollateralAccount[];
}

interface Lender {
  name: string;
  rate: number;
  structure: string;
  highlight?: boolean;
}

const COMPETITIVE_LENDERS: Lender[] = [
  { name: "BrightHouse Financial",    rate: 0.0585, structure: "Fixed — 5-yr term" },
  { name: "Pacific Mutual Holding",   rate: 0.0610, structure: "Fixed — 5-yr term" },
  { name: "Lincoln Financial Bank",   rate: 0.0625, structure: "SOFR + 2.00%" },
  { name: "M Financial Group",        rate: 0.0640, structure: "Fixed — 5-yr term" },
  { name: "US Premium Finance",       rate: 0.0660, structure: "SOFR + 2.35%" },
  { name: "BOK Financial",            rate: 0.0685, structure: "Prime-based" },
];

const fmt = (n: number) =>
  !n || n === 0 ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtRate = (r: number) => (r * 100).toFixed(2) + "%";

const fmtDelta = (n: number) => {
  const s = "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n > 0 ? "+" + s : "−" + s;
};

export default function RefinanceSection({
  policies,
  clientId,
  clientName,
  advisorName,
  collateralAccounts,
}: Props) {
  const [selectedLenderIdx, setSelectedLenderIdx] = useState(0);
  const [requestNotes, setRequestNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeLoans = collateralAccounts.filter((a) => a.status === "active" && a.loan_balance > 0);
  const totalLoanBalance = activeLoans.reduce((s, a) => s + a.loan_balance, 0);
  const weightedRate =
    totalLoanBalance > 0
      ? activeLoans.reduce((s, a) => s + a.interest_rate * a.loan_balance, 0) / totalLoanBalance
      : 0;

  const currentAnnualInterest = totalLoanBalance * weightedRate;
  const bestRate = COMPETITIVE_LENDERS[0].rate;
  const bestAnnualInterest = totalLoanBalance * bestRate;
  const bestAnnualSavings = currentAnnualInterest - bestAnnualInterest;

  const target = COMPETITIVE_LENDERS[selectedLenderIdx];
  const targetAnnualInterest = totalLoanBalance * target.rate;
  const targetAnnualSavings = currentAnnualInterest - targetAnnualInterest;
  const targetRateDiff = weightedRate - target.rate;

  const projectionYears = [1, 3, 5, 7, 10];

  const handleSubmit = async () => {
    setSubmitting(true);
    const supabase = createClient();
    const loanDetails = activeLoans
      .map((a) => `${a.lender} ${fmt(a.loan_balance)} @ ${fmtRate(a.interest_rate)}`)
      .join("; ");
    await supabase.from("action_items").insert({
      client_id: clientId,
      label: `Refinance request — ${target.name} @ ${fmtRate(target.rate)} (saves ${fmt(targetAnnualSavings)}/yr)`,
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
      priority: "high",
      completed: false,
      notes: `Current financing: ${loanDetails}. Target lender: ${target.name} at ${fmtRate(target.rate)} (${target.structure}). Annual savings: ${fmt(targetAnnualSavings)}. Client notes: ${requestNotes || "none"}`,
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (activeLoans.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
        <p className="text-slate-400 text-sm">No active premium finance loans on file.</p>
        <p className="text-slate-300 text-xs mt-1">Contact your advisor to discuss premium financing options.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Opportunity banner */}
      {bestAnnualSavings > 0 && (
        <div className="bg-[#0A1628] rounded-2xl px-7 py-6 flex items-center justify-between">
          <div>
            <p className="text-[#C9A84C] text-[10px] uppercase tracking-widest font-semibold mb-1">Rate Opportunity Identified</p>
            <p className="text-white text-xl font-light">
              Refinancing to {fmtRate(bestRate)} could save{" "}
              <span className="text-[#C9A84C] font-semibold">{fmt(bestAnnualSavings)}</span> per year
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Your current blended rate is {fmtRate(weightedRate)} · Best available: {fmtRate(bestRate)} ({COMPETITIVE_LENDERS[0].name})
            </p>
          </div>
          <div className="text-right flex-shrink-0 ml-8">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">10-Year Savings</p>
            <p className="text-[#C9A84C] text-3xl font-light">{fmt(bestAnnualSavings * 10)}</p>
          </div>
        </div>
      )}

      {/* Current loan summary */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Your Current Financing</p>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(activeLoans.length + 1, 4)}, 1fr)` }}>
          {activeLoans.map((loan) => (
            <div key={loan.id} className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-red-400">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">{loan.lender}</p>
              <p className="text-[#0A1628] text-xl font-light mb-1">{fmt(loan.loan_balance)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-red-500 font-semibold">{fmtRate(loan.interest_rate)} APR</span>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-xs text-slate-400">{fmt(loan.loan_balance * loan.interest_rate)}/yr interest</span>
              </div>
            </div>
          ))}
          {activeLoans.length > 1 && (
            <div className="bg-[#F4F5F7] rounded-2xl p-5 border-l-4 border-slate-300">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">Blended Total</p>
              <p className="text-[#0A1628] text-xl font-light mb-1">{fmt(totalLoanBalance)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-red-500 font-semibold">{fmtRate(weightedRate)} blended</span>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-xs text-slate-400">{fmt(currentAnnualInterest)}/yr</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rate comparison table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-[#0A1628] font-medium text-sm">Competitive Rate Comparison</h3>
            <p className="text-slate-400 text-xs mt-0.5">Representative market rates for premium finance — as of {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          </div>
          <span className="text-[10px] text-slate-400 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
            On {fmt(totalLoanBalance)} balance
          </span>
        </div>

        {/* Current row */}
        <div className="px-6 py-4 bg-red-50/40 border-b border-red-100/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#0A1628]">
                {activeLoans.length === 1 ? activeLoans[0].lender : "Current Blended"}
                <span className="ml-2 text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">Current</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Your existing premium financing</p>
            </div>
          </div>
          <div className="flex items-center gap-10 text-right">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Rate</p>
              <p className="text-sm font-semibold text-red-500">{fmtRate(weightedRate)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Annual Interest</p>
              <p className="text-sm font-semibold text-[#0A1628]">{fmt(currentAnnualInterest)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">vs Best Rate</p>
              <p className="text-sm font-semibold text-red-500">—</p>
            </div>
            <div className="w-28" />
          </div>
        </div>

        {/* Competitive lenders */}
        {COMPETITIVE_LENDERS.map((lender, i) => {
          const annualInterest = totalLoanBalance * lender.rate;
          const annualSavings = currentAnnualInterest - annualInterest;
          const isSelected = selectedLenderIdx === i;
          const isBest = i === 0;
          return (
            <div
              key={lender.name}
              onClick={() => setSelectedLenderIdx(i)}
              className={`px-6 py-4 border-b border-gray-50 flex items-center justify-between cursor-pointer transition-all ${
                isSelected ? "bg-[#C9A84C]/5 border-l-4 border-l-[#C9A84C]" : "hover:bg-gray-50/50 border-l-4 border-l-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBest ? "bg-green-500" : "bg-slate-300"}`} />
                <div>
                  <p className="text-sm font-medium text-[#0A1628]">
                    {lender.name}
                    {isBest && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-semibold">Best Available</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{lender.structure}</p>
                </div>
              </div>
              <div className="flex items-center gap-10 text-right">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Rate</p>
                  <p className="text-sm font-semibold text-green-600">{fmtRate(lender.rate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Annual Interest</p>
                  <p className="text-sm font-semibold text-[#0A1628]">{fmt(annualInterest)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Annual Savings</p>
                  <p className="text-sm font-semibold text-green-600">{fmt(annualSavings)}</p>
                </div>
                <div className="w-28 text-right">
                  <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected ? "bg-[#C9A84C] text-[#0A1628]" : "bg-gray-50 text-slate-400 hover:bg-gray-100"
                  }`}>
                    {isSelected ? "Selected ✓" : "Select"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="px-6 py-3 bg-gray-50/50">
          <p className="text-slate-300 text-[10px]">
            Rates are representative market estimates and not guaranteed offers. Actual rates depend on creditworthiness, loan size, and lender terms at time of application.
          </p>
        </div>
      </div>

      {/* Savings analysis for selected lender */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h3 className="text-[#0A1628] font-medium text-sm">
            Refinance Analysis — {target.name}
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Switching from {fmtRate(weightedRate)} → {fmtRate(target.rate)} ({(targetRateDiff * 100).toFixed(2)}% rate reduction)
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Key metrics row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: "Rate Reduction",
                value: (targetRateDiff * 100).toFixed(2) + "%",
                sub: `${fmtRate(weightedRate)} → ${fmtRate(target.rate)}`,
                color: "text-green-600",
                accent: "border-green-400",
              },
              {
                label: "Annual Savings",
                value: fmt(targetAnnualSavings),
                sub: "Every year at current balance",
                color: "text-[#C9A84C]",
                accent: "border-[#C9A84C]",
              },
              {
                label: "Monthly Savings",
                value: fmt(Math.round(targetAnnualSavings / 12)),
                sub: "Immediate cash flow improvement",
                color: "text-[#0A1628]",
                accent: "border-blue-400",
              },
              {
                label: "10-Year Total Savings",
                value: fmt(targetAnnualSavings * 10),
                sub: "At current balance",
                color: "text-[#0A1628]",
                accent: "border-slate-300",
              },
            ].map((m) => (
              <div key={m.label} className={`bg-[#F4F5F7] rounded-2xl p-5 border-l-4 ${m.accent}`}>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">{m.label}</p>
                <p className={`text-xl font-semibold mb-1 ${m.color}`}>{m.value}</p>
                <p className="text-xs text-slate-400">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Side-by-side interest comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <p className="text-red-500 text-[10px] uppercase tracking-widest font-semibold mb-4">Current — {activeLoans.length === 1 ? activeLoans[0].lender : "Blended"}</p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Interest Rate</span>
                  <span className="text-red-500 font-semibold">{fmtRate(weightedRate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Loan Balance</span>
                  <span className="text-[#0A1628] font-medium">{fmt(totalLoanBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Annual Interest</span>
                  <span className="text-red-500 font-semibold">{fmt(currentAnnualInterest)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Monthly Interest</span>
                  <span className="text-red-500 font-medium">{fmt(Math.ceil(currentAnnualInterest / 12))}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
              <p className="text-green-600 text-[10px] uppercase tracking-widest font-semibold mb-4">After Refinance — {target.name}</p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Interest Rate</span>
                  <span className="text-green-600 font-semibold">{fmtRate(target.rate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Loan Balance</span>
                  <span className="text-[#0A1628] font-medium">{fmt(totalLoanBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Annual Interest</span>
                  <span className="text-green-600 font-semibold">{fmt(targetAnnualInterest)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Monthly Interest</span>
                  <span className="text-green-600 font-medium">{fmt(Math.ceil(targetAnnualInterest / 12))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Year-by-year savings projection */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-4">Cumulative Savings Projection</p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F4F5F7]">
                    {["Year", "Annual Savings", "Cumulative Savings", "Effective Rate", "Interest Paid (New)", "Interest Avoided"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {projectionYears.map((y) => {
                    const cumSavings = targetAnnualSavings * y;
                    const interestPaidNew = targetAnnualInterest * y;
                    const interestAvoided = currentAnnualInterest * y - interestPaidNew;
                    return (
                      <tr key={y} className={`hover:bg-gray-50/50 ${y === 10 ? "bg-green-50/30" : ""}`}>
                        <td className="px-4 py-3 text-sm font-semibold text-[#0A1628]">
                          Year {y}
                          {y === 10 && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">10-yr</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">{fmt(targetAnnualSavings)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#C9A84C]">{fmt(cumSavings)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{fmtRate(target.rate)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{fmt(interestPaidNew)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">{fmt(interestAvoided)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* LTV comparison bar */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                <span>Interest as % of Loan Balance (Current)</span>
                <span className="text-red-500 font-semibold">{fmtRate(weightedRate)}</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full" style={{ width: `${(weightedRate / 0.12) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                <span>Interest as % of Loan Balance (After Refi)</span>
                <span className="text-green-600 font-semibold">{fmtRate(target.rate)}</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full" style={{ width: `${(target.rate / 0.12) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-[#0A1628] rounded-xl px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-[#C9A84C] text-[10px] uppercase tracking-widest font-semibold mb-1">Bottom Line</p>
              <p className="text-white text-sm">
                Refinancing to {target.name} at {fmtRate(target.rate)} saves{" "}
                <span className="text-[#C9A84C] font-semibold">{fmt(targetAnnualSavings)}</span> in year one
                and <span className="text-[#C9A84C] font-semibold">{fmt(targetAnnualSavings * 10)}</span> over 10 years —
                interest that stays in your estate instead of going to the lender.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Request refinance */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-[#0A1628] font-medium text-sm mb-1">Request a Refinance</p>
        <p className="text-slate-400 text-xs mb-5">
          Submit this to {advisorName} — they&apos;ll reach out within 1–2 business days to initiate the process with {target.name}.
        </p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
            <span className="text-green-500 text-xl">✓</span>
            <div>
              <p className="text-green-700 font-medium text-sm">Refinance request submitted</p>
              <p className="text-green-600 text-xs mt-0.5">
                {advisorName} will follow up with next steps for {target.name}.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary of what will be submitted */}
            <div className="bg-[#F4F5F7] rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Client</span>
                <span className="text-[#0A1628] font-medium">{clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Financing</span>
                <span className="text-[#0A1628] font-medium">
                  {activeLoans.map((a) => `${a.lender} ${fmtRate(a.interest_rate)}`).join(" · ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Lender</span>
                <span className="text-green-600 font-semibold">{target.name} — {fmtRate(target.rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Projected Annual Savings</span>
                <span className="text-[#C9A84C] font-semibold">{fmt(targetAnnualSavings)}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">
                Preferred Lender
              </label>
              <div className="flex flex-wrap gap-2">
                {COMPETITIVE_LENDERS.map((l, i) => (
                  <button
                    key={l.name}
                    onClick={() => setSelectedLenderIdx(i)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      selectedLenderIdx === i
                        ? "bg-[#C9A84C] text-[#0A1628] font-semibold"
                        : "bg-gray-50 text-slate-400 hover:bg-gray-100"
                    }`}
                  >
                    {l.name} · {fmtRate(l.rate)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="Any questions, timing requirements, or flexibility on lender preference..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] resize-none placeholder-slate-300"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting…" : `Request Refinance — Save ${fmt(targetAnnualSavings)}/Year`}
            </button>

            <p className="text-slate-300 text-[10px] text-center">
              This initiates a conversation with your advisor — no lender application is filed automatically.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
