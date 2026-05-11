"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface DateEvent {
  id: string;
  type: "renewal" | "premium" | "payup" | "anniversary" | "action" | "lockIn";
  label: string;
  client: string;
  advisor: string;
  date: string;
  daysUntil: number;
  meta?: string;
}

const TYPE_CONFIG = {
  renewal:     { label: "Loan Renewal",      color: "#f87171", bg: "bg-red-50",     border: "border-red-200",    dot: "bg-red-400"    },
  premium:     { label: "Premium Due",       color: "#C9A84C", bg: "bg-amber-50",   border: "border-amber-200",  dot: "bg-amber-400"  },
  payup:       { label: "Pay-Up Date",       color: "#a78bfa", bg: "bg-purple-50",  border: "border-purple-200", dot: "bg-purple-400" },
  anniversary: { label: "Policy Anniv.",     color: "#60a5fa", bg: "bg-blue-50",    border: "border-blue-200",   dot: "bg-blue-400"   },
  action:      { label: "Action Item",       color: "#34d399", bg: "bg-emerald-50", border: "border-emerald-200",dot: "bg-emerald-400"},
  lockIn:      { label: "IUL Lock-In",       color: "#fb923c", bg: "bg-orange-50",  border: "border-orange-200", dot: "bg-orange-400" },
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function bucket(days: number): string {
  if (days < 0)    return "Overdue";
  if (days === 0)  return "Today";
  if (days <= 7)   return "This Week";
  if (days <= 30)  return "This Month";
  if (days <= 90)  return "Next 3 Months";
  return "Beyond 90 Days";
}

const BUCKET_ORDER = ["Overdue", "Today", "This Week", "This Month", "Next 3 Months", "Beyond 90 Days"];

const FILTERS = ["All", "Loan Renewal", "Premium Due", "Action Item", "Policy Anniv.", "Pay-Up Date"];

export default function CriticalDatesTab() {
  const [events, setEvents]     = useState<DateEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("All");
  const [horizon, setHorizon]   = useState<90 | 180 | 365>(90);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("policies").select("id, policy_number, carrier, product_type, insured_name, pay_up_date, renewal_date, issue_date, annual_premium, clients(name, advisor)").not("pay_up_date", "is", null),
      supabase.from("action_items").select("id, label, due_date, priority, clients(name, advisor)").eq("completed", false),
      supabase.from("collateral_accounts").select("id, renewal_date, lender, clients(name, advisor)").not("renewal_date", "is", null),
    ]).then(([{ data: policies }, { data: actions }, { data: collateral }]) => {
      const all: DateEvent[] = [];

      // Pay-up dates
      (policies ?? []).forEach((p: any) => {
        if (p.pay_up_date) {
          all.push({
            id:        `payup-${p.id}`,
            type:      "payup",
            label:     `Pay-Up Date · ${p.carrier} #${p.policy_number ?? "—"}`,
            client:    p.clients?.name ?? "Unknown",
            advisor:   p.clients?.advisor ?? "",
            date:      p.pay_up_date,
            daysUntil: daysUntil(p.pay_up_date),
          });
        }
        // Policy anniversaries (annual from issue_date)
        if (p.issue_date) {
          const today = new Date();
          const issue = new Date(p.issue_date);
          const thisYear = new Date(today.getFullYear(), issue.getMonth(), issue.getDate());
          const annivDate = thisYear < today
            ? new Date(today.getFullYear() + 1, issue.getMonth(), issue.getDate())
            : thisYear;
          const annivStr = annivDate.toISOString().split("T")[0];
          all.push({
            id:        `anniv-${p.id}`,
            type:      "anniversary",
            label:     `Policy Anniversary · ${p.carrier} #${p.policy_number ?? "—"}`,
            client:    p.clients?.name ?? "Unknown",
            advisor:   p.clients?.advisor ?? "",
            date:      annivStr,
            daysUntil: daysUntil(annivStr),
            meta:      `Issued ${new Date(p.issue_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
          });
        }
        // Renewal dates on policy (premium finance)
        if (p.renewal_date) {
          all.push({
            id:        `pol-renewal-${p.id}`,
            type:      "renewal",
            label:     `Loan Renewal · ${p.carrier} #${p.policy_number ?? "—"}`,
            client:    p.clients?.name ?? "Unknown",
            advisor:   p.clients?.advisor ?? "",
            date:      p.renewal_date,
            daysUntil: daysUntil(p.renewal_date),
          });
        }
      });

      // Action items
      (actions ?? []).forEach((a: any) => {
        if (a.due_date) {
          all.push({
            id:        `action-${a.id}`,
            type:      "action",
            label:     a.label,
            client:    a.clients?.name ?? "Unknown",
            advisor:   a.clients?.advisor ?? "",
            date:      a.due_date,
            daysUntil: daysUntil(a.due_date),
            meta:      a.priority,
          });
        }
      });

      // Collateral account renewals
      (collateral ?? []).forEach((c: any) => {
        if (c.renewal_date) {
          all.push({
            id:        `col-renewal-${c.id}`,
            type:      "renewal",
            label:     `Loan Renewal · ${c.lender ?? "Lender"}`,
            client:    c.clients?.name ?? "Unknown",
            advisor:   c.clients?.advisor ?? "",
            date:      c.renewal_date,
            daysUntil: daysUntil(c.renewal_date),
          });
        }
      });

      // Sort by soonest
      all.sort((a, b) => a.daysUntil - b.daysUntil);
      setEvents(all);
      setLoading(false);
    });
  }, []);

  const filtered = events.filter(e => {
    if (e.daysUntil > horizon && e.daysUntil > 0) return false;
    const typeLabel = TYPE_CONFIG[e.type].label;
    if (filter !== "All" && typeLabel !== filter) return false;
    return true;
  });

  // Group by bucket
  const grouped: Record<string, DateEvent[]> = {};
  filtered.forEach(e => {
    const b = bucket(e.daysUntil);
    if (!grouped[b]) grouped[b] = [];
    grouped[b].push(e);
  });

  const overdue  = events.filter(e => e.daysUntil < 0).length;
  const thisWeek = events.filter(e => e.daysUntil >= 0 && e.daysUntil <= 7).length;
  const upcoming = events.filter(e => e.daysUntil > 7 && e.daysUntil <= 30).length;

  return (
    <div className="space-y-7">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#0A1628]">Critical Dates</h1>
          <p className="text-slate-400 text-sm mt-1">Loan renewals, premium due dates, policy anniversaries, and action items</p>
        </div>
        <div className="flex items-center gap-2">
          {([90, 180, 365] as const).map(h => (
            <button key={h} onClick={() => setHorizon(h)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                horizon === h ? "bg-[#0A1628] text-[#C9A84C] font-semibold" : "bg-white border border-gray-200 text-slate-500 hover:border-[#C9A84C]"
              }`}>
              {h === 90 ? "90 days" : h === 180 ? "6 months" : "1 year"}
            </button>
          ))}
        </div>
      </div>

      {/* Alert strip */}
      {(overdue > 0 || thisWeek > 0) && (
        <div className="grid grid-cols-3 gap-4">
          {overdue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-500 font-bold text-lg flex-shrink-0">!</div>
              <div>
                <p className="text-red-700 font-semibold text-sm">{overdue} overdue</p>
                <p className="text-red-500 text-xs">Past due — requires immediate attention</p>
              </div>
            </div>
          )}
          {thisWeek > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-500 font-bold text-lg flex-shrink-0">◉</div>
              <div>
                <p className="text-amber-700 font-semibold text-sm">{thisWeek} due this week</p>
                <p className="text-amber-500 text-xs">Action required in the next 7 days</p>
              </div>
            </div>
          )}
          {upcoming > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-500 text-lg flex-shrink-0">◷</div>
              <div>
                <p className="text-blue-700 font-semibold text-sm">{upcoming} this month</p>
                <p className="text-blue-500 text-xs">Coming up in the next 30 days</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs transition-all ${
              filter === f ? "bg-[#0A1628] text-[#C9A84C] font-semibold" : "bg-white border border-gray-200 text-slate-500 hover:border-[#C9A84C]"
            }`}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">{filtered.length} events in window</span>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading dates…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <p className="text-slate-300 text-4xl mb-3">◷</p>
          <p className="text-slate-500 font-medium">No upcoming events in this window</p>
          <p className="text-slate-400 text-xs mt-1">Try extending the horizon or adding dates to your policies</p>
        </div>
      ) : (
        <div className="space-y-8">
          {BUCKET_ORDER.filter(b => grouped[b]?.length).map(bucketLabel => (
            <div key={bucketLabel}>
              {/* Bucket header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-px flex-1 ${bucketLabel === "Overdue" ? "bg-red-200" : "bg-gray-200"}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                  bucketLabel === "Overdue"       ? "bg-red-100 text-red-600"
                  : bucketLabel === "Today"       ? "bg-amber-100 text-amber-600"
                  : bucketLabel === "This Week"   ? "bg-amber-50 text-amber-500"
                  : bucketLabel === "This Month"  ? "bg-blue-50 text-blue-500"
                  : "bg-gray-100 text-slate-500"
                }`}>{bucketLabel}</span>
                <div className={`h-px flex-1 ${bucketLabel === "Overdue" ? "bg-red-200" : "bg-gray-200"}`} />
              </div>

              {/* Events in bucket */}
              <div className="space-y-2.5">
                {grouped[bucketLabel].map(event => {
                  const cfg = TYPE_CONFIG[event.type];
                  return (
                    <div key={event.id} className={`bg-white rounded-xl border ${cfg.border} px-5 py-4 flex items-center gap-4`}>
                      {/* Type dot */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                            style={{ color: cfg.color, background: cfg.color + "18" }}>
                            {cfg.label}
                          </span>
                          {event.meta && event.type === "action" && (
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                              event.meta === "High" ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-400"
                            }`}>{event.meta}</span>
                          )}
                        </div>
                        <p className="text-[#0A1628] text-sm font-medium truncate">{event.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-slate-400 text-[10px]">{event.client}</p>
                          {event.advisor && <>
                            <span className="text-slate-200">·</span>
                            <p className="text-slate-400 text-[10px]">{event.advisor}</p>
                          </>}
                          {event.meta && event.type !== "action" && <>
                            <span className="text-slate-200">·</span>
                            <p className="text-slate-400 text-[10px]">{event.meta}</p>
                          </>}
                        </div>
                      </div>

                      {/* Date + countdown */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-[#0A1628] text-xs font-semibold">{fmtDate(event.date)}</p>
                        <p className="mt-0.5 text-[10px]" style={{ color: cfg.color }}>
                          {event.daysUntil < 0
                            ? `${Math.abs(event.daysUntil)}d overdue`
                            : event.daysUntil === 0
                            ? "Today"
                            : `in ${event.daysUntil}d`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
