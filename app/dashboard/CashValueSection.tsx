"use client";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Policy {
  cash_value: number;
  net_cash_value: number;
  loan_balance: number;
  dividend_value: number;
  status: string;
  product_type: string;
  carrier: string;
  policy_number: string;
}

interface Props {
  policies: Policy[];
}

const fmt = (n: number) =>
  !n || n === 0 ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtShort = (n: number) => {
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "K";
  return "$" + n;
};

function buildProjection(startingCV: number, years = 20, growthRate = 0.055) {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: years + 1 }, (_, i) => ({
    year: currentYear + i,
    value: Math.round(startingCV * Math.pow(1 + growthRate, i)),
  }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0A1628] border border-[#C9A84C]/30 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-slate-400 text-xs mb-1">{label}</p>
        <p className="text-[#C9A84C] text-sm font-semibold">{fmtShort(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function CashValueSection({ policies }: Props) {
  const activePolicies = policies.filter((p) => p.status === "Active");
  const totalCV = activePolicies.reduce((s, p) => s + (p.cash_value ?? 0), 0);
  const totalNetCV = activePolicies.reduce((s, p) => s + (p.net_cash_value ?? 0), 0);
  const totalLoan = activePolicies.reduce((s, p) => s + (p.loan_balance ?? 0), 0);
  const totalDividends = activePolicies.reduce((s, p) => s + (p.dividend_value ?? 0), 0);
  const availableLoan = Math.round(totalNetCV * 0.9);

  const [loanAmount, setLoanAmount] = useState(Math.round(availableLoan * 0.25));
  const loanRate = 0.05;
  const annualInterest = Math.round(loanAmount * loanRate);
  const monthlyInterest = Math.round(annualInterest / 12);

  const projectionData = buildProjection(totalCV > 0 ? totalCV : 0);

  const summaryCards = [
    { label: "Total Cash Value", value: fmt(totalCV), sub: "As of last statement", color: "border-[#C9A84C]" },
    { label: "Net Cash Value", value: fmt(totalNetCV), sub: "After outstanding loans", color: "border-green-400" },
    { label: "Available to Borrow", value: fmt(availableLoan), sub: "Up to 90% of net CV", color: "border-blue-400" },
    { label: "Annual Dividends", value: fmt(totalDividends), sub: "Reinvested as paid-up additions", color: "border-purple-400" },
  ];

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-5">
        {summaryCards.map((c) => (
          <div key={c.label} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${c.color}`}>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">{c.label}</p>
            <p className="text-[#0A1628] text-xl font-light mb-1.5">{c.value}</p>
            <p className="text-xs text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Loan Balance Breakdown */}
      {totalLoan > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[#0A1628] font-medium text-sm">Outstanding Loan</h3>
              <p className="text-slate-400 text-xs mt-0.5">Current loan balance against policy</p>
            </div>
            <span className="text-amber-600 font-semibold text-sm">{fmt(totalLoan)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-amber-400 h-2 rounded-full"
              style={{ width: `${Math.min((totalLoan / totalCV) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>Loan: {fmt(totalLoan)}</span>
            <span>Total CV: {fmt(totalCV)}</span>
          </div>
        </div>
      )}

      {/* Growth Projection Chart */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[#0A1628] font-medium text-sm">Projected Cash Value Growth</h3>
            <p className="text-slate-400 text-xs mt-0.5">20-year projection at 5.5% annual growth rate</p>
          </div>
          <div className="text-right">
            <p className="text-[#C9A84C] text-lg font-semibold">{fmtShort(projectionData[20]?.value ?? 0)}</p>
            <p className="text-slate-400 text-xs">Projected in 20 years</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={projectionData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="cvGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tickFormatter={fmtShort}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#C9A84C"
              strokeWidth={2.5}
              fill="url(#cvGradient)"
              dot={false}
              activeDot={{ r: 5, fill: "#C9A84C", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        <p className="text-slate-400 text-[10px] mt-4 text-center">
          Projection based on 5.5% assumed dividend scale. Actual results depend on Penn Mutual dividends and are not guaranteed.
        </p>
      </div>

      {/* Loan Calculator */}
      {availableLoan > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-[#0A1628] font-medium text-sm mb-1">Policy Loan Calculator</h3>
          <p className="text-slate-400 text-xs mb-6">
            You can borrow up to <span className="text-[#0A1628] font-medium">{fmt(availableLoan)}</span> against your policy at a competitive loan rate. Loans are income-tax-free and require no credit check.
          </p>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-slate-400 text-xs uppercase tracking-widest mb-3">
                Loan Amount: <span className="text-[#0A1628] font-semibold normal-case tracking-normal">{fmt(loanAmount)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={availableLoan}
                step={1000}
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full accent-[#C9A84C]"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>$0</span>
                <span>{fmt(availableLoan)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F4F5F7] rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">Annual Interest</p>
                <p className="text-[#0A1628] text-lg font-light">{fmt(annualInterest)}</p>
                <p className="text-slate-400 text-[10px] mt-1">At 5.0% rate</p>
              </div>
              <div className="bg-[#F4F5F7] rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">Monthly Interest</p>
                <p className="text-[#0A1628] text-lg font-light">{fmt(monthlyInterest)}</p>
                <p className="text-slate-400 text-[10px] mt-1">Accrues to loan balance</p>
              </div>
              <div className="bg-[#0A1628] rounded-xl p-4 col-span-2">
                <p className="text-slate-400 text-xs mb-1">Remaining Net CV After Loan</p>
                <p className="text-[#C9A84C] text-lg font-semibold">{fmt(totalNetCV - loanAmount)}</p>
                <p className="text-slate-400 text-[10px] mt-1">Policy stays in force</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-50">
            <p className="text-slate-400 text-xs">
              Policy loans do not require repayment on a fixed schedule. Unpaid interest is added to the loan balance. Contact your advisor before taking a loan to understand the impact on your policy.
            </p>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
        <span className="text-amber-500 text-lg">⚠</span>
        <p className="text-amber-700 text-xs">
          Values and projections are based on carrier statements and assumed dividend scales. Contact your advisor to request a current inforce illustration with updated values.
        </p>
      </div>
    </div>
  );
}
