"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface Lead {
  id: string;
  stage: string;
  source: string;
  assigned_to: string | null;
  potential_premium: number;
}

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
  leads: Lead[];
  dealInterests: DealInterest[];
  goals: Goal[];
  onTabChange: (tab: string) => void;
}

const STAGES = ["Prospect", "Contacted", "Meeting Set", "Proposal Sent", "Closed Won"];
const STAGE_COLORS = ["#94a3b8", "#60a5fa", "#a78bfa", "#fbbf24", "#34d399"];
const PIE_COLORS = ["#C9A84C", "#60a5fa", "#a78bfa", "#34d399", "#f87171"];
const ASSET_COLORS: Record<string, string> = {
  "Real Estate": "#C9A84C",
  "Private Equity": "#a78bfa",
  "Private Credit": "#34d399",
  "Equities": "#60a5fa",
};

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
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 999 ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function OverviewTab({ leads, dealInterests, goals: initialGoals, onTabChange }: Props) {
  const [goals, setGoals] = useState(initialGoals);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  const pipelineValue = leads.filter(l => l.stage !== "Closed Won").reduce((s, l) => s + (l.potential_premium || 0), 0);
  const closedWon = leads.filter(l => l.stage === "Closed Won").length;

  const currentValues: Record<string, number> = {
    "Annual Premium Revenue": 101019,
    "New Clients": 9,
    "Closed Deals (Pipeline)": closedWon,
    "Deal Interest Requests": dealInterests.length,
    "Pipeline Value": pipelineValue,
  };

  const kpis = [
    { label: "Total Clients", value: "9", sub: "Active accounts", color: "border-[#C9A84C]", icon: "👥" },
    { label: "Annual Premiums", value: "$101,019", sub: "Across all policies", color: "border-blue-400", icon: "💰" },
    { label: "Pipeline Value", value: fmt(pipelineValue), sub: `${leads.filter(l => l.stage !== "Closed Won").length} active leads`, color: "border-purple-400", icon: "📈" },
    { label: "Deal Interests", value: String(dealInterests.length), sub: "Private market requests", color: "border-emerald-400", icon: "🏦" },
  ];

  // Chart data
  const pipelineByStage = STAGES.map((stage, i) => ({
    stage: stage.replace(" ", "\n"),
    leads: leads.filter(l => l.stage === stage).length,
    value: leads.filter(l => l.stage === stage).reduce((s, l) => s + (l.potential_premium || 0), 0),
    fill: STAGE_COLORS[i],
  }));

  const sourceData = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      acc[l.source] = (acc[l.source] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const assetClassData = Object.entries(
    dealInterests.reduce<Record<string, number>>((acc, d) => {
      acc[d.asset_class] = (acc[d.asset_class] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const advisorData = ["Stephen Mongie", "Samuel Noel", "Zach McGlothin"].map(name => ({
    name: name.split(" ")[1],
    leads: leads.filter(l => l.assigned_to === name).length,
    value: leads.filter(l => l.assigned_to === name).reduce((s, l) => s + (l.potential_premium || 0), 0),
  }));

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
        {kpis.map((m) => (
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
              const isMoney = goal.metric.toLowerCase().includes("revenue") || goal.metric.toLowerCase().includes("value");

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
                          <button onClick={() => saveGoal(goal)} disabled={savingGoal}
                            className="text-[#C9A84C] hover:text-[#E8C96C] font-semibold">✓</button>
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
                        pct >= 100 ? "bg-green-400"
                        : pct >= 60 ? "bg-[#C9A84C]"
                        : "bg-blue-400"
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

        {/* Pipeline by Stage */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[#0A1628] font-medium text-sm">Pipeline by Stage</h2>
              <p className="text-slate-400 text-xs mt-0.5">Lead count and value per stage</p>
            </div>
            <button onClick={() => onTabChange("Pipeline")} className="text-[#C9A84C] text-xs hover:underline">View →</button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipelineByStage} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="leads" name="Leads" radius={[0, 4, 4, 0]}>
                {pipelineByStage.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-[#0A1628] font-medium text-sm">Lead Sources</h2>
            <p className="text-slate-400 text-xs mt-0.5">Where your leads are coming from</p>
          </div>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No lead data yet</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">

        {/* Deal Interests by Asset Class */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[#0A1628] font-medium text-sm">Deal Interest by Asset Class</h2>
              <p className="text-slate-400 text-xs mt-0.5">Private market demand from clients</p>
            </div>
            <button onClick={() => onTabChange("Deal Interests")} className="text-[#C9A84C] text-xs hover:underline">View →</button>
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

        {/* Advisor Pipeline */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-[#0A1628] font-medium text-sm">Advisor Pipeline</h2>
            <p className="text-slate-400 text-xs mt-0.5">Leads and value assigned per advisor</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={advisorData} margin={{ bottom: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#C9A84C" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="value" name="Pipeline $" fill="#0A1628" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Deal Interests */}
      {dealInterests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-[#0A1628] font-medium text-sm">Recent Deal Interests</h2>
              <p className="text-slate-400 text-xs mt-0.5">Clients requesting more info on private market opportunities</p>
            </div>
            <button onClick={() => onTabChange("Deal Interests")} className="text-[#C9A84C] text-xs hover:underline">View all →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {dealInterests.slice(0, 5).map((di) => (
              <div key={di.id} className="px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#C9A84C] text-[10px] font-semibold">
                      {di.client_name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-[#0A1628] text-sm font-medium">{di.client_name}</p>
                    <p className="text-slate-400 text-xs">{di.deal_title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] font-medium">{di.asset_class}</span>
                  <span className="text-slate-400 text-xs">{fmtDate(di.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
