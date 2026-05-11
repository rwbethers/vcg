"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
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

interface Client {
  id: string;
  name: string;
  advisor: string;
  type: string;
  created_at?: string;
  stage?: string;
}

interface ActionItem {
  id: string;
  client_id: string;
  label: string;
  due_date: string;
  priority: string;
  completed: boolean;
  clients?: { name: string };
}

interface Policy {
  id: string;
  client_id: string;
  carrier: string;
  product_type: string;
  product_name: string;
  status: string;
  death_benefit: number;
  cash_value: number;
  loan_balance: number;
  annual_premium: number;
  annual_prem: number;
  illustrated_rate: number | null;
}

interface CollateralAccount {
  id: string;
  loan_balance: number;
  interest_rate: number;
  collateral_value: number;
  status: string;
}

interface Props {
  dealInterests: DealInterest[];
  goals: Goal[];
  clients: Client[];
  actionItems: ActionItem[];
  onTabChange: (tab: string) => void;
}

const ADVISOR_COLORS: Record<string, string> = {
  "Stephen Mongie": "#C9A84C",
  "Samuel Noel":    "#60a5fa",
  "Zach McGlothin": "#a78bfa",
};
const PRODUCT_COLORS = ["#C9A84C", "#0A1628", "#60a5fa", "#a78bfa", "#34d399", "#f87171"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(n: number | null | undefined) {
  if (!n) return "$0";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "$" + (n / 1_000).toFixed(0)     + "K";
  return "$" + n.toLocaleString();
}
function fmtFull(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const Tooltip_ = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A1628] text-white px-3 py-2 rounded-lg text-xs shadow-xl border border-[#1a3060]">
      <p className="font-medium mb-1 text-[#C9A84C]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? "#C9A84C" }}>
          {p.name}: {typeof p.value === "number" && p.value > 999 ? fmtFull(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const PRIORITY_COLORS: Record<string, string> = {
  High:   "text-red-600 bg-red-50",
  Medium: "text-amber-600 bg-amber-50",
  Low:    "text-slate-500 bg-slate-100",
};

export default function OverviewTab({ dealInterests, goals: initialGoals, clients, actionItems, onTabChange }: Props) {
  const [goals, setGoals]               = useState(initialGoals);
  const [editingGoal, setEditingGoal]   = useState<string | null>(null);
  const [editValue, setEditValue]       = useState("");
  const [savingGoal, setSavingGoal]     = useState(false);
  const [policies, setPolicies]         = useState<Policy[]>([]);
  const [collateral, setCollateral]     = useState<CollateralAccount[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("policies").select("*"),
      supabase.from("collateral_accounts").select("*"),
    ]).then(([{ data: pol }, { data: col }]) => {
      setPolicies((pol ?? []) as Policy[]);
      setCollateral((col ?? []) as CollateralAccount[]);
      setLoading(false);
    });
  }, []);

  const active = policies.filter(p => p.status === "Active");

  // ── Aggregate metrics ──
  const totalDB      = active.reduce((s, p) => s + (p.death_benefit ?? 0), 0);
  const totalCV      = active.reduce((s, p) => s + (p.cash_value ?? 0), 0);
  const totalPrem    = active.reduce((s, p) => s + (p.annual_premium ?? p.annual_prem ?? 0), 0);
  const totalLoan    = collateral.reduce((s, a) => s + (a.loan_balance ?? 0), 0)
                     + active.reduce((s, p) => s + (p.loan_balance ?? 0), 0);
  const avgRate      = active.filter(p => p.illustrated_rate).length
    ? active.reduce((s, p) => s + (p.illustrated_rate ?? 0), 0) / active.filter(p => p.illustrated_rate).length
    : null;

  // ── Monthly onboarding — last 12 months ──
  const now = new Date();
  const monthlyOnboarding = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const label = MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2);
    const count = clients.filter(c => {
      if (!c.created_at) return false;
      const cd = new Date(c.created_at);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    }).length;
    return { month: label, clients: count };
  });

  // ── Advisor breakdown ──
  const advisorNames = ["Stephen Mongie", "Samuel Noel", "Zach McGlothin"];
  const advisorData = advisorNames.map(adv => {
    const advClients  = clients.filter(c => c.advisor === adv);
    const advPolicies = active.filter(p => advClients.some(c => c.id === p.client_id));
    return {
      name: adv.split(" ")[1],
      fullName: adv,
      clients:  advClients.length,
      policies: advPolicies.length,
      premiums: advPolicies.reduce((s, p) => s + (p.annual_premium ?? p.annual_prem ?? 0), 0),
      deathBenefit: advPolicies.reduce((s, p) => s + (p.death_benefit ?? 0), 0),
    };
  });

  // ── Product type breakdown ──
  const productMap: Record<string, number> = {};
  active.forEach(p => {
    const key = p.product_type || "Other";
    productMap[key] = (productMap[key] || 0) + 1;
  });
  const productData = Object.entries(productMap).map(([name, value]) => ({ name, value }));

  // ── Carrier breakdown ──
  const carrierMap: Record<string, number> = {};
  active.forEach(p => {
    const key = p.carrier || "Unknown";
    carrierMap[key] = (carrierMap[key] || 0) + 1;
  });
  const carrierData = Object.entries(carrierMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 14) + "…" : name, value }));

  // ── Action items due soon ──
  const dueItems = actionItems
    .filter(a => !a.completed)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  const saveGoal = async (goal: Goal) => {
    const newTarget = parseFloat(editValue);
    if (isNaN(newTarget)) return;
    setSavingGoal(true);
    const supabase = createClient();
    await supabase.from("goals").update({ target: newTarget }).eq("id", goal.id);
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, target: newTarget } : g));
    setEditingGoal(null);
    setSavingGoal(false);
  };

  const currentValues: Record<string, number> = {
    "Annual Premium Revenue":  totalPrem,
    "Total Death Benefit":     totalDB,
    "Active Clients":          clients.filter(c => c.stage !== "prospect").length,
    "Deal Interest Requests":  dealInterests.length,
    "Policies Under Review":   policies.filter(p => p.status !== "Active").length,
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#0A1628]">{greeting}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {loading ? "Loading portfolio data…" : `Managing ${fmtFull(totalDB)} in death benefit across ${clients.length} clients and ${active.length} active policies.`}
          </p>
        </div>
        <p className="text-slate-400 text-xs">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      {/* ── Hero KPI cards ── */}
      <div className="grid grid-cols-4 gap-5">
        {[
          {
            label: "Death Benefit In Force",
            value: fmt(totalDB),
            full:  fmtFull(totalDB),
            sub:   `${active.length} active policies`,
            icon:  "◈",
            accent: "#C9A84C",
          },
          {
            label: "Annual Premiums Managed",
            value: fmt(totalPrem),
            full:  fmtFull(totalPrem),
            sub:   "Total book of business",
            icon:  "◆",
            accent: "#60a5fa",
          },
          {
            label: "Total Loan Debt Managed",
            value: fmt(totalLoan),
            full:  fmtFull(totalLoan),
            sub:   "Premium finance + policy loans",
            icon:  "⟁",
            accent: "#a78bfa",
          },
          {
            label: "Total Cash Value",
            value: fmt(totalCV),
            full:  fmtFull(totalCV),
            sub:   "Accumulated policy value",
            icon:  "◇",
            accent: "#34d399",
          },
        ].map((m) => (
          <div key={m.label} className="bg-[#0A1628] rounded-2xl p-6 shadow-sm relative overflow-hidden">
            {/* accent bar */}
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: m.accent }} />
            <div className="flex items-start justify-between mb-4">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest leading-snug pr-2">{m.label}</p>
              <span className="text-lg flex-shrink-0" style={{ color: m.accent }}>{m.icon}</span>
            </div>
            {loading ? (
              <div className="h-8 w-24 bg-[#1a3060] rounded animate-pulse" />
            ) : (
              <>
                <p className="text-white text-3xl font-light">{m.value}</p>
                <p className="text-slate-500 text-[10px] mt-0.5 font-mono">{m.full}</p>
              </>
            )}
            <p className="text-slate-500 text-[10px] mt-2">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Secondary stats strip ── */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Total Clients",     value: clients.length,                                         color: "text-[#C9A84C]" },
          { label: "Active Policies",   value: active.length,                                          color: "text-blue-500" },
          { label: "Total Policies",    value: policies.length,                                        color: "text-purple-500" },
          { label: "Avg Crediting",     value: avgRate ? avgRate.toFixed(2) + "%" : "—",              color: "text-emerald-500" },
          { label: "Open Action Items", value: actionItems.filter(a => !a.completed).length,           color: "text-amber-500" },
          { label: "Deal Interests",    value: dealInterests.length,                                   color: "text-rose-400" },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className={`text-xl font-semibold ${m.color}`}>{m.value}</p>
            <p className="text-slate-400 text-[9px] uppercase tracking-widest mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* ── Row: Monthly onboarding + Advisor breakdown ── */}
      <div className="grid grid-cols-5 gap-6">

        {/* Monthly client onboarding — 3 cols */}
        <div className="col-span-3 bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-[#0A1628] font-medium text-sm">Client Onboarding</h2>
            <p className="text-slate-400 text-xs mt-0.5">New clients added per month · last 12 months</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyOnboarding} margin={{ bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
              <Tooltip content={<Tooltip_ />} />
              <Bar dataKey="clients" name="New Clients" fill="#C9A84C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Advisor breakdown — 2 cols */}
        <div className="col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-[#0A1628] font-medium text-sm">By Advisor</h2>
            <p className="text-slate-400 text-xs mt-0.5">Clients, policies and premiums managed</p>
          </div>
          <div className="divide-y divide-gray-50">
            {advisorData.map((adv) => (
              <div key={adv.name} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: ADVISOR_COLORS[adv.fullName] ?? "#C9A84C" }}
                    />
                    <span className="text-[#0A1628] text-sm font-medium">{adv.fullName}</span>
                  </div>
                  <span className="text-[#C9A84C] text-sm font-semibold">{fmt(adv.premiums)}</span>
                </div>
                <div className="flex gap-4 text-[10px] text-slate-400">
                  <span><span className="text-slate-600 font-medium">{adv.clients}</span> clients</span>
                  <span><span className="text-slate-600 font-medium">{adv.policies}</span> policies</span>
                  <span><span className="text-slate-600 font-medium">{fmt(adv.deathBenefit)}</span> DB</span>
                </div>
                {/* Premium bar */}
                <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: totalPrem > 0 ? `${Math.round((adv.premiums / totalPrem) * 100)}%` : "0%",
                      background: ADVISOR_COLORS[adv.fullName] ?? "#C9A84C",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row: Product mix + Carrier breakdown + Action items ── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Product type pie */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-[#0A1628] font-medium text-sm">Policy Mix</h2>
            <p className="text-slate-400 text-xs mt-0.5">By product type</p>
          </div>
          {productData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={productData} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {productData.map((_, i) => (
                    <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<Tooltip_ />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "10px", color: "#64748b" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No policy data</div>
          )}
        </div>

        {/* Carrier breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-[#0A1628] font-medium text-sm">By Carrier</h2>
            <p className="text-slate-400 text-xs mt-0.5">Active policies per carrier</p>
          </div>
          {carrierData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={carrierData} layout="vertical" margin={{ left: 4 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<Tooltip_ />} />
                <Bar dataKey="value" name="Policies" fill="#0A1628" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No policy data</div>
          )}
        </div>

        {/* Action items due soonest */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-[#0A1628] font-medium text-sm">Upcoming Action Items</h2>
              <p className="text-slate-400 text-xs mt-0.5">Next {dueItems.length} due</p>
            </div>
            <button onClick={() => onTabChange("Action Items")} className="text-[#C9A84C] text-xs hover:underline">View all →</button>
          </div>
          {dueItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">All clear</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {dueItems.map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-start gap-3">
                  <span className={`mt-0.5 text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${PRIORITY_COLORS[item.priority] ?? "text-slate-500 bg-slate-100"}`}>
                    {item.priority.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[#0A1628] text-xs font-medium truncate">{item.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-slate-400 text-[10px]">{item.clients?.name ?? "—"}</p>
                      <span className="text-slate-200">·</span>
                      <p className="text-slate-400 text-[10px]">{fmtDate(item.due_date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Goals tracker ── */}
      {goals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-[#0A1628] font-medium text-sm">2026 Goals</h2>
              <p className="text-slate-400 text-xs mt-0.5">Click any target to edit</p>
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Progress vs. target</span>
          </div>
          <div className="p-6 grid grid-cols-2 gap-x-10 gap-y-6">
            {goals.map((goal) => {
              const current  = currentValues[goal.metric] ?? 0;
              const pct      = Math.min(100, Math.round((current / goal.target) * 100));
              const isEditing = editingGoal === goal.id;
              const isMoney  = ["Annual Premium Revenue", "Total Death Benefit"].includes(goal.metric);

              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[#0A1628] text-sm font-medium">{goal.metric}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                        pct >= 100 ? "bg-green-50 text-green-600"
                        : pct >= 60 ? "bg-amber-50 text-amber-600"
                        : "bg-slate-100 text-slate-500"
                      }`}>{pct}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="text-[#0A1628] font-semibold">{isMoney ? fmtFull(current) : current}</span>
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
                          <button onClick={() => saveGoal(goal)} disabled={savingGoal} className="text-[#C9A84C] font-semibold">✓</button>
                          <button onClick={() => setEditingGoal(null)} className="text-slate-400">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingGoal(goal.id); setEditValue(String(goal.target)); }}
                          className="text-slate-400 hover:text-[#C9A84C] transition-colors hover:underline underline-offset-2"
                        >
                          {isMoney ? fmtFull(goal.target) : goal.target} target
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 100 ? "#34d399" : pct >= 60 ? "#C9A84C" : "#60a5fa",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
