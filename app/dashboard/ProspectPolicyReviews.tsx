"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcLiveSnapshot, type LiveSnapshot, type PolicyYearRow } from "@/lib/illustrationCalc";

interface Props {
  clientId: string;
  onSchedule: () => void;
}

interface Illustration {
  id: string;
  carrier: string;
  product_name: string;
  face_amount: number;
  annual_prem: number;
  prem_years: number;
  illustrated_rate: number;
  advisor_name: string;
  issue_age: number;
  notes: string | null;
  created_at: string;
}

interface Review {
  id: string;
  review_type: string;
  on_track: boolean;
  notes: string | null;
  action_items: string | null;
  index_notes: string | null;
  premium_finance_notes: string | null;
  actual_cash_value: number | null;
  actual_death_benefit: number | null;
  reviewed_at: string;
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const fmtRate = (n: number) => n.toFixed(2) + "%";
const fmtX = (n: number) => n.toFixed(2) + "x";
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const typeConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  weekly:    { label: "Weekly",    bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-200"   },
  monthly:   { label: "Monthly",   bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
  quarterly: { label: "Quarterly", bg: "bg-amber-50",  text: "text-[#C9A84C]",  border: "border-amber-200"  },
};

function StatCard({ label, value, sub, color = "text-[#0A1628]" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[#1a3060] rounded-2xl p-5">
      <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-light ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-[10px] mt-1">{sub}</p>}
    </div>
  );
}

export default function ProspectPolicyReviews({ clientId, onSchedule }: Props) {
  const [illustration, setIllustration] = useState<Illustration | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "weekly" | "monthly" | "quarterly">("all");

  useEffect(() => {
    const sb = createClient();
    Promise.all([
      sb.from("illustrations").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(1),
      sb.from("policy_reviews").select("*").eq("client_id", clientId).order("reviewed_at", { ascending: false }),
    ]).then(([{ data: il }, { data: rv }]) => {
      setIllustration(il?.[0] ?? null);
      setReviews(rv ?? []);
      setLoading(false);
    });
  }, [clientId]);

  const snap: LiveSnapshot | null = useMemo(() => {
    if (!illustration) return null;
    return calcLiveSnapshot({
      faceAmount: illustration.face_amount,
      annualPrem: illustration.annual_prem,
      premYears: illustration.prem_years,
      illustratedRate: illustration.illustrated_rate,
      issueAge: illustration.issue_age,
      startDate: illustration.created_at,
    });
  }, [illustration]);

  const filtered = activeFilter === "all" ? reviews : reviews.filter(r => r.review_type === activeFilter);

  const latestActual = reviews.find(r => r.actual_cash_value !== null);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!illustration) return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-[#0A1628]">Policy Reviews</h2>
        <p className="text-slate-400 text-sm mt-1">Live projections and advisor check-ins on your policy</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
        <p className="text-slate-400 text-sm">No illustration on file yet. Your advisor will publish your first review once your policy is set up.</p>
        <button onClick={onSchedule}
          className="mt-4 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-colors">
          Schedule a Call
        </button>
      </div>
    </div>
  );

  const maxCV = snap ? Math.max(...snap.rows.map(r => r.cashValue)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-[#0A1628]">Policy Reviews</h2>
        <p className="text-slate-400 text-sm mt-1">
          {illustration.product_name} · {illustration.carrier} · {fmtRate(illustration.illustrated_rate)} illustrated
        </p>
      </div>

      {/* Live snapshot hero */}
      {snap && (
        <div className="bg-[#0A1628] rounded-2xl overflow-hidden">
          <div className="px-7 pt-7 pb-5 border-b border-[#1a3060]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest">Your Policy Right Now</p>
              <span className="text-[#C9A84C] text-[10px] font-semibold uppercase tracking-widest px-3 py-1 bg-[#C9A84C]/10 rounded-full border border-[#C9A84C]/20">
                Policy Year {snap.policyYearInt > 0 ? snap.policyYearInt : "<1"} · Age {illustration.issue_age + snap.policyYearInt}
              </span>
            </div>
            <p className="text-white text-[10px] text-slate-500 mb-6">
              {snap.policyYear.toFixed(1)} years since illustration · {fmtRate(illustration.illustrated_rate)} assumed crediting rate
            </p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              {/* Big CV number */}
              <div className="col-span-2 bg-[#1a3060] rounded-2xl p-6">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Projected Cash Value</p>
                <p className="text-[#C9A84C] text-5xl font-extralight tracking-tight">{fmt(snap.projectedCV)}</p>
                {latestActual?.actual_cash_value && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-[#0A1628] rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A84C] rounded-full transition-all"
                        style={{ width: `${Math.min(100, (latestActual.actual_cash_value / snap.projectedCV) * 100)}%` }} />
                    </div>
                    <p className="text-slate-300 text-sm flex-shrink-0">
                      Actual: <span className="text-white font-medium">{fmt(latestActual.actual_cash_value)}</span>
                      <span className="text-slate-500 text-[10px] ml-2">
                        ({Math.round((latestActual.actual_cash_value / snap.projectedCV) * 100)}% of projected)
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <StatCard
                label="Death Benefit"
                value={fmt(snap.projectedDB)}
                sub="Projected current"
                color="text-white"
              />
              <StatCard
                label="Premiums Paid"
                value={fmt(snap.cumulativePremiums)}
                sub={snap.premiumsRemaining > 0 ? `${snap.premiumsRemaining.toFixed(1)}yr remaining` : "Pay period complete"}
                color="text-slate-300"
              />
              <StatCard
                label="Net Policy Gain"
                value={snap.netGain >= 0 ? fmt(snap.netGain) : "-" + fmt(Math.abs(snap.netGain))}
                sub="CV minus premiums paid"
                color={snap.netGain >= 0 ? "text-green-400" : "text-amber-400"}
              />
              <StatCard
                label="Return Multiple"
                value={fmtX(snap.returnMultiple)}
                sub="Cash value ÷ premiums"
                color={snap.returnMultiple >= 1 ? "text-green-400" : "text-slate-300"}
              />
            </div>
          </div>

          {/* Mini growth bar chart */}
          <div className="px-7 py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest">30-Year Cash Value Projection</p>
              <button onClick={() => setShowTable(!showTable)}
                className="text-[#C9A84C] text-[10px] hover:underline">
                {showTable ? "Hide Table" : "Show Full Table"}
              </button>
            </div>
            <div className="flex items-end gap-0.5 h-16">
              {snap.rows.map((row, i) => {
                const height = maxCV > 0 ? (row.cashValue / maxCV) * 100 : 0;
                const isCurrent = row.year === snap.policyYearInt + 1;
                const isPast = row.year <= snap.policyYearInt;
                return (
                  <div key={row.year} className="flex-1 flex flex-col items-center gap-0.5" title={`Year ${row.year}: ${fmt(row.cashValue)}`}>
                    <div
                      className={`w-full rounded-sm transition-all ${
                        isCurrent ? "bg-[#C9A84C]"
                        : isPast ? "bg-[#C9A84C]/50"
                        : "bg-[#1a3060]"
                      }`}
                      style={{ height: `${Math.max(2, height)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-slate-600 text-[9px] mt-1">
              <span>Year 1</span>
              <span>Year 10</span>
              <span>Year 20</span>
              <span>Year 30</span>
            </div>
          </div>
        </div>
      )}

      {/* Full projection table */}
      {showTable && snap && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <p className="text-[#0A1628] font-medium text-sm">Year-by-Year Projection</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Based on {fmtRate(illustration.illustrated_rate)} illustrated rate · {illustration.prem_years}-year premium schedule
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F5F7]">
                  {["Year", "Age", "Premium", "Cumulative Premiums", "Cash Value", "Death Benefit", "Net Gain", "Multiple"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {snap.rows.map((row: PolicyYearRow) => {
                  const isCurrent = row.year === snap.policyYearInt + 1;
                  const isPast = row.year <= snap.policyYearInt;
                  return (
                    <tr key={row.year} className={`transition-colors ${
                      isCurrent ? "bg-[#C9A84C]/5 font-medium"
                      : isPast ? "bg-gray-50/50"
                      : "hover:bg-gray-50/50"
                    }`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={isPast ? "text-slate-400" : "text-[#0A1628]"}>Yr {row.year}</span>
                          {isCurrent && <span className="text-[9px] px-1.5 py-0.5 bg-[#C9A84C] text-[#0A1628] rounded-full font-bold">NOW</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{row.age}</td>
                      <td className="px-5 py-3 text-slate-600">{row.premiumPaid > 0 ? fmt(row.premiumPaid) : "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{fmt(row.cumulativePremium)}</td>
                      <td className="px-5 py-3">
                        <span className={row.cashValue > row.cumulativePremium ? "text-green-600 font-semibold" : "text-slate-700"}>
                          {fmt(row.cashValue)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[#C9A84C] font-semibold">{fmt(row.deathBenefit)}</td>
                      <td className="px-5 py-3">
                        <span className={row.netGain >= 0 ? "text-green-600" : "text-slate-400"}>
                          {row.netGain >= 0 ? "+" : ""}{fmt(row.netGain)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={row.returnMultiple >= 1 ? "text-green-600 font-medium" : "text-slate-400"}>
                          {fmtX(row.returnMultiple)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-[#F4F5F7] border-t border-gray-100">
            <p className="text-slate-400 text-[10px]">
              Projections based on {fmtRate(illustration.illustrated_rate)} illustrated crediting rate. Not a guarantee of future performance.
              Values include estimated policy loads and cost of insurance.
            </p>
          </div>
        </div>
      )}

      {/* Advisor reviews */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-[#0A1628] font-medium text-sm">Advisor Reviews</p>
            <div className="flex-1" />
            {(["all", "weekly", "monthly", "quarterly"] as const).map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all ${
                  activeFilter === f
                    ? "bg-[#C9A84C] text-[#0A1628]"
                    : "bg-white border border-gray-200 text-slate-400 hover:border-[#C9A84C]"
                }`}>
                {f}
              </button>
            ))}
          </div>

          {filtered.map(r => {
            const cfg = typeConfig[r.review_type] ?? typeConfig.weekly;
            return (
              <div key={r.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${cfg.border}`}>
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                      r.on_track ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    }`}>{r.on_track ? "On Track" : "Needs Attention"}</span>
                  </div>
                  <p className="text-slate-400 text-xs">{fmtDate(r.reviewed_at)}</p>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {r.notes && <p className="text-slate-600 text-sm leading-relaxed">{r.notes}</p>}

                  {/* Actual vs Projected comparison */}
                  {(r.actual_cash_value || r.actual_death_benefit) && snap && (
                    <div className="grid grid-cols-2 gap-3">
                      {r.actual_cash_value && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">Cash Value</p>
                          <p className="text-[#0A1628] text-xl font-light">{fmt(r.actual_cash_value)}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-[#C9A84C] rounded-full"
                                style={{ width: `${Math.min(100, (r.actual_cash_value / snap.projectedCV) * 100)}%` }} />
                            </div>
                            <span className={`text-[10px] font-semibold ${
                              r.actual_cash_value >= snap.projectedCV * 0.95 ? "text-green-600" : "text-amber-500"
                            }`}>
                              {Math.round((r.actual_cash_value / snap.projectedCV) * 100)}% of projected
                            </span>
                          </div>
                          <p className="text-slate-400 text-[10px] mt-1">Projected: {fmt(snap.projectedCV)}</p>
                        </div>
                      )}
                      {r.actual_death_benefit && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">Death Benefit</p>
                          <p className="text-[#0A1628] text-xl font-light">{fmt(r.actual_death_benefit)}</p>
                          <p className="text-slate-400 text-[10px] mt-2">Illustrated: {fmt(illustration.face_amount)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {r.index_notes && (
                    <div className="bg-blue-50 rounded-xl px-4 py-3">
                      <p className="text-blue-600 text-[10px] uppercase tracking-widest font-semibold mb-1">Index & Allocation</p>
                      <p className="text-slate-600 text-sm leading-relaxed">{r.index_notes}</p>
                    </div>
                  )}
                  {r.premium_finance_notes && (
                    <div className="bg-purple-50 rounded-xl px-4 py-3">
                      <p className="text-purple-600 text-[10px] uppercase tracking-widest font-semibold mb-1">Premium Finance Update</p>
                      <p className="text-slate-600 text-sm leading-relaxed">{r.premium_finance_notes}</p>
                    </div>
                  )}
                  {r.action_items && (
                    <div className="bg-amber-50 rounded-xl px-4 py-3">
                      <p className="text-amber-600 text-[10px] uppercase tracking-widest font-semibold mb-1">Action Items</p>
                      <p className="text-slate-600 text-sm leading-relaxed">{r.action_items}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviews.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-slate-400 text-sm">Your first advisor review will appear here once published.</p>
          <button onClick={onSchedule}
            className="mt-4 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-colors">
            Schedule a Call
          </button>
        </div>
      )}

      <p className="text-slate-400 text-[10px] text-center">
        Projections are based on illustrated crediting rate and are not a guarantee of future performance.
      </p>
    </div>
  );
}
