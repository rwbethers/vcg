"use client";
import { useState } from "react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  type: string;
  advisor: string;
  member_since: string;
  state: string;
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
  issue_date: string;
  issue_age: number;
  rate_class: string;
  face_amount: number;
  death_benefit: number;
  cash_value: number;
  loan_balance: number;
  net_cash_value: number;
  annual_premium: number;
  pay_up_date: string | null;
  dividend_option: string | null;
  dividend_value: number;
  mec_status: boolean;
  riders: string[] | null;
  last_statement_date: string | null;
  status: string;
}

interface ActionItem {
  id: string;
  label: string;
  due_date: string;
  priority: string;
  completed: boolean;
}

interface Props {
  client: Client;
  policies: Policy[];
  actionItems: ActionItem[];
}

const statusColors: Record<string, string> = {
  Active: "bg-green-50 text-green-700",
  Surrendered: "bg-gray-100 text-gray-500",
  Lapsed: "bg-red-50 text-red-600",
  "Under Review": "bg-yellow-50 text-yellow-700",
};

const fmt = (n: number) =>
  !n || n === 0 ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtPayUp = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const navItems = [
  { label: "Overview", icon: "▦" },
  { label: "Policies", icon: "◈" },
  { label: "Cash Value", icon: "◎" },
  { label: "Tax Strategy", icon: "⟁" },
  { label: "Documents", icon: "⊟" },
  { label: "Contact Advisor", icon: "◇" },
];

const highlights = [
  "Penn Mutual Flexible Choice Whole Life provides guaranteed death benefit with growing paid-up additions",
  "Policy is set to pay up at age 65 — premiums end, coverage remains permanent",
  "Cash value grows tax-deferred and can be accessed via policy loans income-tax-free",
  "Dividends reinvested as Paid-Up Additions increase both cash value and death benefit each year",
  "Trust ownership (Malia Andelin Rev Trust) keeps policy proceeds outside of taxable estate",
];

