"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcLiveSnapshot, type LiveSnapshot } from "@/lib/illustrationCalc";

interface Client { id: string; name: string; advisor: string; stage: string; }

interface Illustration {
  id: string;
  client_id: string;
  prospect_name: string;
  carrier: string;
  product_name: string;
  advisor_name: string;
  issue_age: number;
  face_amount: number;
  annual_prem: number;
  prem_years: number;
  illustrated_rate: number;
  notes: string | null;
  created_at: string;
}

interface Review {
  id: string;
  illustration_id: string;
  client_id: string;
  review_type: string;
  reviewed_by: string;
  actual_cash_value: number | null;
  actual_death_benefit: number | null;
  on_track: boolean;
  notes: string | null;
  action_items: string | null;
  index_notes: string | null;
  premium_finance_notes: string | null;
  reviewed_at: string;
}

interface Props {
  clients: Client[];
  adminEmail: string;
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const fmtX = (n: number) => n.toFixed(2) + "x";
const fmtRate = (n: number) => n.toFixed(2) + "%";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

type ReviewType = "weekly" | "monthly" | "quarterly";

const reviewConfig: Record<ReviewType, { label: string; cadenceDays: number; color: string; bg: string; desc: string }> = {
  weekly:    { label: "Weekly",    cadenceDays: 7,  color: "text-blue-600",   bg: "bg-blue-50",   desc: "Quick check-in — on track or not, brief note" },
  monthly:   { label: "Monthly",   cadenceDays: 30, color: "text-purple-600", bg: "bg-purple-50", desc: "Actual values vs illustration, performance snapshot" },
  quarterly: { label: "Quarterly", cadenceDays: 90, color: "text-[#C9A84C]",  bg: "bg-amber-50",  desc: "Full policy health, index review, finance status, next steps" },
};

export default function PolicyReviewTab({ clients, adminEmail }: Props) {
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<ReviewType>("weekly");
  const [selected, setSelected] = useState<Illustration | null>(null);

  // Form
  const [formType, setFormType] = useState<ReviewType>("weekly");
  const [formCV, setFormCV] = useState("");
  const [formDB, setFormDB] = useState("");
  const [formOnTrack, setFormOnTrack] = useState(true);
  const [formNotes, setFormNotes] = useState("");
  const [formActionItems, setFormActionItems] = useState("");
  const [formIndexNotes, setFormIndexNotes] = useState("");
  const [formFinanceNotes, setFormFinanceNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sb = createClient();
    Promise.all([
      sb.from("illustrations").select("*").order("created_at", { ascending: false }),
      sb.from("policy_reviews").select("*").order("reviewed_at", { ascending: false }),
    ]).then(([{ data: il }, { data: rv }]) => {
      setIllustrations(il ?? []);
      setReviews(rv ?? []);
      setLoading(false);
    });
  }, []);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  const snap: LiveSnapshot | null = useMemo(() => {
    if (!selected) return null;
    return calcLiveSnapshot({
      faceAmount: selected.face_amount,
      annualPrem: selected.annual_prem,
      premYears: selected.prem_years,
      illustratedRate: selected.illustrated_rate,
      issueAge: selected.issue_age,
      startDate: selected.created_at,
    });
  }, [selected]);
  const cfg = reviewConfig[activeType];

  const lastReview = (ilId: string, type: ReviewType) =>
    reviews.find(r => r.illustration_id === ilId && r.review_type === type);

  const isDue = (ilId: string, type: ReviewType) => {
    const last = lastReview(ilId, type);
    if (!last) return true;
    return daysSince(last.reviewed_at) >= reviewConfig[type].cadenceDays;
  };

  const dueIlls = illustrations.filter(il => isDue(il.id, activeType));
  const recentIlls = illustrations.filter(il => !isDue(il.id, activeType) && lastReview(il.id, activeType));

  const openReview = (il: Illustration) => {
    setSelected(il);
    setFormType(activeType);
    setFormCV(""); setFormDB("");
    setFormOnTrack(true); setFormNotes("");
    setFormActionItems(""); setFormIndexNotes(""); setFormFinanceNotes("");
    setSaved(false);
  };

