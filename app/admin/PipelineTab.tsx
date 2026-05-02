"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Client {
  id: string;
  name: string;
  email: string;
  advisor: string;
  type: string;
  stage: string;
  member_since: string;
  created_at?: string;
}

interface Task {
  id: string;
  client_id: string;
  label: string;
  category: string;
  sort_order: number;
  completed: boolean;
  completed_at: string | null;
}

const PROSPECT_TASKS = [
  { label: "Initial contact made",       category: "Outreach",     sort_order: 1 },
  { label: "Discovery call completed",   category: "Outreach",     sort_order: 2 },
  { label: "Needs analysis done",        category: "Analysis",     sort_order: 3 },
  { label: "Illustration prepared",      category: "Presentation", sort_order: 4 },
  { label: "Demo delivered",             category: "Presentation", sort_order: 5 },
  { label: "Follow-up sent",             category: "Follow-up",    sort_order: 6 },
  { label: "Proposal submitted",         category: "Follow-up",    sort_order: 7 },
];

const UNDERWRITING_TASKS = [
  { label: "Application signed",               category: "Application",  sort_order: 1 },
  { label: "Medical exam scheduled",           category: "Medical",      sort_order: 2 },
  { label: "Medical exam completed",           category: "Medical",      sort_order: 3 },
  { label: "Blood / lab work submitted",       category: "Medical",      sort_order: 4 },
  { label: "APS requested from physician",     category: "Medical",      sort_order: 5 },
  { label: "APS received",                     category: "Medical",      sort_order: 6 },
  { label: "Submitted to carrier",             category: "Underwriting", sort_order: 7 },
  { label: "Underwriting decision received",   category: "Underwriting", sort_order: 8 },
  { label: "Policy issued",                    category: "Policy",       sort_order: 9 },
  { label: "Delivery receipt signed",          category: "Policy",       sort_order: 10 },
  { label: "First premium collected",          category: "Policy",       sort_order: 11 },
  { label: "Portal account activated",         category: "Onboarding",   sort_order: 12 },
];

const advisors = ["Stephen Mongie", "Samuel Noel", "Zach McGlothin"];

