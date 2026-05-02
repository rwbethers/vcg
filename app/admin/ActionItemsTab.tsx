"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ActionItem {
  id: string;
  client_id: string;
  label: string;
  due_date: string;
  priority: string;
  completed: boolean;
  clients?: { name: string };
}

interface Client { id: string; name: string; }

interface Props {
  actionItems: ActionItem[];
  clients: Client[];
}

const priorities = ["High", "Medium", "Low"];
const priorityColors: Record<string, string> = {
  High:   "bg-red-50 text-red-600",
  Medium: "bg-amber-50 text-amber-600",
  Low:    "bg-slate-100 text-slate-500",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(due: string) {
  return new Date(due) < new Date() ;
}

export default function ActionItemsTab({ actionItems: initial, clients }: Props) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<"Pending" | "Completed" | "All">("Pending");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_id: "", label: "", due_date: "", priority: "Medium" });
  const [saving, setSaving] = useState(false);

  const displayed = items.filter((i) => {
    if (filter === "Pending") return !i.completed;
    if (filter === "Completed") return i.completed;
    return true;
  });

  // Group by client name
  const grouped = displayed.reduce<Record<string, ActionItem[]>>((acc, item) => {
    const name = item.clients?.name ?? "Unknown";
    (acc[name] = acc[name] || []).push(item);
    return acc;
  }, {});

  const toggleComplete = async (item: ActionItem) => {
    const supabase = createClient();
    await supabase.from("action_items").update({ completed: !item.completed }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, completed: !i.completed } : i));
  };

  const deleteItem = async (id: string) => {
    const supabase = createClient();
    await supabase.from("action_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAdd = async () => {
    if (!form.client_id || !form.label || !form.due_date) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase.from("action_items")
      .insert({ ...form, completed: false })
      .select("*, clients(name)")
      .single();
    if (data) setItems((prev) => [data, ...prev]);
    setForm({ client_id: "", label: "", due_date: "", priority: "Medium" });
    setShowForm(false);
    setSaving(false);
  };

  const pending = items.filter((i) => !i.completed).length;
  const overdue = items.filter((i) => !i.completed && isOverdue(i.due_date)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#0A1628]">Action Items</h1>
          <p className="text-slate-400 text-sm mt-1">
            {pending} pending · {overdue > 0 && <span className="text-red-500">{overdue} overdue · </span>}{items.filter(i => i.completed).length} completed
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] text-xs font-semibold px-5 py-2.5 rounded-xl tracking-widest uppercase transition-colors"
        >
          + Add Item
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["Pending", "Completed", "All"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              filter === f ? "bg-white shadow-sm text-[#0A1628]" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f}
            <span className="ml-1.5 text-[10px] opacity-60">
              ({f === "Pending" ? items.filter(i => !i.completed).length
                : f === "Completed" ? items.filter(i => i.completed).length
                : items.length})
            </span>
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#C9A84C]/30">
          <h3 className="text-[#0A1628] font-medium text-sm mb-4">New Action Item</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Client</label>
              <select value={form.client_id} onChange={(e) => setForm(p => ({ ...p, client_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]">
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]">
                {priorities.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Task</label>
              <input value={form.label} onChange={(e) => setForm(p => ({ ...p, label: e.target.value }))}
                placeholder="e.g. Schedule annual policy review call"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Due Date</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm(p => ({ ...p, due_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-slate-500 text-xs font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={handleAdd} disabled={!form.client_id || !form.label || !form.due_date || saving}
              className="px-5 py-2.5 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] rounded-xl text-xs font-semibold uppercase tracking-widest disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Add Item"}
            </button>
          </div>
        </div>
      )}

      {/* Items grouped by client */}
      {Object.entries(grouped).length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
          <p className="text-3xl mb-3">✓</p>
          <p className="text-slate-500 text-sm font-medium">
            {filter === "Completed" ? "No completed items" : "All caught up"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([clientName, clientItems]) => (
            <div key={clientName} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-3.5 border-b border-gray-100 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#C9A84C] text-[9px] font-semibold">
                    {clientName.split(" ").map(w => w[0]).slice(0, 2).join("")}
                  </span>
                </div>
                <span className="text-[#0A1628] text-sm font-medium">{clientName}</span>
                <span className="text-slate-400 text-xs">({clientItems.length})</span>
              </div>
              <div className="divide-y divide-gray-50">
                {clientItems.map((item) => (
                  <div key={item.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-[#FAFBFC] transition-colors">
                    <button
                      onClick={() => toggleComplete(item)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.completed ? "bg-green-400 border-green-400" : "border-gray-300 hover:border-[#C9A84C]"
                      }`}
                    >
                      {item.completed && <span className="text-white text-[10px]">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.completed ? "line-through text-slate-400" : "text-[#0A1628]"}`}>{item.label}</p>
                      <p className={`text-xs mt-0.5 ${isOverdue(item.due_date) && !item.completed ? "text-red-500" : "text-slate-400"}`}>
                        {isOverdue(item.due_date) && !item.completed ? "Overdue · " : ""}Due {fmtDate(item.due_date)}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${priorityColors[item.priority] ?? "bg-slate-100 text-slate-500"}`}>
                      {item.priority}
                    </span>
                    <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-400 text-lg leading-none transition-colors flex-shrink-0">×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