export default function DashboardClient({ client, policies, actionItems }: Props) {
  const [activeNav, setActiveNav] = useState("Overview");

  const activePolicies = policies.filter((p) => p.status === "Active");
  const totalDeathBenefit = activePolicies.reduce((s, p) => s + (p.death_benefit ?? 0), 0);
  const totalCashValue = activePolicies.reduce((s, p) => s + (p.cash_value ?? 0), 0);
  const totalNetCashValue = activePolicies.reduce((s, p) => s + (p.net_cash_value ?? 0), 0);
  const totalPremium = activePolicies.reduce((s, p) => s + (p.annual_premium ?? 0), 0);

  const lastStatement = policies
    .map((p) => p.last_statement_date)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const metrics = [
    { label: "Total Death Benefit", value: fmt(totalDeathBenefit), sub: `${activePolicies.length} active ${activePolicies.length === 1 ? "policy" : "policies"}` },
    { label: "Total Cash Value", value: fmt(totalCashValue), sub: "As of last statement" },
    { label: "Net Cash Value", value: fmt(totalNetCashValue), sub: "After loans" },
    { label: "Annual Premium", value: fmt(totalPremium), sub: "Current year" },
  ];

  return (
    <div className="flex h-screen bg-[#F4F5F7] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A1628] flex flex-col flex-shrink-0">
        <div className="px-6 py-8 border-b border-[#1a3060]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-[#C9A84C] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-[#C9A84C] text-sm font-light">V</span>
            </div>
            <div>
              <div className="text-white text-sm font-light tracking-[0.15em] uppercase">Vision</div>
              <div className="text-[#C9A84C] text-[9px] tracking-[0.3em] uppercase">Consulting Group</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-b border-[#1a3060]">
          <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Client Portal</p>
          <p className="text-white text-sm font-medium">{client.name}</p>
          <p className="text-slate-500 text-xs mt-0.5">{client.type} · Member since {client.member_since}</p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveNav(item.label)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all text-left ${
                activeNav === item.label
                  ? "bg-[#C9A84C]/10 text-[#C9A84C]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-6 py-5 border-t border-[#1a3060]">
          <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-2">Your Advisor</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#C9A84C] text-xs font-semibold">
                {client.advisor.split(" ").map((w) => w[0]).join("")}
              </span>
            </div>
            <div>
              <p className="text-white text-xs font-medium">{client.advisor}</p>
              <p className="text-slate-500 text-[10px]">Senior Strategist</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-5">
          <form action="/auth/signout" method="POST">
            <button type="submit" className="text-slate-600 text-xs hover:text-slate-400 transition-colors">
              ← Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-[#0A1628] text-lg font-medium">Portfolio Overview</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Values sourced from carrier statements · Last updated {fmtDate(lastStatement ?? null)} · All values in USD
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
              {activePolicies.length} Active {activePolicies.length === 1 ? "Policy" : "Policies"}
            </span>
            <Link
              href="/admin"
              className="text-xs text-slate-400 hover:text-[#C9A84C] transition-colors px-3 py-1.5 border border-gray-200 rounded-lg hover:border-[#C9A84C]"
            >
              Admin View
            </Link>
          </div>
        </div>

        <div className="px-8 py-8 space-y-8">
          {/* Greeting */}
          <div>
            <h2 className="text-2xl font-light text-[#0A1628]">
              Good morning, <span className="font-medium">{client.name.split(" ")[0]}.</span>
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Your permanent life insurance portfolio provides lasting protection and tax-advantaged growth. Here&apos;s your current position.
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-5">
            {metrics.map((m) => (
              <div key={m.label} className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-[#C9A84C]">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">{m.label}</p>
                <p className="text-[#0A1628] text-xl font-light mb-1.5">{m.value}</p>
                <p className="text-xs text-slate-400">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Policy Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-[#0A1628] font-medium text-sm">Insurance Policies</h3>
                <p className="text-slate-400 text-xs mt-0.5">All figures from most recent carrier statements</p>
              </div>
              <span className="text-xs text-slate-400">{policies.length} {policies.length === 1 ? "policy" : "policies"}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F4F5F7]">
                    {["Policy #", "Carrier", "Product", "Owner", "Face Amount", "Death Benefit", "Cash Value", "Loan", "Net CV", "Annual Premium", "Pay-Up", "Status"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {policies.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAFBFC] transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-[#0A1628] text-sm font-medium whitespace-nowrap">{p.policy_number}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{p.product_type}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600 text-sm whitespace-nowrap">{p.carrier}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-slate-700 text-xs leading-tight max-w-[140px]">{p.product_name}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">Issued {fmtDate(p.issue_date)}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-slate-600 text-xs">{p.owner_name}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{p.owner_type}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700 text-sm whitespace-nowrap">{fmt(p.face_amount)}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-[#C9A84C] text-sm font-semibold">{fmt(p.death_benefit)}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-700 text-sm whitespace-nowrap">{fmt(p.cash_value)}</td>
                      <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">{fmt(p.loan_balance)}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-green-600 text-sm font-semibold">{fmt(p.net_cash_value)}</span>
                      </td>
                      <td className="px-5 py-4 text-[#0A1628] text-sm font-medium whitespace-nowrap">{fmt(p.annual_premium)}</td>
                      <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">{fmtPayUp(p.pay_up_date)}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusColors[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Footer totals */}
            <div className="px-6 py-4 border-t border-gray-50 bg-[#F9FAFB]">
              <div className="flex items-center gap-8 text-xs text-slate-400">
                <span>Active Policies: <span className="text-[#0A1628] font-bold">{activePolicies.length}</span></span>
                <span>Total Death Benefit: <span className="text-[#C9A84C] font-bold">{fmt(totalDeathBenefit)}</span></span>
                <span>Total Cash Value: <span className="text-[#0A1628] font-bold">{fmt(totalCashValue)}</span></span>
                <span>Net Cash Value: <span className="text-green-600 font-bold">{fmt(totalNetCashValue)}</span></span>
                <span>Annual Premium: <span className="text-[#0A1628] font-bold">{fmt(totalPremium)}</span></span>
              </div>
            </div>
          </div>

          {/* Riders Panel */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-[#0A1628] font-medium text-sm mb-4">Policy Riders & Benefits</h3>
            <div className="grid grid-cols-2 gap-6">
              {policies.filter((p) => p.riders && p.riders.length > 0).map((p) => (
                <div key={p.id}>
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">
                    {p.carrier} — {p.policy_number}
                  </p>
                  <ul className="space-y-1.5">
                    {p.riders!.map((r) => (
                      <li key={r} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="text-[#C9A84C] text-xs">◆</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-2 gap-5">
            {/* Strategy Highlights */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-[#0A1628] font-medium text-sm mb-4">Strategy Highlights</h3>
              <ul className="space-y-3">
                {highlights.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="text-[#C9A84C] mt-0.5 flex-shrink-0">◆</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Items */}
            <div className="bg-[#0A1628] rounded-2xl p-6">
              <h3 className="text-white font-medium text-sm mb-5">Upcoming &amp; Action Items</h3>
              <ul className="space-y-4">
                {actionItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.priority === "high" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0"></span>
                      )}
                      <span className="text-slate-300 text-sm">{item.label}</span>
                    </div>
                    <span className="text-[#C9A84C] text-xs font-medium whitespace-nowrap ml-4">{fmtDate(item.due_date)}</span>
                  </li>
                ))}
              </ul>
              <button className="mt-6 w-full bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] text-xs font-semibold py-3 rounded-lg tracking-widest uppercase transition-colors">
                Schedule a Review
              </button>
              <p className="text-slate-600 text-xs text-center mt-3">
                Contact: {client.advisor}
              </p>
            </div>
          </div>

          {/* Data Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <span className="text-amber-500 text-lg">⚠</span>
            <p className="text-amber-700 text-xs">
              Policy values shown are from carrier statements as of the dates listed. Contact your advisor to request updated inforce illustrations with current values.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
