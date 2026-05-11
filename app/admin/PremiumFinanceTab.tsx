"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Account {
  id: string;
  client_id: string;
  lender: string;
  loan_amount: number;
  loan_balance: number;
  interest_rate: number;
  collateral_value: number;
  required_ratio: number;
  status: string;
  notes: string | null;
  policy_id: string | null;
  renewal_date?: string | null;
  clients?: { name: string; advisor: string } | null;
  policies?: { policy_number: string; carrier: string; product_name: string } | null;
}

const fmt = (n: number | null | undefined) => {
  if (!n) return "—";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toLocaleString();
};
const fmtFull = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtPct  = (n: number) => (n * 100).toFixed(1) + "%";
const fmtRate = (n: number) => n.toFixed(2) + "%";

function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function renewalBadge(days: number | null) {
  if (days === null) return null;
  if (days < 0)   return { label: "Overdue",    cls: "bg-red-900/40 text-red-300 border border-red-700" };
  if (days <= 30) return { label: `${days}d`,   cls: "bg-red-900/40 text-red-300 border border-red-700" };
  if (days <= 90) return { label: `${days}d`,   cls: "bg-amber-900/40 text-amber-300 border border-amber-700" };
  return           { label: `${days}d`,          cls: "bg-slate-700 text-slate-300 border border-slate-600" };
}

function health(acct: Account): { label: string; color: string; pct: number } {
  const required = acct.loan_balance * acct.required_ratio;
  const surplus  = acct.collateral_value - required;
  const pct      = required > 0 ? acct.collateral_value / required : 1;
  if (pct >= 1.1)  return { label: "Healthy",  color: "#34d399", pct };
  if (pct >= 1.0)  return { label: "At Margin", color: "#fbbf24", pct };
  return              { label: "Deficit",   color: "#f87171", pct };
}

const ADVISORS = ["All", "Stephen Mongie", "Samuel Noel", "Zach McGlothin"];

