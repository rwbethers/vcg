"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface DealInterest {
  id: string;
  client_name: string;
  deal_title: string;
  asset_class: string;
  created_at: string;
}

interface Goal {
  id: string;
  metric: string;
  target: number;
  period: string;
}

interface Props {
  dealInterests: DealInterest[];
  goals: Goal[];
  onTabChange: (tab: string) => void;
}

const ASSET_COLORS: Record<string, string> = {
  "Real Estate":    "#C9A84C",
  "Private Equity": "#a78bfa",
  "Private Credit": "#34d399",
  "Equities":       "#60a5fa",
};

const STATUS_COLORS = ["#34d399", "#fbbf24", "#60a5fa", "#f87171"];

const clientStatuses = [
  { name: "Active",           value: 5 },
  { name: "Under Review",     value: 3 },
  { name: "Work in Progress", value: 1 },
];

const advisorBreakdown = [
  { name: "Mongie", clients: 5, premiums: 100519 },
  { name: "Noel",   clients: 2, premiums: 0 },
  { name: "McGloth", clients: 2, premiums: 500 },
];

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A1628] text-white px-3 py-2 rounded-lg text-xs shadow-xl">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? "#C9A84C" }}>
          {p.name}: {typeof p.value === "number" && p.value > 999 ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function OverviewTab({ dealInterests, goals: initialGoals, onTabChange }: Props) {
  const [goals, setGoals] = useState(initialGoals);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  const currentValues: Record<string, number> = {
    "Annual Premium Revenue":  101019,
    "Total Death Benefit":     14038693,
    "Active Clients":          5,
    "Deal Interest Requests":  dealInterests.length,
    "Policies Under Review":   3,
  };

  const assetClassData = Object.entries(
    dealInterests.reduce<Record<string, number>>((acc, d) => {
      acc[d.asset_class] = (acc[d.asset_class] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const saveGoal = async (goal: Goal) => {
    const newTarget = parseFloat(editValue);
    if (isNaN(newTarget)) return;
    setSavingGoal(true);
    const supabase = createClient();
    await supabase.from("goals").update({ target: newTarget, updated_at: new Date().toISOString() }).eq("id", goal.id);
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, target: newTarget } : g));
    setEditingGoal(null);
    setSavingGoal(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light text-[#0A1628]">Good morning</h1>
        <p className="text-slate-400 text-sm mt-1">Here's what's happening across your book of business.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: "Total Clients",      value: "9",          sub: "Across all advisors",    color: "border-[#C9A84C]", icon: "👥" },
          { label: "Annual Premiums",    value: "$101,019",   sub: "Total book of business", color: "border-blue-400",  icon: "💰" },
          { label: "Total Death Benefit",value: "$14,038,693",sub: "Coverage in force",      color: "border-purple-400",icon: "🛡️" },
          { label: "Deal Interests",     value: String(dealInterests.length), sub: "Private market requests", color: "border-emerald-400", icon: "🏦" },
        ].map((m) => (
          <div key={m.label} className={`bg-white rounded-2xl p-6 shadow-sm border-l-4 ${m.color}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest">{m.label}</p>
              <span className="text-xl">{m.icon}</span>
            </div>
            <p className="text-[#0A1628] text-2xl font-light">{m.value}</p>
            <p className="text-slate-400 text-xs mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Policies",   value: "7" },
          { label: "Active Clients",    value: "5" },
          { label: "Under Review",      value: "3" },
          { label: "Work in Progress",  value: "1" },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-[#C9A84C] text-lg font-semibold">{m.value}</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-[#0A1628] font-medium">2026 Goals</h2>
            <p className="text-slate-400 text-xs mt-0.5">Click any target to edit it</p>
          </div>
          <div className="p-6 grid grid-cols-1 gap-5">
            {goals.map((goal) => {
              const current = currentValues[goal.metric] ?? 0;
              const pct = Math.min(100, Math.round((current / goal.target) * 100));
              const isEditing = editingGoal === goal.id;
              const isMoney = ["Annual Premium Revenue", "Total Death Benefit"].includes(goal.metric);

              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[#0A1628] text-sm font-medium">{goal.metric}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        pct >= 100 ? "bg-green-50 text-green-600"
                        : pct >= 60 ? "bg-amber-50 text-amber-600"
                        : "bg-slate-100 text-slate-500"
                      }`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="text-[#0A1628] font-semibold">{isMoney ? fmt(current) : current}</span>
                      <span className="text-slate-300">/</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveGoal(goal); if (e.key === "Escape") setEditingGoal(null); }}
                            className="w-24 border border-[#C9A84C] rounded px-2 py-0.5 text-xs text-[#0A1628] focus:outline-none text-right"
                          />
                          <button onClick={() => saveGoal(goal)} disabled={savingGoal} className="text-[#C9A84C] hover:text-[#E8C96C] font-semibold">✓</button>
                          <button onClick={() => setEditingGoal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingGoal(goal.id); setEditValue(String(goal.target)); }}
                          className="text-slate-400 hover:text-[#C9A84C] transition-colors underline-offset-2 hover:underline"
                        >
                          {isMoney ? fmt(goal.target) : goal.target} target
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        pct >= 100 ? "bg-green-400" : pct >= 60 ? "bg-[#C9A84C]" : "bg-blue-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">

        {/* Client Status Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-[#0A1628] font-medium text-sm">Client Status</h2>
            <p className="text-slate-400 text-xs mt-0.5">Breakdown of account health</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={clientStatuses} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {clientStatuses.map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Advisor Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-[#0A1628] font-medium text-sm">By Advisor</h2>
            <p className="text-slate-400 text-xs mt-0.5">Clients and annual premiums per advisor</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={advisorBreakdown} margin={{ bottom: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="left" dataKey="clients" name="Clients" fill="#C9A84C" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="premiums" name="Premiums $" fill="#0A1628" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">

        {/* Deal Interests by Asset Class */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[#0A1628] font-medium text-sm">Deal Interest by Asset Class</h2>
              <p className="text-slate-400 text-xs mt-0.5">Which investments clients are requesting</p>
            </div>
            <button onClick={() => onTabChange("Deal Interests")} className="text-[#C9A84C] text-xs hover:underline">View all →</button>
          </div>
          {assetClassData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={assetClassData} margin={{ bottom: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Requests" radius={[4, 4, 0, 0]}>
                  {assetClassData.map((entry, i) => (
                    <Cell key={i} fill={ASSET_COLORS[entry.name] ?? "#C9A84C"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No interest submissions yet</div>
          )}
        </div>

        {/* Recent Deal Interests */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-[#0A1628] font-medium text-sm">Recent Requests</h2>
              <p className="text-slate-400 text-xs mt-0.5">Latest private market interest</p>
            </div>
            <button onClick={() => onTabChange("Deal Interests")} className="text-[#C9A84C] text-xs hover:underline">View all →</button>
          </div>
          {dealInterests.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No requests yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {dealInterests.slice(0, 5).map((di) => (
                <div key={di.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#C9A84C] text-[9px] font-semibold">
                        {di.client_name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="text-[#0A1628] text-xs font-medium">{di.client_name}</p>
                      <p className="text-slate-400 text-[10px]">{di.deal_title}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] font-medium">{di.asset_class}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