const stageConfig = {
  prospect:     { label: "Prospects",    color: "text-blue-600",  dot: "bg-blue-500",  bg: "bg-blue-50",  border: "border-blue-200"  },
  underwriting: { label: "Underwriting", color: "text-amber-600", dot: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-200" },
  client:       { label: "Clients",      color: "text-green-600", dot: "bg-green-500", bg: "bg-green-50", border: "border-green-200" },
};

const categoryOrder = ["Outreach", "Analysis", "Presentation", "Follow-up", "Application", "Medical", "Underwriting", "Policy", "Onboarding"];

function daysInStage(createdAt?: string) {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

export default function PipelineTab({ clients: initialClients }: { clients: Client[] }) {
  const [clients, setClients] = useState(initialClients.filter(c => ["prospect", "underwriting", "client"].includes(c.stage ?? "client")));
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [panel, setPanel] = useState<Client | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", advisor: "Stephen Mongie", type: "Individual" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("underwriting_tasks").select("*").order("sort_order").then(({ data }) => {
      if (!data) return;
      const map: Record<string, Task[]> = {};
      data.forEach(t => { (map[t.client_id] = map[t.client_id] || []).push(t); });
      setTasks(map);
    });
  }, []);

  const grouped = {
    prospect:     clients.filter(c => c.stage === "prospect"),
    underwriting: clients.filter(c => c.stage === "underwriting"),
    client:       clients.filter(c => c.stage === "client"),
  };

  const clientTasks = panel ? (tasks[panel.id] ?? []) : [];
  const completed = clientTasks.filter(t => t.completed).length;
  const pct = clientTasks.length > 0 ? Math.round((completed / clientTasks.length) * 100) : 0;

  const grouped_tasks = categoryOrder.reduce<Record<string, Task[]>>((acc, cat) => {
    const items = clientTasks.filter(t => t.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const toggleTask = async (task: Task) => {
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase.from("underwriting_tasks")
      .update({ completed: !task.completed, completed_at: !task.completed ? now : null })
      .eq("id", task.id);
    setTasks(prev => ({
      ...prev,
      [task.client_id]: (prev[task.client_id] ?? []).map(t =>
        t.id === task.id ? { ...t, completed: !t.completed, completed_at: !t.completed ? now : null } : t
      ),
    }));
  };

  const moveToStage = async (client: Client, newStage: string) => {
    if (client.stage === newStage) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("clients").update({ stage: newStage }).eq("id", client.id);

    if (newStage === "underwriting") {
      const existing = tasks[client.id] ?? [];
      const hasUnderwriting = existing.some(t => t.category === "Application");
      if (!hasUnderwriting) {
        const newTasks = UNDERWRITING_TASKS.map(t => ({ ...t, client_id: client.id, completed: false }));
        const { data } = await supabase.from("underwriting_tasks").insert(newTasks).select();
        if (data) {
          setTasks(prev => ({ ...prev, [client.id]: [...(prev[client.id] ?? []), ...data] }));
        }
      }
    }

    setClients(prev => prev.map(c => c.id === client.id ? { ...c, stage: newStage } : c));
    setPanel(prev => prev?.id === client.id ? { ...prev, stage: newStage } : prev);
    setSaving(false);
  };

  const handleAddProspect = async () => {
    if (!addForm.name || !addForm.email) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: dbErr } = await supabase.from("clients").insert({
      name: addForm.name,
      email: addForm.email,
      advisor: addForm.advisor,
      type: addForm.type,
      stage: "prospect",
      member_since: new Date().getFullYear().toString(),
      state: "",
    }).select().single();

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    if (data) {
      const newTasks = PROSPECT_TASKS.map(t => ({ ...t, client_id: data.id, completed: false }));
      const { data: taskData } = await supabase.from("underwriting_tasks").insert(newTasks).select();
      if (taskData) setTasks(prev => ({ ...prev, [data.id]: taskData }));
      setClients(prev => [data, ...prev]);

      // Send portal invite email
      await fetch("/api/invite-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addForm.email, name: addForm.name }),
      });
    }
    setAddForm({ name: "", email: "", advisor: "Stephen Mongie", type: "Individual" });
    setShowAdd(false);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#0A1628]">Client Pipeline</h1>
          <p className="text-slate-400 text-sm mt-1">
            {grouped.prospect.length} prospects · {grouped.underwriting.length} in underwriting · {grouped.client.length} active clients
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] text-xs font-semibold px-5 py-2.5 rounded-xl tracking-widest uppercase transition-colors">
          + Add Prospect
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#C9A84C]/30">
          <h3 className="text-[#0A1628] font-medium text-sm mb-4">New Prospect</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Full Name", key: "name", placeholder: "John Smith" },
              { label: "Email", key: "email", placeholder: "john@example.com" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">{label}</label>
                <input value={(addForm as any)[key]} onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]" />
              </div>
            ))}
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Advisor</label>
              <select value={addForm.advisor} onChange={e => setAddForm(p => ({ ...p, advisor: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]">
                {advisors.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Type</label>
              <select value={addForm.type} onChange={e => setAddForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]">
                {["Individual", "Individual / Trust", "Individual / Plan", "Business"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-slate-500 text-xs font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={handleAddProspect} disabled={!addForm.name || !addForm.email || saving}
              className="px-5 py-2.5 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] rounded-xl text-xs font-semibold uppercase tracking-widest disabled:opacity-50">
              {saving ? "Adding…" : "Add Prospect"}
            </button>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="grid grid-cols-3 gap-5">
        {(["prospect", "underwriting", "client"] as const).map(stage => {
          const cfg = stageConfig[stage];
          const stageClients = grouped[stage];
          return (
            <div key={stage} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
                <span className={`text-xs font-semibold uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                <span className="ml-auto text-xs text-slate-400 font-medium">{stageClients.length}</span>
              </div>
              <div className="space-y-2">
                {stageClients.map(client => {
                  const clientTaskList = tasks[client.id] ?? [];
                  const done = clientTaskList.filter(t => t.completed).length;
                  const total = clientTaskList.length;
                  const days = daysInStage(client.created_at);
                  return (
                    <div key={client.id} onClick={() => setPanel(client)}
                      className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-all ${panel?.id === client.id ? "border-[#C9A84C]" : "border-gray-100"}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                          <span className="text-[#C9A84C] text-[10px] font-semibold">
                            {client.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#0A1628] text-sm font-medium truncate">{client.name}</p>
                          <p className="text-slate-400 text-xs">{client.advisor.split(" ")[1]}</p>
                        </div>
                      </div>
                      {total > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>{done}/{total} tasks</span>
                            <span>{Math.round((done / total) * 100)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${stage === "underwriting" ? "bg-amber-400" : "bg-blue-400"}`}
                              style={{ width: `${Math.round((done / total) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                      {days > 0 && <p className="text-slate-300 text-[10px] mt-2">{days}d in stage</p>}
                    </div>
                  );
                })}
                {stageClients.length === 0 && (
                  <div className={`rounded-xl border-2 border-dashed ${cfg.border} p-6 text-center`}>
                    <p className="text-slate-400 text-xs">No {cfg.label.toLowerCase()}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Side panel */}
      {panel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-end" onClick={() => setPanel(null)}>
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Panel header */}
            <div className="bg-[#0A1628] px-6 py-5 flex-shrink-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-[#C9A84C] flex items-center justify-center">
                    <span className="text-[#C9A84C] text-sm font-semibold">
                      {panel.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{panel.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{panel.advisor} · {panel.type}</p>
                  </div>
                </div>
                <button onClick={() => setPanel(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
              </div>
              <div className="flex items-center gap-2">
                {(() => { const cfg = stageConfig[panel.stage as keyof typeof stageConfig]; return (
                  <span className={`text-[10px] px-3 py-1 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                );})()}
                <span className="text-slate-400 text-xs">{panel.email}</span>
              </div>
              {clientTasks.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>{completed}/{clientTasks.length} complete</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#1a3060] rounded-full overflow-hidden">
                    <div className="h-full bg-[#C9A84C] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="flex-1 p-5 space-y-5">
              {Object.entries(grouped_tasks).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">{cat}</p>
                  <div className="space-y-1.5">
                    {items.map(task => (
                      <div key={task.id} onClick={() => toggleTask(task)}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.completed ? "bg-green-400 border-green-400" : "border-gray-300 hover:border-[#C9A84C]"}`}>
                          {task.completed && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        <span className={`text-sm flex-1 ${task.completed ? "line-through text-slate-400" : "text-[#0A1628]"}`}>
                          {task.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {clientTasks.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">No checklist for this stage</p>
              )}
            </div>

            {/* Stage selector */}
            <div className="p-5 border-t border-gray-100 flex-shrink-0">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Move to Stage</p>
              <div className="grid grid-cols-3 gap-2">
                {(["prospect", "underwriting", "client"] as const).map(stage => {
                  const cfg = stageConfig[stage];
                  const isActive = panel.stage === stage;
                  return (
                    <button key={stage} onClick={() => moveToStage(panel, stage)} disabled={saving || isActive}
                      className={`py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all border ${
                        isActive
                          ? `${cfg.bg} ${cfg.color} ${cfg.border} cursor-default`
                          : "bg-gray-50 text-slate-400 border-gray-100 hover:border-[#C9A84C] hover:text-[#0A1628]"
                      }`}>
                      {isActive ? "✓ " : ""}{cfg.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-slate-400 text-[10px] text-center mt-2">
                {saving ? "Updating…" : "Changes portal access immediately"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
