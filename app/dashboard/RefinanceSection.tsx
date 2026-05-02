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

interface Props {
  policies: Policy[];
  clientId: string;
  clientName: string;
  advisorName: string;
}

const LOAN_RATE = 0.05;

type Scenario = "current" | "offset" | "partial" | "full";

const scenarios: { key: Scenario; label: string; desc: string }[] = [
  { key: "current",  label: "Current Position",   desc: "Your loan as it stands today" },
  { key: "offset",   label: "Offset Interest",     desc: "Use dividends to cover loan interest" },
  { key: "partial",  label: "Partial Paydown",     desc: "Pay a lump sum toward the loan balance" },
  { key: "full",     label: "Full Repayment",      desc: "Model a full loan payoff over time" },
];

const fmt = (n: number) =>
  !n || n === 0 ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const pct = (n: number, d: number) =>
  d === 0 ? "0%" : (Math.round((n / d) * 1000) / 10).toFixed(1) + "%";

export default function RefinanceSection({ policies, clientId, clientName, advisorName }: Props) {
  const [activeScenario, setActiveScenario] = useState<Scenario>("current");
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(
    policies.find((p) => p.loan_balance > 0)?.id ?? policies[0]?.id ?? ""
  );
  const [partialAmount, setPartialAmount] = useState(0);
  const [fullYears, setFullYears] = useState(3);
  const [requestNotes, setRequestNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loanPolicies = policies.filter((p) => p.loan_balance > 0);
  const policy = policies.find((p) => p.id === selectedPolicyId) ?? loanPolicies[0];

  const totalLoan = policies.reduce((s, p) => s + (p.loan_balance ?? 0), 0);
  const totalCash = policies.reduce((s, p) => s + (p.cash_value ?? 0), 0);
  const totalNet = policies.reduce((s, p) => s + (p.net_cash_value ?? 0), 0);
  const totalDividends = policies.reduce((s, p) => s + (p.dividend_value ?? 0), 0);

  const annualInterest = (policy?.loan_balance ?? 0) * LOAN_RATE;
  const dividendCoverage = Math.min(policy?.dividend_value ?? 0, annualInterest);
  const netInterestAfterDividend = annualInterest - dividendCoverage;

  const partialNewBalance = Math.max(0, (policy?.loan_balance ?? 0) - partialAmount);
  const partialNewInterest = partialNewBalance * LOAN_RATE;
  const partialInterestSaving = annualInterest - partialNewInterest;

  const fullMonthlyPayment =
    fullYears > 0 && policy?.loan_balance
      ? Math.ceil((policy.loan_balance * LOAN_RATE * Math.pow(1 + LOAN_RATE / 12, fullYears * 12)) /
          (Math.pow(1 + LOAN_RATE / 12, fullYears * 12) - 1))
      : 0;
  const fullTotalPaid = fullMonthlyPayment * fullYears * 12;
  const fullTotalInterest = fullTotalPaid - (policy?.loan_balance ?? 0);

  const handleSubmit = async () => {
    if (!policy) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("action_items").insert({
      client_id: clientId,
      label: `Refinance request — ${policy.carrier} Policy ${policy.policy_number} (${scenarios.find(s => s.key === activeScenario)?.label})`,
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
      priority: "high",
      completed: false,
      notes: requestNotes || null,
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (policies.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <p className="text-slate-400 text-sm">No policies on file yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Portfolio loan summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Loan Balance",  value: fmt(totalLoan),  sub: "Across all policies",        accent: "border-red-400" },
          { label: "Total Cash Value",    value: fmt(totalCash),  sub: "Before loans",               accent: "border-[#C9A84C]" },
          { label: "Net Cash Value",      value: fmt(totalNet),   sub: "After loan deduction",       accent: "border-green-400" },
          { label: "Annual Dividends",    value: fmt(totalDividends), sub: "Available to offset interest", accent: "border-blue-400" },
        ].map((m) => (
          <div key={m.label} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${m.accent}`}>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">{m.label}</p>
            <p className="text-[#0A1628] text-xl font-light mb-1">{m.value}</p>
            <p className="text-xs text-slate-400">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Policy selector (only if multiple have loans) */}
      {loanPolicies.length > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Select Policy to Model</p>
          <div className="flex flex-wrap gap-2">
            {loanPolicies.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPolicyId(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  selectedPolicyId === p.id
                    ? "bg-[#0A1628] text-white"
                    : "bg-gray-50 text-slate-500 hover:bg-gray-100"
                }`}
              >
                {p.carrier} · {p.policy_number}
                <span className="ml-2 opacity-60">{fmt(p.loan_balance)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loanPolicies.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <p className="text-green-700 font-medium text-sm">No active loans on your policies</p>
          <p className="text-green-600 text-xs mt-1">Your policies are currently unencumbered. Contact your advisor to discuss leveraging cash value.</p>
        </div>
      ) : (
        <>
          {/* Scenario toggles */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 border-b border-gray-100">
              {scenarios.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveScenario(s.key)}
                  className={`px-4 py-4 text-left transition-all border-b-2 ${
                    activeScenario === s.key
                      ? "border-[#C9A84C] bg-[#C9A84C]/5"
                      : "border-transparent hover:bg-gray-50"
                  }`}
                >
                  <p className={`text-xs font-semibold ${activeScenario === s.key ? "text-[#0A1628]" : "text-slate-400"}`}>
                    {s.label}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{s.desc}</p>
                </button>
              ))}
            </div>

            <div className="p-6">

              {/* ── CURRENT POSITION ── */}
              {activeScenario === "current" && policy && (
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[#0A1628] font-medium text-sm">{policy.carrier} — {policy.policy_number}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{policy.product_name}</p>
                    </div>
                    <span className="text-[10px] px-3 py-1 rounded-full bg-red-50 text-red-600 font-semibold">Loan Active</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Loan Balance",       value: fmt(policy.loan_balance),     note: "Outstanding" },
                      { label: "Cash Value",          value: fmt(policy.cash_value),       note: "Before loan" },
                      { label: "Net Cash Value",      value: fmt(policy.net_cash_value),   note: "After loan" },
                      { label: "Loan-to-Value",       value: pct(policy.loan_balance, policy.cash_value), note: "LTV ratio" },
                      { label: "Annual Interest",     value: fmt(annualInterest),          note: `At ${(LOAN_RATE * 100).toFixed(0)}% rate` },
                      { label: "Monthly Interest",    value: fmt(Math.ceil(annualInterest / 12)), note: "Approximate" },
                    ].map((m) => (
                      <div key={m.label} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">{m.label}</p>
                        <p className="text-[#0A1628] text-lg font-light">{m.value}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{m.note}</p>
                      </div>
                    ))}
                  </div>
                  {/* LTV bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                      <span>Loan vs Cash Value</span>
                      <span>{pct(policy.loan_balance, policy.cash_value)} LTV</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (policy.loan_balance / policy.cash_value) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-300 mt-1">
                      <span>$0</span>
                      <span>{fmt(policy.cash_value)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── OFFSET INTEREST ── */}
              {activeScenario === "offset" && policy && (
                <div className="space-y-5">
                  <p className="text-slate-500 text-sm">
                    Apply your policy dividends toward the annual loan interest. This keeps the loan from compounding without requiring out-of-pocket payments.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Annual Interest Due",      value: fmt(annualInterest),         color: "text-red-500" },
                      { label: "Dividend Credit",          value: fmt(dividendCoverage),       color: "text-[#C9A84C]" },
                      { label: "Net Interest (Out-of-Pocket)", value: fmt(netInterestAfterDividend), color: "text-[#0A1628]" },
                    ].map((m) => (
                      <div key={m.label} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">{m.label}</p>
                        <p className={`text-lg font-light ${m.color}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className={`rounded-xl p-4 flex items-start gap-3 ${
                    dividendCoverage >= annualInterest
                      ? "bg-green-50 border border-green-100"
                      : "bg-amber-50 border border-amber-100"
                  }`}>
                    <span className="text-lg flex-shrink-0">{dividendCoverage >= annualInterest ? "✓" : "⚠"}</span>
                    <div>
                      {dividendCoverage >= annualInterest ? (
                        <p className="text-green-700 text-sm font-medium">Dividends fully cover interest</p>
                      ) : (
                        <p className="text-amber-700 text-sm font-medium">
                          Dividends cover {pct(dividendCoverage, annualInterest)} of interest — {fmt(netInterestAfterDividend)}/yr remains
                        </p>
                      )}
                      <p className="text-xs mt-1 text-slate-500">Your advisor can set this up so dividends are automatically applied each year.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PARTIAL PAYDOWN ── */}
              {activeScenario === "partial" && policy && (
                <div className="space-y-5">
                  <p className="text-slate-500 text-sm">
                    Model the impact of making a lump-sum payment toward your loan balance. This reduces both the balance and the ongoing interest cost.
                  </p>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                      Paydown Amount: <span className="text-[#0A1628] font-semibold">{fmt(partialAmount)}</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={policy.loan_balance}
                      step={1000}
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(Number(e.target.value))}
                      className="w-full accent-[#C9A84C]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-300 mt-1">
                      <span>$0</span>
                      <span>{fmt(policy.loan_balance)} (full)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Before Paydown</p>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Loan Balance</span>
                          <span className="text-[#0A1628] font-medium">{fmt(policy.loan_balance)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Annual Interest</span>
                          <span className="text-red-500 font-medium">{fmt(annualInterest)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">After Paydown</p>
                      <div className="bg-green-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">New Loan Balance</span>
                          <span className="text-[#0A1628] font-medium">{fmt(partialNewBalance)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Annual Interest</span>
                          <span className="text-green-600 font-medium">{fmt(partialNewInterest)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {partialAmount > 0 && (
                    <div className="bg-[#0A1628] rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest">Annual Interest Savings</p>
                        <p className="text-[#C9A84C] text-2xl font-light mt-1">{fmt(partialInterestSaving)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest">10-Year Savings</p>
                        <p className="text-white text-2xl font-light mt-1">{fmt(partialInterestSaving * 10)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── FULL REPAYMENT ── */}
              {activeScenario === "full" && policy && (
                <div className="space-y-5">
                  <p className="text-slate-500 text-sm">
                    Model paying off the full loan balance over a set timeframe using fixed monthly payments.
                  </p>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                      Payoff Timeline: <span className="text-[#0A1628] font-semibold">{fullYears} {fullYears === 1 ? "year" : "years"}</span>
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 5, 7, 10].map((y) => (
                        <button
                          key={y}
                          onClick={() => setFullYears(y)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            fullYears === y
                              ? "bg-[#0A1628] text-white"
                              : "bg-gray-50 text-slate-400 hover:bg-gray-100"
                          }`}
                        >
                          {y}yr
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Monthly Payment",    value: fmt(fullMonthlyPayment),  note: "Fixed",              color: "text-[#0A1628]" },
                      { label: "Total Paid",          value: fmt(fullTotalPaid),       note: `Over ${fullYears} yr`, color: "text-[#0A1628]" },
                      { label: "Total Interest Cost", value: fmt(fullTotalInterest),   note: "Cost of the loan",   color: "text-red-500" },
                    ].map((m) => (
                      <div key={m.label} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">{m.label}</p>
                        <p className={`text-xl font-light ${m.color}`}>{m.value}</p>
                        <p className="text-slate-400 text-[10px] mt-1">{m.note}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <p className="text-green-700 text-sm font-medium">After payoff: {fmt(policy.cash_value)} fully accessible</p>
                    <p className="text-green-600 text-xs mt-0.5">No more loan interest. Full cash value restored for future loans or withdrawals.</p>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Request form */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-[#0A1628] font-medium text-sm mb-1">Request a Refinance Review</p>
            <p className="text-slate-400 text-xs mb-5">
              Submit this to {advisorName} — they'll reach out within 1–2 business days to walk through your options.
            </p>
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <div>
                  <p className="text-green-700 font-medium text-sm">Request submitted</p>
                  <p className="text-green-600 text-xs mt-0.5">{advisorName} will follow up shortly.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Client Name</label>
                    <input
                      readOnly
                      value={clientName}
                      className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm text-slate-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Policy</label>
                    <select
                      value={selectedPolicyId}
                      onChange={(e) => setSelectedPolicyId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]"
                    >
                      {loanPolicies.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.carrier} — {p.policy_number} ({fmt(p.loan_balance)} loan)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">
                    Scenario of Interest
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {scenarios.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setActiveScenario(s.key)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                          activeScenario === s.key
                            ? "bg-[#C9A84C] text-[#0A1628] font-semibold"
                            : "bg-gray-50 text-slate-400 hover:bg-gray-100"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Notes (optional)</label>
                  <textarea
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="Any context, questions, or timing constraints..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] resize-none placeholder-slate-300"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || loanPolicies.length === 0}
                  className="w-full py-3.5 bg-[#0A1628] hover:bg-[#0d1e3a] text-white rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : `Send to ${advisorName.split(" ")[0]}`}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
