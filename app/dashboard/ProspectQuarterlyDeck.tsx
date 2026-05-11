"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcLiveSnapshot } from "@/lib/illustrationCalc";

interface QuarterlyDeck {
  id: string;
  quarter: string;
  quarter_end_date: string;
  face_amount: number | null;
  annual_prem: number | null;
  prem_years: number | null;
  illustrated_rate: number | null;
  issue_age: number | null;
  policy_start_date: string | null;
  actual_cash_value: number | null;
  actual_death_benefit: number | null;
  actual_premiums_paid: number | null;
  index_used: string | null;
  index_return_pct: number | null;
  cap_rate_pct: number | null;
  floor_rate_pct: number | null;
  market_commentary: string | null;
  policy_notes: string | null;
  action_items: string | null;
  pdf_path: string | null;
  status: string;
  published_at: string | null;
  created_by: string | null;
}

interface Props {
  clientId: string;
  clientName: string;
  advisorName: string;
  onSchedule: () => void;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(1) + "%";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

async function openPdf(path: string) {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("client-documents")
    .createSignedUrl(path, 120);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
}

export default function ProspectQuarterlyDeck({ clientId, clientName, advisorName, onSchedule }: Props) {
  const [decks, setDecks] = useState<QuarterlyDeck[]>([]);
  const [selected, setSelected] = useState<QuarterlyDeck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("quarterly_decks")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "published")
      .order("quarter_end_date", { ascending: false })
      .then(({ data }) => {
        const list = data ?? [];
        setDecks(list);
        if (list.length > 0) setSelected(list[0]);
        setLoading(false);
      });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
        <p className="text-5xl mb-4 opacity-10">◈</p>
        <p className="text-[#0A1628] text-lg font-medium">Quarterly Report Coming Soon</p>
        <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
          Your advisor is preparing your first quarterly policy review. It will appear here as soon as it's published.
        </p>
        <button
          onClick={onSchedule}
          className="mt-6 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-colors"
        >
          Schedule a Call
        </button>
      </div>
    );
  }

  if (!selected) return null;

  // Compute projected numbers from the illustration baseline
  let projected: ReturnType<typeof calcLiveSnapshot> | null = null;
  if (selected.face_amount && selected.annual_prem && selected.policy_start_date) {
    try {
      projected = calcLiveSnapshot({
        faceAmount: selected.face_amount,
        annualPrem: selected.annual_prem,
        premYears: selected.prem_years ?? 7,
        illustratedRate: selected.illustrated_rate ?? 7.0,
        issueAge: selected.issue_age ?? 40,
        startDate: selected.policy_start_date,
      });
    } catch { /* show without projection */ }
  }

  const cvVariance =
    projected && selected.actual_cash_value != null
      ? selected.actual_cash_value - projected.projectedCV
      : null;
  const cvVariancePct =
    cvVariance != null && projected && projected.projectedCV > 0
      ? (cvVariance / projected.projectedCV) * 100
      : null;
  const ahead = cvVariance != null && cvVariance >= 0;

  const netGain =
    selected.actual_cash_value != null && selected.actual_premiums_paid != null
      ? selected.actual_cash_value - selected.actual_premiums_paid
      : null;

  const actionItems = selected.action_items
    ? selected.action_items.split("\n").filter(l => l.trim().length > 0)
    : [];

  const maxBar =
    projected && selected.actual_cash_value != null
      ? Math.max(projected.projectedCV, selected.actual_cash_value)
      : 1;

  return (
    <div className="space-y-5">

      {/* Quarter tabs */}
      {decks.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 mr-1">Quarter:</span>
          {decks.map(d => (
            <button
              key={d.id}
              onClick={() => setSelected(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selected.id === d.id
                  ? "bg-[#C9A84C] text-[#0A1628]"
                  : "bg-white border border-gray-200 text-slate-500 hover:border-[#C9A84C]"
              }`}
            >
              {d.quarter}
            </button>
          ))}
        </div>
      )}

      {/* Header banner */}
      <div className="bg-[#0A1628] rounded-2xl px-8 py-7 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#C9A84C]/5 rounded-full -translate-y-20 translate-x-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/2 rounded-full translate-y-10 -translate-x-10 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 border border-[#C9A84C] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-[#C9A84C] text-xs">V</span>
            </div>
            <span className="text-[#C9A84C] text-[9px] tracking-[0.35em] uppercase">Vision Consulting Group</span>
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Quarterly Policy Review</p>
          <h1 className="text-white text-3xl font-light tracking-wide">{selected.quarter}</h1>
          <div className="flex items-center gap-3 mt-3 text-slate-400 text-xs">
            <span>{clientName}</span>
            <span className="text-slate-600">·</span>
            <span>Advisor: {advisorName}</span>
            {selected.published_at && (
              <>
                <span className="text-slate-600">·</span>
                <span>Issued {fmtDate(selected.published_at)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Cash Value",
            value: fmt(selected.actual_cash_value),
            sub: "End of quarter",
            color: "text-green-600",
          },
          {
            label: "Death Benefit",
            value: fmt(selected.actual_death_benefit),
            sub: "Coverage in force",
            color: "text-[#C9A84C]",
          },
          {
            label: "Premiums Paid",
            value: fmt(selected.actual_premiums_paid),
            sub: "Cumulative to date",
            color: "text-[#0A1628]",
          },
          {
            label: "Net Gain",
            value: netGain != null ? (netGain >= 0 ? "+" : "") + fmt(Math.abs(netGain)) : "—",
            sub: "Value above premiums",
            color: netGain == null ? "text-slate-400" : netGain >= 0 ? "text-green-600" : "text-amber-600",
          },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">{m.label}</p>
            <p className={`text-2xl font-light ${m.color}`}>{m.value}</p>
            <p className="text-slate-400 text-[10px] mt-1.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Performance vs Projection */}
      {projected && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-5">Performance vs Projection</p>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Original Projected Cash Value</span>
                <span className="text-sm font-medium text-slate-600">{fmt(projected.projectedCV)}</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-200 rounded-full"
                  style={{ width: `${(projected.projectedCV / maxBar) * 100}%` }}
                />
              </div>
            </div>
            {selected.actual_cash_value != null && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-700 font-medium">Actual Cash Value</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#0A1628]">{fmt(selected.actual_cash_value)}</span>
                    {cvVariancePct != null && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        ahead ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {ahead ? "+" : ""}{cvVariancePct.toFixed(1)}% {ahead ? "ahead" : "behind"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${ahead ? "bg-[#C9A84C]" : "bg-amber-400"}`}
                    style={{ width: `${(selected.actual_cash_value / maxBar) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          {cvVariance != null && (
            <div className={`mt-5 px-4 py-3 rounded-xl text-sm ${
              ahead ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
            }`}>
              {ahead
                ? `Your policy is ${fmt(Math.abs(cvVariance))} ahead of the original illustration. Strong performance.`
                : `Your policy is ${fmt(Math.abs(cvVariance))} below the original projection. Your advisor will address this on your next call.`}
            </div>
          )}
        </div>
      )}

      {/* Index Performance */}
      {selected.index_used && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-5">
            Index Performance · {selected.quarter}
          </p>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Index</p>
                <p className="text-[#0A1628] font-medium mt-1">{selected.index_used}</p>
              </div>
              {selected.index_return_pct != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Index Return</p>
                  <p className="text-3xl font-light text-[#0A1628] mt-1">{fmtPct(selected.index_return_pct)}</p>
                </div>
              )}
            </div>
            <div className="space-y-5">
              {selected.cap_rate_pct != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Your Cap Rate</p>
                  <p className="text-2xl font-light text-[#C9A84C] mt-1">{fmtPct(selected.cap_rate_pct)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Maximum credited to your policy</p>
                </div>
              )}
              {selected.floor_rate_pct != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Your Floor Rate</p>
                  <p className="text-2xl font-light text-blue-500 mt-1">{fmtPct(selected.floor_rate_pct)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Minimum — your policy never goes below this</p>
                </div>
              )}
            </div>
          </div>
          {selected.index_return_pct != null && selected.cap_rate_pct != null && (
            <div className="mt-5 bg-[#F4F5F7] rounded-xl p-4 text-sm text-slate-600 leading-relaxed">
              {selected.index_return_pct > selected.cap_rate_pct
                ? `The ${selected.index_used} returned ${fmtPct(selected.index_return_pct)} this quarter. Your policy was credited ${fmtPct(selected.cap_rate_pct)} — the cap was applied, still delivering strong protected growth.`
                : `The ${selected.index_used} returned ${fmtPct(selected.index_return_pct)} this quarter. Your policy was credited the full ${fmtPct(selected.index_return_pct)}.`}
            </div>
          )}
        </div>
      )}

      {/* Market Commentary */}
      {selected.market_commentary && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-4">Market Commentary</p>
          <div className="flex gap-4">
            <div className="w-0.5 bg-[#C9A84C] rounded-full flex-shrink-0 my-0.5" />
            <p className="text-slate-700 text-sm leading-relaxed">{selected.market_commentary}</p>
          </div>
          <p className="text-slate-400 text-xs mt-4">— {advisorName}</p>
        </div>
      )}

      {/* Policy Notes */}
      {selected.policy_notes && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Policy Notes</p>
          <p className="text-slate-700 text-sm leading-relaxed">{selected.policy_notes}</p>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-4">Action Items</p>
          <div className="space-y-3">
            {actionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded border-2 border-[#C9A84C]/50 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700 text-sm leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="bg-[#0A1628] rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-medium">Questions about this report?</p>
          <p className="text-slate-400 text-xs mt-0.5">{advisorName} is here to walk you through it</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.pdf_path && (
            <button
              onClick={() => openPdf(selected.pdf_path!)}
              className="px-4 py-2.5 border border-[#C9A84C]/30 text-[#C9A84C] text-xs font-medium rounded-xl hover:bg-[#C9A84C]/10 transition-colors"
            >
              Download Carrier PDF
            </button>
          )}
          <button
            onClick={onSchedule}
            className="px-5 py-2.5 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-xs uppercase tracking-widest rounded-xl transition-colors"
          >
            Schedule a Call
          </button>
        </div>
      </div>
    </div>
  );
}
