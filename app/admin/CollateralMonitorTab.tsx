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
  policies?: { policy_number: string; carrier: string } | null;
}

const fmt    = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n;
};

function accountHealth(a: Account) {
  const required = a.loan_balance * a.required_ratio;
  const surplus  = a.collateral_value - required;
  const ratio    = required > 0 ? a.collateral_value / required : 1;
  return { required, surplus, ratio };
}

type RiskLevel = "Critical" | "At Risk" | "Healthy";

function riskLevel(ratio: number): RiskLevel {
  if (ratio < 1.0)  return "Critical";
  if (ratio < 1.1)  return "At Risk";
  return "Healthy";
}

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; bar: string; border: string }> = {
  Critical: { color: "#f87171", bg: "bg-red-50",    bar: "#f87171", border: "border-red-200" },
  "At Risk":{ color: "#fbbf24", bg: "bg-amber-50",  bar: "#fbbf24", border: "border-amber-200" },
  Healthy:  { color: "#34d399", bg: "bg-emerald-50",bar: "#34d399", border: "border-emerald-200" },
};

export default function CollateralMonitorTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    createClient()
      .from("collateral_accounts")
      .select("*, clients(name, advisor), policies(policy_number, carrier)")
      .then(({ data }) => {
        // Sort by most at-risk first
        const sorted = (data ?? [] as Account[]).sort((a: Account, b: Account) => {
          const ra = accountHealth(a).ratio;
          const rb = accountHealth(b).ratio;
          return ra - rb;
        });
        setAccounts(sorted as Account[]);
        setLoading(false);
      });
  }, []);

  const critical = accounts.filter(a => riskLevel(accountHealth(a).ratio) === "Critical");
  const atRisk   = accounts.filter(a => riskLevel(accountHealth(a).ratio) === "At Risk");
  const healthy  = accounts.filter(a => riskLevel(accountHealth(a).ratio) === "Healthy");

  const totalRequired   = accounts.reduce((s, a) => s + a.loan_balance * a.required_ratio, 0);
  const totalCollateral = accounts.reduce((s, a) => s + a.collateral_value, 0);
  const totalSurplus    = totalCollateral - totalRequired;
  const portfolioRatio  = totalRequired > 0 ? totalCollateral / totalRequired : 1;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-light text-[#0A1628]">Collateral Monitor</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time gap analysis — collateral coverage vs. required loan ratios</p>
      </div>

      {/* Portfolio risk summary banner */}
      <div className={`rounded-2xl p-6 border-2 ${
        critical.length > 0  ? "bg-red-50 border-red-200"
        : atRisk.length > 0  ? "bg-amber-50 border-amber-200"
        : "bg-emerald-50 border-emerald-200"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
              critical.length > 0 ? "bg-red-100" : atRisk.length > 0 ? "bg-amber-100" : "bg-emerald-100"
            }`}>
              {critical.length > 0 ? "⚠" : atRisk.length > 0 ? "◉" : "✓"}
            </div>
            <div>
              <p className={`text-lg font-semibold ${
                critical.length > 0 ? "text-red-700" : atRisk.length > 0 ? "text-amber-700" : "text-emerald-700"
              }`}>
                {critical.length > 0
                  ? `${critical.length} account${critical.length > 1 ? "s" : ""} below required collateral ratio`
                  : atRisk.length > 0
                  ? `${atRisk.length} account${atRisk.length > 1 ? "s" : ""} near collateral threshold`
                  : "All collateral positions within required ratios"}
              </p>
              <p className="text-slate-500 text-sm mt-0.5">
                Portfolio collateral ratio: <strong>{(portfolioRatio * 100).toFixed(1)}%</strong> · Net surplus: <strong>{totalSurplus >= 0 ? "+" : ""}{fmtShort(totalSurplus)}</strong>
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex gap-4">
              {[
                { label: "Critical", count: critical.length, color: "text-red-600" },
                { label: "At Risk",  count: atRisk.length,  color: "text-amber-600" },
                { label: "Healthy",  count: healthy.length,  color: "text-emerald-600" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-2xl font-light ${s.color}`}>{s.count}</p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio bar */}
        <div className="mt-5">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
            <span>Portfolio collateral coverage</span>
            <span>{(portfolioRatio * 100).toFixed(1)}% — Required: 100%</span>
          </div>
          <div className="h-3 bg-white/60 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, portfolioRatio * 100)}%`,
                background: critical.length > 0 ? "#f87171" : atRisk.length > 0 ? "#fbbf24" : "#34d399",
              }} />
          </div>
        </div>
      </div>

      {/* Per-account cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading collateral data…</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <p className="text-slate-300 text-4xl mb-3">◈</p>
          <p className="text-slate-500 font-medium">No collateral accounts found</p>
          <p className="text-slate-400 text-xs mt-1">Add premium finance accounts to see collateral analysis here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(acct => {
            const { required, surplus, ratio } = accountHealth(acct);
            const risk   = riskLevel(ratio);
            const cfg    = RISK_CONFIG[risk];
            const barPct = Math.min(100, ratio * 100);

            return (
              <div key={acct.id} className={`bg-white rounded-2xl shadow-sm border ${cfg.border} overflow-hidden`}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {/* Risk dot */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.color + "20" }}>
                        <div className="w-3 h-3 rounded-full" style={{ background: cfg.color }} />
                      </div>
                      <div>
                        <p className="text-[#0A1628] font-semibold text-sm">{acct.clients?.name ?? "—"}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          {acct.lender ?? "—"} · {acct.policies?.carrier ?? "—"} {acct.policies?.policy_number ? `#${acct.policies.policy_number}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${cfg.bg}`} style={{ color: cfg.color }}>
                      {risk.toUpperCase()}
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-5 gap-4 mb-4">
                    {[
                      { label: "Loan Balance",         value: fmtShort(acct.loan_balance) },
                      { label: "Collateral Value",     value: fmtShort(acct.collateral_value) },
                      { label: "Required Collateral",  value: fmtShort(required) },
                      { label: "Surplus / (Gap)",      value: (surplus >= 0 ? "+" : "") + fmtShort(surplus),
                        color: surplus >= 0 ? "#34d399" : "#f87171" },
                      { label: "Coverage Ratio",       value: (ratio * 100).toFixed(1) + "%",
                        color: cfg.color },
                    ].map(m => (
                      <div key={m.label}>
                        <p className="text-slate-400 text-[9px] uppercase tracking-widest mb-1">{m.label}</p>
                        <p className="text-sm font-semibold" style={{ color: m.color ?? "#0A1628" }}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Coverage bar */}
                  <div>
                    <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                      <span>Collateral coverage</span>
                      <span>Required: {(acct.required_ratio * 100).toFixed(0)}% · Current: {(ratio * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${barPct}%`, background: cfg.bar }} />
                    </div>
                    {/* Required line marker */}
                    <div className="relative h-0">
                      <div className="absolute h-3 w-0.5 bg-slate-400 -top-2"
                        style={{ left: `${Math.min(100, acct.required_ratio * 100)}%` }} />
                    </div>
                  </div>

                  {acct.notes && (
                    <p className="mt-3 text-[10px] text-slate-400 italic">Note: {acct.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
