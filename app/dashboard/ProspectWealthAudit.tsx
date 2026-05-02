"use client";
import { useState } from "react";

const fmt = (n: number) => n === 0 ? "—" : "$" + Math.round(n).toLocaleString("en-US");
const fmtPct = (n: number, d: number) => d === 0 ? "0%" : Math.round((n / d) * 100) + "%";

interface AssetDef {
  key: string;
  label: string;
  sub: string;
  status: "exposed" | "partial" | "protected";
  statusLabel: string;
  reason: string;
}

const ASSETS: AssetDef[] = [
  {
    key: "ira401k",
    label: "401(k) / Traditional IRA",
    sub: "Pre-tax retirement accounts",
    status: "partial",
    statusLabel: "Tax Time Bomb",
    reason: "Protected from creditors in most states, but every dollar is taxable when withdrawn. RMDs force income at potentially higher brackets.",
  },
  {
    key: "roth",
    label: "Roth IRA / Roth 401(k)",
    sub: "After-tax retirement accounts",
    status: "protected",
    statusLabel: "Protected",
    reason: "Tax-free growth and withdrawals. No RMDs. Strong creditor protection in most states.",
  },
  {
    key: "brokerage",
    label: "Taxable Brokerage",
    sub: "Stocks, ETFs, mutual funds",
    status: "exposed",
    statusLabel: "Exposed",
    reason: "Subject to capital gains tax each year. Fully accessible to creditors. Dividends taxable as earned.",
  },
  {
    key: "homeEquity",
    label: "Home Equity",
    sub: "Primary residence",
    status: "partial",
    statusLabel: "Partial",
    reason: "Homestead exemption protects some equity (varies widely by state). Illiquid. Subject to estate taxes above thresholds.",
  },
  {
    key: "business",
    label: "Business Equity",
    sub: "Ownership stake or private company",
    status: "exposed",
    statusLabel: "Exposed",
    reason: "Illiquid and difficult to value. High lawsuit exposure unless properly structured. Often overlooked in estate plans.",
  },
  {
    key: "cashValue",
    label: "Cash Value Life Insurance",
    sub: "Permanent policy accumulation",
    status: "protected",
    statusLabel: "Protected",
    reason: "Creditor-protected in most states. Grows tax-deferred. Accessed via loans — no income tax. Not subject to probate.",
  },
  {
    key: "savings",
    label: "Bank Savings / Checking",
    sub: "Liquid cash accounts",
    status: "exposed",
    statusLabel: "Exposed",
    reason: "Fully exposed to creditors above FDIC limits. Interest taxable. No growth. Inflation erodes purchasing power.",
  },
  {
    key: "realEstate",
    label: "Investment Real Estate",
    sub: "Rental properties, commercial",
    status: "partial",
    statusLabel: "Partial",
    reason: "Illiquid. Exposed to lawsuits unless held in LLC. Depreciation recapture on sale creates tax liability.",
  },
];

const statusConfig = {
  exposed:   { label: "Exposed",   bg: "bg-red-50",   text: "text-red-600",   bar: "bg-red-400",    dot: "bg-red-400"   },
  partial:   { label: "Partial",   bg: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-400",  dot: "bg-amber-400" },
  protected: { label: "Protected", bg: "bg-green-50", text: "text-green-600", bar: "bg-green-400",  dot: "bg-green-400" },
};

export default function ProspectWealthAudit({ onSchedule }: { onSchedule: () => void }) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(ASSETS.map(a => [a.key, 0]))
  );

  const total = Object.values(values).reduce((s, v) => s + v, 0);
  const byStatus = { exposed: 0, partial: 0, protected: 0 };
  ASSETS.forEach(a => { byStatus[a.status] += values[a.key] ?? 0; });

  const exposedPct = total > 0 ? Math.round((byStatus.exposed / total) * 100) : 0;
  const partialPct = total > 0 ? Math.round((byStatus.partial / total) * 100) : 0;
  const protectedPct = total > 0 ? Math.round((byStatus.protected / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-[#0A1628]">Protected vs Exposed Audit</h2>
        <p className="text-slate-400 text-sm mt-1">Enter your approximate asset values to see how much of your wealth is actually protected.</p>
      </div>

      {/* Asset inputs */}
      <div className="space-y-3">
        {ASSETS.map(asset => {
          const cfg = statusConfig[asset.status];
          return (
            <div key={asset.key} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[#0A1628] text-sm font-medium">{asset.label}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>
                      {asset.statusLabel}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mb-3">{asset.reason}</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={2000000}
                      step={5000}
                      value={values[asset.key]}
                      onChange={e => setValues(prev => ({ ...prev, [asset.key]: Number(e.target.value) }))}
                      className="flex-1 accent-[#C9A84C]"
                    />
                    <div className="w-28">
                      <input
                        type="number"
                        value={values[asset.key] || ""}
                        placeholder="0"
                        onChange={e => setValues(prev => ({ ...prev, [asset.key]: Number(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 text-right focus:outline-none focus:border-[#C9A84C]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Results */}
      {total > 0 && (
        <>
          <div className="bg-[#0A1628] rounded-2xl p-6 text-white space-y-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest">Total Wealth Entered</p>
              <p className="text-white font-semibold">{fmt(total)}</p>
            </div>

            {/* Stacked bar */}
            <div className="w-full h-4 bg-[#1a3060] rounded-full overflow-hidden flex">
              <div className="h-full bg-red-400 transition-all" style={{ width: `${exposedPct}%` }} />
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${partialPct}%` }} />
              <div className="h-full bg-green-400 transition-all" style={{ width: `${protectedPct}%` }} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {(["exposed", "partial", "protected"] as const).map(s => {
                const cfg = statusConfig[s];
                return (
                  <div key={s} className="text-center">
                    <div className={`w-3 h-3 rounded-full ${cfg.dot} mx-auto mb-2`} />
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest">{cfg.label}</p>
                    <p className={`text-xl font-light mt-1 ${s === "exposed" ? "text-red-400" : s === "partial" ? "text-amber-400" : "text-green-400"}`}>
                      {fmtPct(byStatus[s], total)}
                    </p>
                    <p className="text-slate-500 text-[10px] mt-0.5">{fmt(byStatus[s])}</p>
                  </div>
                );
              })}
            </div>

            {exposedPct > 40 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-300 text-sm font-medium">
                  {exposedPct}% of your wealth is fully exposed to taxes, lawsuits, or creditors
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {fmt(byStatus.exposed)} of your {fmt(total)} net worth has no structural protection.
                  VCG clients typically move 30–50% of exposed assets into protected structures over 3–5 years.
                </p>
              </div>
            )}
          </div>

          {/* Locked recommendation */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-[#0A1628] font-medium text-sm">How to move assets from Exposed → Protected</p>
                <p className="text-slate-400 text-xs mt-0.5">The specific strategy for your asset mix</p>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="px-6 py-5 space-y-3 opacity-40 pointer-events-none select-none blur-[2px]">
              {[
                "Entity structuring to shield business equity",
                "Repositioning taxable brokerage into tax-advantaged vehicles",
                "Trust structure for home equity and legacy assets",
                "Policy-based accumulation replacing exposed savings",
              ].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <span className="text-[#C9A84C]">◆</span>
                  <span className="text-slate-600 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-5">
              <button onClick={onSchedule}
                className="w-full py-3 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-xs uppercase tracking-widest rounded-xl transition-colors">
                Unlock Your Protection Plan
              </button>
            </div>
          </div>
        </>
      )}

      {total === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-slate-400 text-sm">Enter your asset values above to see your protection breakdown</p>
        </div>
      )}
    </div>
  );
}
