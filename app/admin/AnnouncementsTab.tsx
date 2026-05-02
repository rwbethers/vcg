"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Announcement {
  id: string;
  message: string;
  type: string;
  active: boolean;
  created_at: string;
}

interface Props { announcements: Announcement[]; }

const types = ["info", "success", "warning"];
const typeStyles: Record<string, { bg: string; text: string; icon: string }> = {
  info:    { bg: "bg-blue-50",   text: "text-blue-700",  icon: "ℹ️" },
  success: { bg: "bg-green-50",  text: "text-green-700", icon: "✓" },
  warning: { bg: "bg-amber-50",  text: "text-amber-700", icon: "⚠" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AnnouncementsTab({ announcements: initial }: Props) {
  const [items, setItems] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ message: "", type: "info" });
  const [saving, setSaving] = useState(false);

  const activeCount = items.filter(a => a.active).length;

  const handleAdd = async () => {
    if (!form.message) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase.from("announcements").insert({ ...form, active: true }).select().single();
    if (data) setItems(prev => [data, ...prev]);
    setForm({ message: "", type: "info" });
    setShowForm(false);
    setSaving(false);
  };

  const toggleActive = async (item: Announcement) => {
    const supabase = createClient();
    await supabase.from("announcements").update({ active: !item.active }).eq("id", item.id);
    setItems(prev => prev.map(a => a.id === item.id ? { ...a, active: !a.active } : a));
  };

  const deleteAnnouncement = async (id: string) => {
    const supabase = createClient();
    await supabase.from("announcements").delete().eq("id", id);
    setItems(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#0A1628]">Announcements</h1>
          <p className="text-slate-400 text-sm mt-1">
            {activeCount} active · clients see these as a banner when they log in
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] text-xs font-semibold px-5 py-2.5 rounded-xl tracking-widest uppercase transition-colors"
        >
          + New Announcement
        </button>
      </div>

      {/* Preview of what clients see */}
      {activeCount > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">Client Preview — Most Recent Active</p>
          {items.filter(a => a.active).slice(0, 1).map(a => {
            const style = typeStyles[a.type] ?? typeStyles.info;
            return (
              <div key={a.id} className={`${style.bg} ${style.text} rounded-xl px-5 py-3.5 flex items-center gap-3 text-sm`}>
                <span className="text-lg flex-shrink-0">{style.icon}</span>
                <p>{a.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#C9A84C]/30">
          <h3 className="text-[#0A1628] font-medium text-sm mb-4">New Announcement</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Message</label>
              <textarea value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                rows={2} placeholder="e.g. Our office is closed December 25–26. Happy holidays from the VCG team."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] resize-none" />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-2">Type</label>
              <div className="flex gap-2">
                {types.map((t) => {
                  const style = typeStyles[t];
                  return (
                    <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        form.type === t ? `${style.bg} ${style.text} border-current` : "border-gray-200 text-slate-500 hover:border-gray-300"
                      }`}>
                      <span>{style.icon}</span> {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-slate-500 text-xs font-medium">Cancel</button>
            <button onClick={handleAdd} disabled={!form.message || saving}
              className="px-5 py-2.5 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] rounded-xl text-xs font-semibold uppercase tracking-widest disabled:opacity-50">
              {saving ? "Saving…" : "Publish"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
          <p className="text-3xl mb-3">📢</p>
          <p className="text-slate-500 text-sm font-medium">No announcements yet</p>
          <p className="text-slate-400 text-xs mt-1">Create one to show a banner to all clients when they log in.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
          {items.map((item) => {
            const style = typeStyles[item.type] ?? typeStyles.info;
            return (
              <div key={item.id} className={`px-6 py-4 flex items-start gap-4 ${!item.active ? "opacity-50" : ""}`}>
                <span className="text-xl mt-0.5 flex-shrink-0">{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#0A1628] text-sm">{item.message}</p>
                  <p className="text-slate-400 text-xs mt-1">{fmtDate(item.created_at)} · {item.type}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(item)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                      item.active
                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-gray-50 hover:text-slate-500 hover:border-gray-200"
                        : "bg-gray-50 text-slate-500 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                    }`}>
                    {item.active ? "Active" : "Inactive"}
                  </button>
                  <button onClick={() => deleteAnnouncement(item.id)}
                    className="text-slate-300 hover:text-red-400 text-lg leading-none transition-colors">×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
