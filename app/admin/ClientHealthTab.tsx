"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Client { id: string; name: string; advisor: string; type: string; }
interface ActionItem { id: string; client_id: string; completed: boolean; due_date: string; priority: string; }

interface Props {
  clients: Client[];
  actionItems: ActionItem[];
}

interface HealthRow {
  client:          Client;
  score:           "red" | "yellow" | "green";
  flags:           string[];
  policyCount:     number;
  pendingItems:    number;
  overdueItems:    number;
  documentCount:   number;
  dealInterests:   number;
}

const scoreOrder = { red: 0, yellow: 1, green: 2 };
const scoreConfig = {
  green:  { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500",  label: "On Track"  },
  yellow: { bg: "bg-amber-50",  text: "text-amber-600",  dot: "bg-amber-400",  label: "Attention" },
  red:    { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-500",    label: "Urgent"    },
};

export default function ClientHealthTab({ clients, actionItems }: Props) {
  const [rows, setRows]       = useState<HealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"All" | "red" | "yellow" | "green">("All");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("policies").select("client_id, status"),
      supabase.from("documents").select("client_id"),
      supabase.from("deal_interest").select("client_id"),
    ]).then(([polRes, docRes, diRes]) => {
      const policies     = polRes.data ?? [];
      const docs         = docRes.data ?? [];
      const dealInterest = diRes.data  ?? [];
      const now          = new Date();

      const health: HealthRow[] = clients.map((client) => {
        const clientPolicies = policies.filter((p) => p.client_id === client.id);
        const clientItems    = actionItems.filter((a) => a.client_id === client.id);
        const clientDocs     = docs.filter((d) => d.client_id === client.id);
        const clientDI       = dealInterest.filter((d) => d.client_id === client.id);

        const hasLapsedOrReview = clientPolicies.some((p) => p.status === "Lapsed" || p.status === "Under Review");
        const overdue = clientItems.filter((a) => !a.completed && new Date(a.due_date) < now).length;
        const pending = clientItems.filter((a) => !a.completed).length;

        const flags: string[] = [];
        if (overdue > 0)          flags.push(`${overdue} overdue task${overdue > 1 ? "s" : ""}`);
        if (hasLapsedOrReview)    flags.push("Policy needs attention");
        if (clientPolicies.length === 0) flags.push("No policies on file");
        if (clientDocs.length === 0)     flags.push("No documents");
        if (pending > 2)          flags.push(`${pending} pending tasks`);

        let score: HealthRow["score"] = "green";
        if (overdue > 0 || hasLapsedOrReview) score = "red";
        else if (pending > 0 || clientPolicies.length === 0 || clientDocs.length === 0) score = "yellow";

        return {
          client,
          score,
          flags,
          policyCount:   clientPolicies.length,
          pendingItems:  pending,
          overdueItems:  overdue,
          documentCount: clientDocs.length,
          dealInterests: clientDI.length,
        };
      });

      health.sort((a, b) => scoreOrder[a.score] - scoreOrder[b.score]);
      setRows(health);
      setLoading(false);
    });
  }, [clients, actionItems]);

  const counts = {
    red:    rows.filter((r) => r.score === "red").length,
    yellow: rows.filter((r) => r.score === "yellow").length,
    green:  rows.filter((r) => r.score === "green").length,
  };

  const displayed = filter === "All" ? rows : rows.filter((r) => r.score === filter);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light text-[#0A1628]">Client Health</h1>
        <p className="text-slate-400 text-sm mt-1">Prioritized view of who needs attention this week</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {(["red", "yellow", "green"] as const).map((score) => {
          const cfg = scoreConfig[score];
          return (
            <div key={score} className={`${cfg.bg} rounded-2xl p-5`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
                <span className={`${cfg.text} text-xs font-semibold uppercase tracking-widest`}>{cfg.label}</span>
              </div>
              <p className={`${cfg.text} text-3xl font-light`}>{counts[score]}</p>
              <p className={`${cfg.text} text-xs opacity-70 mt-0.5`}>
                {score === "red" ? "Requires action" : score === "yellow" ? "Worth a look" : "All good"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["All", "red", "yellow", "green"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              filter === f ? "bg-[#C9A84C] text-[#0A1628]" : "bg-white border border-gray-200 text-slate-500 hover:border-[#C9A84C]"
            }`}>
            {f === "All" ? "All Clients" : scoreConfig[f].label}
          </button>
        ))}
      </div>

      {/* Client rows */}
      <div className="space-y-3">
        {displayed.map((row) => {
          const cfg = scoreConfig[row.score];
          return (
            <div key={row.client.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#0A1628] flex items-center justify-center">
                  <span className="text-[#C9A84C] text-xs font-semibold">
                    {row.client.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${cfg.dot}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[#0A1628] text-sm font-medium">{row.client.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">{row.client.advisor} · {row.client.type}</p>
                {row.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {row.flags.map((flag) => (
                      <span key={flag} className="text-[10px] bg-gray-100 text-slate-500 px-2 py-0.5 rounded-full">{flag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 flex-shrink-0 text-center">
                {[
                  { label: "Policies",     value: row.policyCount,   urgent: false, warn: row.policyCount === 0 },
                  { label: "Pending",      value: row.pendingItems,   urgent: false, warn: row.pendingItems > 0 },
                  { label: "Overdue",      value: row.overdueItems,   urgent: row.overdueItems > 0, warn: false },
                  { label: "Docs",         value: row.documentCount,  urgent: false, warn: row.documentCount === 0 },
                  { label: "Deal Interest",value: row.dealInterests,  urgent: false, warn: false },
                ].map((m) => (
                  <div key={m.label}>
                    <p className={`text-sm font-semibold ${
                      m.urgent ? "text-red-500" : m.warn ? "text-amber-500" : "text-[#0A1628]"
                    }`}>{m.value}</p>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest whitespace-nowrap">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