  const submitReview = async () => {
    if (!selected) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("policy_reviews").insert({
      illustration_id: selected.id,
      client_id: selected.client_id,
      review_type: formType,
      reviewed_by: adminEmail,
      actual_cash_value: formCV ? Number(formCV) : null,
      actual_death_benefit: formDB ? Number(formDB) : null,
      on_track: formOnTrack,
      notes: formNotes || null,
      action_items: formActionItems || null,
      index_notes: formIndexNotes || null,
      premium_finance_notes: formFinanceNotes || null,
    });
    if (!error) {
      const { data } = await createClient().from("policy_reviews").select("*").order("reviewed_at", { ascending: false });
      setReviews(data ?? []);
      setSaved(true);
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const IllCard = ({ il, due }: { il: Illustration; due: boolean }) => {
    const last = lastReview(il.id, activeType);
    return (
      <div onClick={() => openReview(il)}
        className={`bg-white rounded-2xl shadow-sm p-4 cursor-pointer border-l-4 transition-all hover:shadow-md ${
          due ? "border-amber-400" : "border-green-400"
        } ${selected?.id === il.id ? "ring-2 ring-[#C9A84C]" : ""}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[#0A1628] text-sm font-medium truncate">{il.prospect_name}</p>
            <p className="text-slate-400 text-[10px] mt-0.5 truncate">{il.carrier} · {il.product_name}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            {due ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold">Due</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-semibold">
                {last ? daysSince(last.reviewed_at) + "d ago" : ""}
              </span>
            )}
            {last && !last.on_track && (
              <p className="text-[10px] text-red-500 mt-0.5">Off Track</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <span className="text-[10px] text-slate-400">Face: <span className="text-[#0A1628] font-medium">{fmt(il.face_amount)}</span></span>
          <span className="text-[10px] text-slate-400">Rate: <span className="text-[#C9A84C] font-medium">{fmtRate(il.illustrated_rate)}</span></span>
        </div>
      </div>
    );
  };

  const clientReviews = selected ? reviews.filter(r => r.illustration_id === selected.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#0A1628]">Policy Reviews</h1>
          <p className="text-slate-400 text-sm mt-1">{cfg.desc}</p>
        </div>
        <div className="flex gap-2">
          {(Object.keys(reviewConfig) as ReviewType[]).map(t => (
            <button key={t} onClick={() => { setActiveType(t); setSelected(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${
                activeType === t
                  ? `${reviewConfig[t].bg} ${reviewConfig[t].color} border border-current`
                  : "bg-white border border-gray-200 text-slate-500 hover:border-gray-300"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">

        {/* Client list */}
        <div className="col-span-2 space-y-4 overflow-y-auto max-h-[calc(100vh-260px)]">
          {dueIlls.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold px-1">Due Now ({dueIlls.length})</p>
              {dueIlls.map(il => <IllCard key={il.id} il={il} due />)}
            </div>
          )}
          {recentIlls.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-green-600 font-semibold px-1">Recently Reviewed ({recentIlls.length})</p>
              {recentIlls.map(il => <IllCard key={il.id} il={il} due={false} />)}
            </div>
          )}
          {illustrations.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-slate-400 text-sm">No illustrations in the system yet</p>
            </div>
          )}
        </div>

        {/* Review panel */}
        <div className="col-span-3 overflow-y-auto max-h-[calc(100vh-260px)] space-y-4">
          {!selected ? (
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center flex flex-col items-center justify-center min-h-64">
              <p className="text-slate-300 text-4xl mb-3">◎</p>
              <p className="text-slate-400 text-sm">Select a client to log a {activeType} review</p>
            </div>
          ) : (
            <>
              {/* Live snapshot + benchmark */}
              <div className="bg-[#0A1628] rounded-2xl p-6 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest">{selected.prospect_name} — Live Projection</p>
                  {snap && (
                    <span className="text-[#C9A84C] text-[10px] px-2.5 py-1 bg-[#C9A84C]/10 rounded-full border border-[#C9A84C]/20 font-semibold">
                      Policy Year {snap.policyYearInt > 0 ? snap.policyYearInt : "<1"}
                    </span>
                  )}
                </div>

                {snap && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1a3060] rounded-xl p-4 col-span-2">
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Projected Cash Value Today</p>
                      <p className="text-[#C9A84C] text-4xl font-extralight">{fmt(snap.projectedCV)}</p>
                      <div className="flex gap-4 mt-2">
                        <p className="text-slate-500 text-[10px]">Premiums paid: <span className="text-slate-300">{fmt(snap.cumulativePremiums)}</span></p>
                        <p className="text-slate-500 text-[10px]">Net gain: <span className={snap.netGain >= 0 ? "text-green-400" : "text-amber-400"}>{fmt(snap.netGain)}</span></p>
                        <p className="text-slate-500 text-[10px]">Multiple: <span className="text-slate-300">{fmtX(snap.returnMultiple)}</span></p>
                      </div>
                    </div>
                    <div className="bg-[#1a3060] rounded-xl p-3">
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Death Benefit</p>
                      <p className="text-white text-lg font-light">{fmt(snap.projectedDB)}</p>
                    </div>
                    <div className="bg-[#1a3060] rounded-xl p-3">
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Premium Years Left</p>
                      <p className="text-white text-lg font-light">
                        {snap.premiumsRemaining > 0 ? snap.premiumsRemaining.toFixed(1) + " yrs" : "Complete"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 bg-[#1a3060] rounded-xl p-4">
                  <div className="text-center">
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Face Amount</p>
                    <p className="text-[#C9A84C] text-base font-light">{fmt(selected.face_amount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Annual Prem</p>
                    <p className="text-white text-base font-light">{fmt(selected.annual_prem)}</p>
                    <p className="text-slate-500 text-[10px]">{selected.prem_years}yr · Age {selected.issue_age}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Illustrated Rate</p>
                    <p className="text-green-400 text-base font-light">{fmtRate(selected.illustrated_rate)}</p>
                    <p className="text-slate-500 text-[10px]">{selected.carrier}</p>
                  </div>
                </div>
                {selected.notes && <p className="text-slate-400 text-xs italic border-t border-[#1a3060] pt-3">{selected.notes}</p>}
              </div>

              {/* Review form — complexity scales with type */}
              <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-[#0A1628] font-medium text-sm">Log {formType.charAt(0).toUpperCase() + formType.slice(1)} Review</p>
                  <div className="flex gap-1.5">
                    {(Object.keys(reviewConfig) as ReviewType[]).map(t => (
                      <button key={t} onClick={() => setFormType(t)}
                        className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest font-semibold transition-all ${
                          formType === t
                            ? `${reviewConfig[t].bg} ${reviewConfig[t].color}`
                            : "bg-gray-100 text-slate-400 hover:bg-gray-200"
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* On Track — all types */}
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-2">Status</label>
                  <div className="flex gap-3">
                    <button onClick={() => setFormOnTrack(true)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        formOnTrack ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-slate-400"
                      }`}>On Track</button>
                    <button onClick={() => setFormOnTrack(false)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        !formOnTrack ? "bg-red-50 text-red-600 border border-red-200" : "bg-gray-100 text-slate-400"
                      }`}>Off Track</button>
                  </div>
                </div>

                {/* Notes — all types */}
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">
                    {formType === "weekly" ? "Check-in Notes" : "Review Notes"}
                  </label>
                  <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)}
                    rows={formType === "weekly" ? 2 : 3}
                    placeholder={
                      formType === "weekly" ? "Brief status update — anything pending or urgent?"
                      : formType === "monthly" ? "Performance notes, observations vs illustration…"
                      : "Full quarterly assessment — policy health, client conversation, concerns…"
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] resize-none" />
                </div>

                {/* Monthly + Quarterly: actual values */}
                {(formType === "monthly" || formType === "quarterly") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Actual Cash Value</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input type="number" value={formCV} onChange={e => setFormCV(e.target.value)} placeholder="0"
                          className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]" />
                      </div>
                      {formCV && (
                        <p className="text-[10px] mt-1 text-slate-400">
                          vs illustrated: <span className={Number(formCV) >= selected.face_amount * 0.1 ? "text-green-600" : "text-amber-500"}>
                            {Math.round((Number(formCV) / selected.face_amount) * 100)}% of face
                          </span>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Actual Death Benefit</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input type="number" value={formDB} onChange={e => setFormDB(e.target.value)} placeholder="0"
                          className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quarterly only: extended fields */}
                {formType === "quarterly" && (
                  <>
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Index / Allocation Notes</label>
                      <textarea value={formIndexNotes} onChange={e => setFormIndexNotes(e.target.value)}
                        rows={2} placeholder="Current index allocations, segment lock-in dates, performance vs cap…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] resize-none" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Premium Finance Notes</label>
                      <textarea value={formFinanceNotes} onChange={e => setFormFinanceNotes(e.target.value)}
                        rows={2} placeholder="Renewal status, collateral adequacy, lender notes, rate changes…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] resize-none" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Action Items</label>
                      <textarea value={formActionItems} onChange={e => setFormActionItems(e.target.value)}
                        rows={2} placeholder="Next steps, follow-ups, documents needed, client requests…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] resize-none" />
                    </div>
                  </>
                )}

                <button onClick={submitReview} disabled={saving || saved}
                  className={`w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${
                    saved ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                    : saving ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628]"
                  }`}>
                  {saved ? "✓ Review Published to Client" : saving ? "Saving…" : `Log ${formType.charAt(0).toUpperCase() + formType.slice(1)} Review`}
                </button>
              </div>

              {/* Review history */}
              {clientReviews.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <p className="text-[#0A1628] font-medium text-sm">Review History</p>
                    <p className="text-slate-400 text-xs">{clientReviews.length} reviews</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {clientReviews.map(r => {
                      const rcfg = reviewConfig[r.review_type as ReviewType];
                      return (
                        <div key={r.id} className="px-6 py-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${rcfg?.bg} ${rcfg?.color}`}>
                                {r.review_type}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                r.on_track ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                              }`}>{r.on_track ? "On Track" : "Off Track"}</span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-slate-400 text-[10px]">{fmtDate(r.reviewed_at)}</p>
                              <p className="text-slate-500 text-[10px]">{r.reviewed_by.split("@")[0]}</p>
                            </div>
                          </div>
                          {r.notes && <p className="text-slate-600 text-sm">{r.notes}</p>}
                          {(r.actual_cash_value || r.actual_death_benefit) && (
                            <div className="flex gap-4 mt-2">
                              {r.actual_cash_value && <p className="text-xs text-slate-500">CV: <span className="text-green-600 font-medium">{fmt(r.actual_cash_value)}</span></p>}
                              {r.actual_death_benefit && <p className="text-xs text-slate-500">DB: <span className="text-[#C9A84C] font-medium">{fmt(r.actual_death_benefit)}</span></p>}
                            </div>
                          )}
                          {r.action_items && (
                            <div className="mt-2 bg-amber-50 rounded-lg px-3 py-2">
                              <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-widest mb-0.5">Action Items</p>
                              <p className="text-slate-600 text-xs">{r.action_items}</p>
                            </div>
                          )}
                          {r.index_notes && (
                            <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2">
                              <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-widest mb-0.5">Index / Allocation</p>
                              <p className="text-slate-600 text-xs">{r.index_notes}</p>
                            </div>
                          )}
                          {r.premium_finance_notes && (
                            <div className="mt-2 bg-purple-50 rounded-lg px-3 py-2">
                              <p className="text-[10px] text-purple-600 font-semibold uppercase tracking-widest mb-0.5">Premium Finance</p>
                              <p className="text-slate-600 text-xs">{r.premium_finance_notes}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
