"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Deal {
  id: string;
  title: string;
  asset_class: string;
  description: string;
  target_return: string;
  minimum_investment: number;
  term: string;
  status: string;
  location: string;
  sponsor: string;
  image_url: string;
}

interface Props { deals: Deal[]; }

const assetClasses = ["Real Estate", "Private Equity", "Private Credit", "Equities"];
const statuses = ["Accepting Interest", "Coming Soon", "Closed"];
const fmt = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const statusColors: Record<string, string> = {
  "Accepting Interest": "bg-green-50 text-green-700",
  "Coming Soon":        "bg-amber-50 text-amber-600",
  "Closed":             "bg-gray-100 text-gray-500",
};

const blank = {
  title: "", asset_class: "Real Estate", description: "", target_return: "",
  minimum_investment: 0, term: "", status: "Accepting Interest",
  location: "", sponsor: "Vision Capital Group", image_url: "",
};

export default function DealManagerTab({ deals: initial }: Props) {
  const [deals, setDeals] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Omit<Deal, "id">>(blank);
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState("All");

  const displayed = filterClass === "All" ? deals : deals.filter(d => d.asset_class === filterClass);

  const startEdit = (deal: Deal) => {
    setEditingId(deal.id);
    const { id, ...rest } = deal;
    setForm(rest);
    setShowAdd(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    if (editingId) {
      await supabase.from("deals").update(form).eq("id", editingId);
      setDeals(prev => prev.map(d => d.id === editingId ? { ...d, ...form } : d));
      setEditingId(null);
    } else {
      const { data } = await supabase.from("deals").insert(form).select().single();
      if (data) setDeals(prev => [...prev, data]);
      setShowAdd(false);
    }
    setForm(blank);
    setSaving(false);
  };

  const toggleStatus = async (deal: Deal) => {
    const newStatus = deal.status === "Accepting Interest" ? "Closed" : "Accepting Interest";
    const supabase = createClient();
    await supabase.from("deals").update({ status: newStatus }).eq("id", deal.id);
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: newStatus } : d));
  };

  const isEditing = (id: string) => editingId === id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#0A1628]">Deal Manager</h1>
          <p className="text-slate-400 text-sm mt-1">{deals.length} deals · {deals.filter(d => d.status === "Accepting Interest").length} accepting interest</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm(blank); }}
          className="bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] text-xs font-semibold px-5 py-2.5 rounded-xl tracking-widest uppercase transition-colors"
        >
          + New Deal
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["All", ...assetClasses].map((cls) => (
          <button key={cls} onClick={() => setFilterClass(cls)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              filterClass === cls ? "bg-[#C9A84C] text-[#0A1628]" : "bg-white border border-gray-200 text-slate-500 hover:border-[#C9A84C]"
            }`}>
            {cls}
          </button>
        ))}
      </div>

      {/* Add / Edit Form */}
      {(showAdd || editingId) && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#C9A84C]/30">
          <h3 className="text-[#0A1628] font-medium text-sm mb-5">{editingId ? "Edit Deal" : "New Deal"}</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Title", key: "title", placeholder: "Sunbelt Multifamily Fund IV" },
              { label: "Location", key: "location", placeholder: "Austin, TX · Phoenix, AZ" },
              { label: "Target Return", key: "target_return", placeholder: "14–18% IRR" },
              { label: "Term", key: "term", placeholder: "5 years" },
              { label: "Image URL", key: "image_url", placeholder: "https://images.unsplash.com/…" },
              { label: "Sponsor", key: "sponsor", placeholder: "Vision Capital Group" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">{label}</label>
                <input value={(form as any)[key]} onChange={(e) => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]" />
              </div>
            ))}
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Asset Class</label>
              <select value={form.asset_class} onChange={(e) => setForm(p => ({ ...p, asset_class: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]">
                {assetClasses.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]">
                {statuses.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Minimum Investment ($)</label>
              <input type="number" value={form.minimum_investment}
                onChange={(e) => setForm(p => ({ ...p, minimum_investment: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => { setShowAdd(false); setEditingId(null); }}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-slate-500 text-xs font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={!form.title || saving}
              className="px-5 py-2.5 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] rounded-xl text-xs font-semibold uppercase tracking-widest disabled:opacity-50">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Deal"}
            </button>
          </div>
        </div>
      )}

      {/* Deal list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F4F5F7] border-b border-gray-100">
              {["Deal", "Asset Class", "Min. Investment", "Target Return", "Term", "Status", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayed.map((deal) => (
              <tr key={deal.id} className={`hover:bg-[#FAFBFC] transition-colors ${isEditing(deal.id) ? "bg-[#C9A84C]/5" : ""}`}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {deal.image_url && (
                      <img src={deal.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-[#0A1628] text-sm font-medium">{deal.title}</p>
                      {deal.location && <p className="text-slate-400 text-xs mt-0.5">{deal.location}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600 text-sm">{deal.asset_class}</td>
                <td className="px-5 py-4 text-[#C9A84C] text-sm font-semibold">{fmt(deal.minimum_investment)}</td>
                <td className="px-5 py-4 text-slate-600 text-sm">{deal.target_return}</td>
                <td className="px-5 py-4 text-slate-500 text-sm">{deal.term}</td>
                <td className="px-5 py-4">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${statusColors[deal.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {deal.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(deal)}
                      className="text-xs text-slate-400 hover:text-[#C9A84C] transition-colors px-2.5 py-1 border border-gray-200 rounded-lg hover:border-[#C9A84C]">
                      Edit
                    </button>
                    <button onClick={() => toggleStatus(deal)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                        deal.status === "Accepting Interest"
                          ? "border-gray-200 text-slate-400 hover:border-red-200 hover:text-red-400"
                          : "border-gray-200 text-slate-400 hover:border-green-200 hover:text-green-600"
                      }`}>
                      {deal.status === "Accepting Interest" ? "Close" : "Open"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