export default function PremiumFinanceTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("All");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("collateral_accounts")
      .select("*, clients(name, advisor), policies(policy_number, carrier, product_name)")
      .order("loan_balance", { ascending: false })
      .then(({ data }) => {
        setAccounts((data ?? []) as Account[]);
        setLoading(false);
      });
  }, []);

  const filtered = filter === "All"
    ? accounts
    : accounts.filter(a => a.clients?.advisor === filter);

  const totalLoan       = filtered.reduce((s, a) => s + (a.loan_balance ?? 0), 0);
  const totalCollateral = filtered.reduce((s, a) => s + (a.collateral_value ?? 0), 0);
  const totalOriginal   = filtered.reduce((s, a) => s + (a.loan_amount ?? 0), 0);
  const avgRate         = filtered.length
    ? filtered.reduce((s, a) => s + (a.interest_rate ?? 0), 0) / filtered.length
    : 0;
  const atRisk = filtered.filter(a => health(a).label !== "Healthy").length;

  const upcomingRenewals = [...filtered]
    .filter(a => a.renewal_date)
    .sort((a, b) => new Date(a.renewal_date!).getTime() - new Date(b.renewal_date!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-7">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#0A1628]">Premium Finance</h1>
          <p className="text-slate-400 text-sm mt-1">Loan exposure, collateral positions, and renewal schedule across all financed policies</p>
        </div>
        <div className="flex gap-2">
          {ADVISORS.map(a => (
            <button key={a} onClick={() => setFilter(a)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                filter === a ? "bg-[#0A1628] text-[#C9A84C] font-semibold" : "bg-white border border-gray-200 text-slate-500 hover:border-[#C9A84C]"
              }`}>
              {a === "All" ? "All Advisors" : a.split(" ")[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Original Loan Total",  value: fmt(totalOriginal),   sub: "Committed finance",          accent: "#C9A84C" },
          { label: "Current Loan Balance", value: fmt(totalLoan),       sub: "Outstanding principal",       accent: "#60a5fa" },
          { label: "Total Collateral",     value: fmt(totalCollateral), sub: "Pledged collateral value",    accent: "#34d399" },
          { label: "Avg Interest Rate",    value: avgRate ? fmtRate(avgRate) : "—", sub: "Blended across all loans", accent: "#a78bfa" },
          { label: "Accounts at Risk",     value: String(atRisk),       sub: atRisk === 0 ? "All positions healthy" : "Below required ratio", accent: atRisk > 0 ? "#f87171" : "#34d399" },
        ].map((m) => (
          <div key={m.label} className="bg-[#0A1628] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: m.accent }} />
            <p className="text-slate-400 text-[9px] uppercase tracking-widest mb-3">{m.label}</p>
            {loading ? <div className="h-7 w-20 bg-[#1a3060] rounded animate-pulse" /> : (
              <p className="text-white text-2xl font-light">{m.value}</p>
            )}
            <p className="text-slate-500 text-[9px] mt-1.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Main table + sidebar */}
      <div className="grid grid-cols-3 gap-6">

        {/* Loan table — 2 cols */}
        <div className="col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-[#0A1628] font-medium text-sm">Financed Positions</h2>
              <p className="text-slate-400 text-xs mt-0.5">{filtered.length} active loan accounts</p>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-300 text-3xl mb-3">◈</p>
              <p className="text-slate-500 text-sm">No collateral accounts found</p>
              <p className="text-slate-400 text-xs mt-1">Add premium finance accounts to the collateral_accounts table</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Client", "Lender", "Loan Balance", "Collateral", "Ratio", "Rate", "Health", "Renewal"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[9px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((acct) => {
                    const h   = health(acct);
                    const days = daysUntil(acct.renewal_date);
                    const badge = renewalBadge(days);
                    const ratio = acct.loan_balance > 0 ? acct.collateral_value / acct.loan_balance : 0;
                    return (
                      <tr key={acct.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-[#0A1628] text-xs font-semibold">{acct.clients?.name ?? "—"}</p>
                          <p className="text-slate-400 text-[10px] mt-0.5">{acct.policies?.carrier ?? ""}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600 text-xs">{acct.lender ?? "—"}</td>
                        <td className="px-5 py-4">
                          <p className="text-[#0A1628] text-xs font-semibold">{fmt(acct.loan_balance)}</p>
                          <p className="text-slate-400 text-[10px]">of {fmt(acct.loan_amount)}</p>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-700">{fmt(acct.collateral_value)}</td>
                        <td className="px-5 py-4 text-xs text-slate-600">{fmtPct(ratio)}</td>
                        <td className="px-5 py-4 text-xs text-slate-600">{fmtRate(acct.interest_rate)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: h.color }} />
                            <span className="text-xs" style={{ color: h.color }}>{h.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {badge ? (
                            <span className={`text-[9px] font-semibold px-2 py-1 rounded-md ${badge.cls}`}>{badge.label}</span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">

          {/* Portfolio ratio meter */}
          <div className="bg-[#0A1628] rounded-2xl p-5">
            <p className="text-slate-400 text-[9px] uppercase tracking-widest mb-4">Portfolio Collateral Ratio</p>
            <div className="flex items-end gap-3 mb-4">
              <p className="text-white text-3xl font-light">
                {totalLoan > 0 ? fmtPct(totalCollateral / totalLoan) : "—"}
              </p>
              <p className="text-slate-500 text-xs pb-1">vs collateral</p>
            </div>
            <div className="h-2 bg-[#1a3060] rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: totalLoan > 0 ? `${Math.min(100, (totalCollateral / totalLoan) * 100)}%` : "0%",
                  background: totalCollateral >= totalLoan ? "#34d399" : "#f87171",
                }} />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>0%</span><span>100% (break-even)</span>
            </div>
            <div className="mt-4 pt-4 border-t border-[#1a3060] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Net Equity</span>
                <span className="text-white font-semibold">{fmt(totalCollateral - totalLoan)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Accounts tracked</span>
                <span className="text-white">{filtered.length}</span>
              </div>
            </div>
          </div>

          {/* Upcoming renewals */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-[#0A1628] text-sm font-medium">Upcoming Renewals</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Next scheduled loan renewals</p>
            </div>
            {upcomingRenewals.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-xs">No renewal dates on record</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcomingRenewals.map(a => {
                  const days = daysUntil(a.renewal_date);
                  const badge = renewalBadge(days);
                  return (
                    <div key={a.id} className="px-5 py-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-[#0A1628] text-xs font-medium">{a.clients?.name ?? "—"}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{new Date(a.renewal_date!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                      {badge && <span className={`text-[9px] font-semibold px-2 py-1 rounded-md ${badge.cls}`}>{badge.label}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
