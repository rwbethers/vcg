"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Client { id: string; name: string; advisor: string; type: string; }
interface Deal { id: string; asset_class: string; status: string; }
interface ActionItem { id: string; client_id: string; completed: boolean; due_date: string; }

interface Policy {
  client_id: string;
  face_amount: number;
  cash_value: number;
  annual_premium: number;
  status: string;
}

interface Props {
  clients: Client[];
  deals: Deal[];
  actionItems: ActionItem[];
}

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function ReportsTab({ clients, deals, actionItems }: Props) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from("policies")
      .select("client_id, face_amount, cash_value, annual_premium, status")
      .then(({ data }) => { setPolicies(data ?? []); setLoading(false); });
  }, []);

  const active = policies.filter((p) => p.status === "Active");
  const totalDB      = active.reduce((s, p) => s + (p.face_amount    || 0), 0);
  const totalCV      = active.reduce((s, p) => s + (p.cash_value     || 0), 0);
  const totalPremium = active.reduce((s, p) => s + (p.annual_premium || 0), 0);
  const pending  = actionItems.filter((a) => !a.completed).length;
  const overdue  = actionItems.filter((a) => !a.completed && new Date(a.due_date) < new Date()).length;

  const advisors = [...new Set(clients.map((c) => c.advisor))].sort();
  const advisorRows = advisors.map((adv) => {
    const advClients = clients.filter((c) => c.advisor === adv);
    const ids = new Set(advClients.map((c) => c.id));
    const advPolicies = active.filter((p) => ids.has(p.client_id));
    return {
      advisor:  adv,
      clients:  advClients.length,
      db:       advPolicies.reduce((s, p) => s + (p.face_amount    || 0), 0),
      cv:       advPolicies.reduce((s, p) => s + (p.cash_value     || 0), 0),
      premiums: advPolicies.reduce((s, p) => s + (p.annual_premium || 0), 0),
    };
  });

  const byStatus = deals.reduce<Record<string, number>>((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});
  const byClass  = deals.reduce<Record<string, number>>((acc, d) => { acc[d.asset_class] = (acc[d.asset_class] || 0) + 1; return acc; }, {});

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light text-[#0A1628]">Reports</h1>
        <p className="text-slate-400 text-sm mt-1">Aggregate portfolio metrics across all VCG clients</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: "Total Clients",       value: String(clients.length), sub: `${active.length} active policies` },
          { label: "Total Death Benefit", value: fmt(totalDB),           sub: "Active policies only" },
          { label: "Total Cash Value",    value: fmt(totalCV),           sub: "As of last statement" },
          { label: "Annual Premiums",     value: fmt(totalPremium),      sub: "Under management" },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-[#C9A84C]">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">{m.label}</p>
            <p className="text-[#0A1628] text-xl font-light mb-1">{m.value}</p>
            <p className="text-xs text-slate-400">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Advisor breakdown */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-[#0A1628] font-medium text-sm">Advisor Breakdown</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-[#F4F5F7]">
              {["Advisor", "Clients", "Total Death Benefit", "Total Cash Value", "Annual Premiums"].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {advisorRows.map((row) => (
              <tr key={row.advisor} className="hover:bg-[#FAFBFC] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#C9A84C] text-[10px] font-semibold">
                        {row.advisor.split(" ").map((w) => w[0]).join("")}
                      </span>
                    </div>
                    <span className="text-[#0A1628] text-sm font-medium">{row.advisor}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 text-sm">{row.clients}</td>
                <td className="px-6 py-4 text-[#C9A84C] text-sm font-semibold">{fmt(row.db)}</td>
                <td className="px-6 py-4 text-green-600 text-sm font-semibold">{fmt(row.cv)}</td>
                <td className="px-6 py-4 text-slate-700 text-sm">{fmt(row.premiums)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Deal pipeline + Action items */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <h3 className="text-[#0A1628] font-medium text-sm">Deal Pipeline</h3>
          <div className="space-y-2.5">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">By Status</p>
            {Object.entries(byStatus).map(([s, n]) => (
              <div key={s} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-slate-600 text-sm">{s}</span>
                <span className="text-[#0A1628] font-semibold text-sm">{n}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2.5 pt-1">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">By Asset Class</p>
            {Object.entries(byClass).map(([cls, n]) => (
              <div key={cls} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-slate-600 text-sm">{cls}</span>
                <span className="text-[#0A1628] font-semibold text-sm">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h3 className="text-[#0A1628] font-medium text-sm">Action Items Summary</h3>
          <div className="space-y-1">
            {[
              { label: "Total",     value: actionItems.length,                             color: "text-[#0A1628]" },
              { label: "Pending",   value: pending,                                         color: "text-amber-600" },
              { label: "Overdue",   value: overdue,                                         color: "text-red-500"   },
              { label: "Completed", value: actionItems.filter((a) => a.completed).length,  color: "text-green-600" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <span className="text-slate-500 text-sm">{row.label}</span>
                <span className={`font-semibold text-sm ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
