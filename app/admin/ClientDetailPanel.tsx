"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Client {
  id: string;
  name: string;
  email: string;
  type: string;
  advisor: string;
  member_since: string;
  state: string;
}

interface Policy {
  id: string;
  policy_number: string;
  carrier: string;
  product_name: string;
  product_type: string;
  face_amount: number;
  cash_value: number;
  annual_premium: number;
  status: string;
}

interface ActionItem {
  id: string;
  label: string;
  due_date: string;
  priority: string;
  completed: boolean;
}

interface Document {
  id: string;
  file_name: string;
  category: string;
  uploaded_by: string;
  created_at: string;
}

interface DealInterest {
  id: string;
  deal_title: string;
  asset_class: string;
  created_at: string;
}

interface Props {
  client: Client;
  onClose: () => void;
}

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const priorityColors: Record<string, string> = {
  High: "bg-red-50 text-red-600",
  Medium: "bg-amber-50 text-amber-600",
  Low: "bg-slate-100 text-slate-500",
};

export default function ClientDetailPanel({ client, onClose }: Props) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [dealInterests, setDealInterests] = useState<DealInterest[]>([]);
  const [loading, setLoading] = useState(true);

  const tabs = ["Overview", "Policies", "Action Items", "Documents", "Deal Interests"];

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("policies").select("*").eq("client_id", client.id),
      supabase.from("action_items").select("*").eq("client_id", client.id).order("due_date"),
      supabase.from("documents").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
      supabase.from("deal_interest").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
    ]).then(([p, a, d, di]) => {
      setPolicies(p.data ?? []);
      setActionItems(a.data ?? []);
      setDocuments(d.data ?? []);
      setDealInterests(di.data ?? []);
      setLoading(false);
    });
  }, [client.id]);

  const totalCV = policies.reduce((s, p) => s + (p.cash_value || 0), 0);
  const totalDB = policies.reduce((s, p) => s + (p.face_amount || 0), 0);
  const totalPremium = policies.reduce((s, p) => s + (p.annual_premium || 0), 0);
  const pendingItems = actionItems.filter(a => !a.completed).length;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-xl h-full flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-[#0A1628] px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full border border-[#C9A84C] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#C9A84C] text-sm font-semibold">
                    {client.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium text-lg leading-tight">{client.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{client.advisor} · {client.type}</p>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none mt-1">×</button>
          </div>
          <div className="flex gap-1 mt-4">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  activeTab === t ? "bg-[#C9A84C] text-[#0A1628]" : "text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Overview */}
              {activeTab === "Overview" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total Death Benefit", value: fmt(totalDB) },
                      { label: "Total Cash Value",    value: fmt(totalCV) },
                      { label: "Annual Premiums",     value: fmt(totalPremium) },
                      { label: "Pending Tasks",       value: String(pendingItems) },
                    ].map((m) => (
                      <div key={m.label} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">{m.label}</p>
                        <p className="text-[#0A1628] text-lg font-semibold">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                    {[
                      { label: "Email",         value: client.email },
                      { label: "State",         value: client.state },
                      { label: "Member Since",  value: client.member_since },
                      { label: "Policies",      value: String(policies.length) },
                      { label: "Deal Interests",value: String(dealInterests.length) },
                      { label: "Documents",     value: String(documents.length) },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-400">{row.label}</span>
                        <span className="text-[#0A1628] font-medium">{row.value || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Policies */}
              {activeTab === "Policies" && (
                <div className="space-y-3">
                  {policies.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-12">No policies on file</p>
                  ) : policies.map((p) => (
                    <div key={p.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[#0A1628] text-sm font-medium">{p.product_name}</p>
                          <p className="text-slate-400 text-xs">{p.carrier} · #{p.policy_number}</p>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                          p.status === "Active" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"
                        }`}>{p.status}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {[
                          { label: "Face Amount", value: fmt(p.face_amount) },
                          { label: "Cash Value",  value: fmt(p.cash_value) },
                          { label: "Premium/yr",  value: fmt(p.annual_premium) },
                        ].map((m) => (
                          <div key={m.label} className="bg-white rounded-lg p-2.5 text-center">
                            <p className="text-slate-400 text-[9px] uppercase tracking-widest">{m.label}</p>
                            <p className="text-[#0A1628] font-semibold mt-0.5">{m.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Items */}
              {activeTab === "Action Items" && (
                <div className="space-y-2">
                  {actionItems.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-12">No action items</p>
                  ) : actionItems.map((item) => (
                    <div key={item.id} className={`flex items-center gap-3 p-3.5 rounded-xl border ${
                      item.completed ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200"
                    }`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        item.completed ? "bg-green-400 border-green-400" : "border-gray-300"
                      }`}>
                        {item.completed && <span className="text-white text-[8px]">✓</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${item.completed ? "line-through text-slate-400" : "text-[#0A1628]"}`}>{item.label}</p>
                        <p className="text-slate-400 text-xs mt-0.5">Due {fmtDate(item.due_date)}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityColors[item.priority]}`}>{item.priority}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Documents */}
              {activeTab === "Documents" && (
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-12">No documents</p>
                  ) : documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl">
                      <span className="text-lg">{doc.uploaded_by === "client" ? "✍️" : "📄"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#0A1628] text-sm font-medium truncate">{doc.file_name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{doc.category} · {fmtDate(doc.created_at)}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        doc.uploaded_by === "client" ? "bg-blue-50 text-blue-600" : "bg-[#C9A84C]/10 text-[#C9A84C]"
                      }`}>
                        {doc.uploaded_by === "client" ? "From Client" : "From Advisor"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Deal Interests */}
              {activeTab === "Deal Interests" && (
                <div className="space-y-2">
                  {dealInterests.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-12">No deal interest submissions</p>
                  ) : dealInterests.map((di) => (
                    <div key={di.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[#0A1628] text-sm font-medium">{di.deal_title}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{fmtDate(di.created_at)}</p>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] font-medium">{di.asset_class}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
