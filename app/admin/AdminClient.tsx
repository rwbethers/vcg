"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MarketingTab from "./MarketingTab";

// ── Static client display data ──────────────────────────────
const clientRows = [
  { name: "Jeffrey Adams", type: "Individual", advisor: "Stephen Mongie", deathBenefit: "$2,615,225", cashValue: "$136,016", premiums: "$15,000", policies: 2, products: "Whole Life, Term", status: "Active" },
  { name: "Elisabeth Andelin", type: "Individual / Trust", advisor: "Stephen Mongie", deathBenefit: "$7,384,336", cashValue: "$197,954", premiums: "$69,751", policies: 2, products: "Whole Life, FIUL", status: "Active" },
  { name: "J. Brandt Anderson", type: "Individual / Plan", advisor: "Stephen Mongie", deathBenefit: "—", cashValue: "—", premiums: "—", policies: 2, products: "Term (Lapsed), VUL", status: "Under Review" },
  { name: "Dallin Anderson", type: "Individual", advisor: "Samuel Noel", deathBenefit: "—", cashValue: "—", premiums: "—", policies: 1, products: "IUL (Lapsed)", status: "Under Review" },
  { name: "Elizabeth Anderson", type: "Individual", advisor: "Samuel Noel", deathBenefit: "—", cashValue: "—", premiums: "—", policies: 0, products: "—", status: "Active" },
  { name: "Gary Applegate", type: "Individual", advisor: "Zach McGlothin", deathBenefit: "—", cashValue: "—", premiums: "—", policies: 0, products: "Application Pending", status: "Work in Progress" },
  { name: "Shane Atkinson", type: "Individual", advisor: "Zach McGlothin", deathBenefit: "—", cashValue: "—", premiums: "—", policies: 0, products: "Annuity (Keyport)", status: "Under Review" },
  { name: "Teresa Auvaa", type: "Individual", advisor: "Stephen Mongie", deathBenefit: "$1,000,000", cashValue: "—", premiums: "$397", policies: 1, products: "Term", status: "Active" },
  { name: "Tui Auvaa", type: "Individual", advisor: "Stephen Mongie", deathBenefit: "$3,039,132", cashValue: "$325", premiums: "$15,871", policies: 1, products: "Whole Life", status: "Active" },
];

const STAGES = ["Prospect", "Contacted", "Meeting Set", "Proposal Sent", "Closed Won"];

const stageColors: Record<string, string> = {
  "Prospect":      "bg-slate-100 text-slate-600",
  "Contacted":     "bg-blue-50 text-blue-700",
  "Meeting Set":   "bg-purple-50 text-purple-700",
  "Proposal Sent": "bg-amber-50 text-amber-700",
  "Closed Won":    "bg-green-50 text-green-700",
};

const sourceColors: Record<string, string> = {
  "Referral":      "bg-[#C9A84C]/10 text-[#C9A84C]",
  "Website":       "bg-blue-50 text-blue-600",
  "Event":         "bg-purple-50 text-purple-600",
  "Cold Outreach": "bg-slate-100 text-slate-600",
};

const docCategories = ["Statement", "Illustration", "Policy Document", "Tax Document", "Other"];

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  stage: string;
  assigned_to: string | null;
  potential_premium: number;
  notes: string | null;
  created_at: string;
}

interface DealInterest {
  id: string;
  client_name: string;
  deal_title: string;
  asset_class: string;
  created_at: string;
}

interface SupabaseClient { id: string; name: string; }

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function AdminClient({ adminEmail }: { adminEmail: string }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const tabs = ["Overview", "Pipeline", "Clients", "Deal Interests", "Marketing", "Documents"];

  // Pipeline state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", source: "Referral", assigned_to: "", potential_premium: "", notes: "" });
  const [addingLead, setAddingLead] = useState(false);

  // Deal interests
  const [dealInterests, setDealInterests] = useState<DealInterest[]>([]);

  // Clients tab
  const [search, setSearch] = useState("");
  const [filterAdvisor, setFilterAdvisor] = useState("All");

  // Documents tab
  const [supabaseClients, setSupabaseClients] = useState<SupabaseClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [docCategory, setDocCategory] = useState("Statement");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docDragOver, setDocDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<"success" | "error" | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("leads").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setLeads(data);
    });
    supabase.from("deal_interest").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setDealInterests(data);
    });
    supabase.from("clients").select("id, name").order("name").then(({ data }) => {
      if (data) setSupabaseClients(data);
    });
  }, []);

  const advisors = ["All", "Stephen Mongie", "Samuel Noel", "Zach McGlothin"];
  const filtered = clientRows.filter((c) => {
    return c.name.toLowerCase().includes(search.toLowerCase()) &&
      (filterAdvisor === "All" || c.advisor === filterAdvisor);
  });

  const pipelineValue = leads
    .filter((l) => l.stage !== "Closed Won")
    .reduce((sum, l) => sum + (l.potential_premium || 0), 0);

  const handleStageChange = async (lead: Lead, newStage: string) => {
    const supabase = createClient();
    await supabase.from("leads").update({ stage: newStage, updated_at: new Date().toISOString() }).eq("id", lead.id);
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, stage: newStage } : l));
    if (selectedLead?.id === lead.id) setSelectedLead({ ...lead, stage: newStage });
  };

  const handleAddLead = async () => {
    if (!newLead.name) return;
    setAddingLead(true);
    const supabase = createClient();
    const { data } = await supabase.from("leads").insert({
      ...newLead,
      potential_premium: parseFloat(newLead.potential_premium) || 0,
    }).select().single();
    if (data) setLeads((prev) => [data, ...prev]);
    setNewLead({ name: "", email: "", phone: "", source: "Referral", assigned_to: "", potential_premium: "", notes: "" });
    setShowAddLead(false);
    setAddingLead(false);
  };

  const handleDocUpload = async () => {
    if (!docFile || !selectedClientId) return;
    setUploading(true);
    setUploadResult(null);
    const supabase = createClient();
    const path = `${selectedClientId}/advisor/${Date.now()}_${docFile.name}`;
    const { error: storageError } = await supabase.storage.from("client-documents").upload(path, docFile);
    if (!storageError) {
      const { error: dbError } = await supabase.from("documents").insert({
        client_id: selectedClientId,
        file_name: docFile.name,
        file_path: path,
        file_size: docFile.size,
        mime_type: docFile.type,
        category: docCategory,
        uploaded_by: "advisor",
        uploaded_by_name: adminEmail,
      });
      setUploadResult(dbError ? "error" : "success");
    } else {
      setUploadResult("error");
    }
    if (!storageError) setDocFile(null);
    setUploading(false);
    setTimeout(() => setUploadResult(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7]">

      {/* Top Bar */}
      <header className="bg-[#0A1628] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[#C9A84C] rounded-full flex items-center justify-center">
              <span className="text-[#C9A84C] text-xs">V</span>
            </div>
            <div>
              <span className="text-white text-sm font-light tracking-widest uppercase">Vision</span>
              <span className="text-[#C9A84C] text-[9px] tracking-widest uppercase ml-2">Consulting Group</span>
            </div>
          </div>
          <span className="text-[#1a3060] text-sm">|</span>
          <span className="text-slate-400 text-sm">Admin Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-500 text-xs">{adminEmail}</span>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-[#C9A84C] transition-colors px-3 py-1.5 border border-[#1a3060] rounded-lg hover:border-[#C9A84C]">
            Client View
          </Link>
          <form action="/auth/signout" method="POST">
            <button type="submit" className="text-slate-600 text-xs hover:text-slate-400 transition-colors">Sign out</button>
          </form>
        </div>
      </header>

      {/* Tab Nav */}
      <div className="bg-[#0d1e3a] border-b border-[#1a3060] px-8">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3.5 text-xs font-medium transition-all relative ${
                activeTab === tab
                  ? "text-[#C9A84C]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A84C]" />
              )}
              {tab === "Deal Interests" && dealInterests.length > 0 && (
                <span className="ml-1.5 bg-[#C9A84C] text-[#0A1628] text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {dealInterests.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-8 space-y-8">

        {/* ── OVERVIEW ── */}
        {activeTab === "Overview" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-light text-[#0A1628]">Good morning</h1>
              <p className="text-slate-400 text-sm mt-1">Here's what's happening across your book of business.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-5">
              {[
                { label: "Total Clients", value: "9", sub: "Active accounts", color: "border-[#C9A84C]", icon: "👥" },
                { label: "Annual Premiums", value: "$101,019", sub: "Across all policies", color: "border-blue-400", icon: "💰" },
                { label: "Pipeline Value", value: fmt(pipelineValue), sub: `${leads.filter(l => l.stage !== "Closed Won").length} active leads`, color: "border-purple-400", icon: "📈" },
                { label: "Deal Interests", value: String(dealInterests.length), sub: "Private market requests", color: "border-emerald-400", icon: "🏦" },
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

            {/* Secondary metrics */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Death Benefit", value: "$14,038,693" },
                { label: "Active Policies", value: "7" },
                { label: "Leads in Pipeline", value: String(leads.length) },
                { label: "Closed Won (YTD)", value: String(leads.filter(l => l.stage === "Closed Won").length) },
              ].map((m) => (
                <div key={m.label} className="bg-white rounded-xl p-4 shadow-sm text-center">
                  <p className="text-[#C9A84C] text-lg font-semibold">{m.value}</p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Deal Interests */}
            {dealInterests.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-[#0A1628] font-medium text-sm">Recent Deal Interests</h2>
                    <p className="text-slate-400 text-xs mt-0.5">Clients requesting more info on private market opportunities</p>
                  </div>
                  <button onClick={() => setActiveTab("Deal Interests")} className="text-[#C9A84C] text-xs hover:underline">View all →</button>
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

            {/* Pipeline snapshot */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-[#0A1628] font-medium text-sm">Pipeline Snapshot</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Lead distribution by stage</p>
                </div>
                <button onClick={() => setActiveTab("Pipeline")} className="text-[#C9A84C] text-xs hover:underline">Manage pipeline →</button>
              </div>
              <div className="px-6 py-5 grid grid-cols-5 gap-3">
                {STAGES.map((stage) => {
                  const count = leads.filter((l) => l.stage === stage).length;
                  const value = leads.filter((l) => l.stage === stage).reduce((s, l) => s + (l.potential_premium || 0), 0);
                  return (
                    <div key={stage} className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[#0A1628] text-xl font-light">{count}</p>
                      <p className="text-slate-500 text-xs font-medium mt-1">{stage}</p>
                      {value > 0 && <p className="text-[#C9A84C] text-[10px] mt-1">{fmt(value)}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PIPELINE ── */}
        {activeTab === "Pipeline" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-light text-[#0A1628]">Client Pipeline</h1>
                <p className="text-slate-400 text-sm mt-1">{leads.length} leads · {fmt(pipelineValue)} in active pipeline</p>
              </div>
              <button
                onClick={() => setShowAddLead(true)}
                className="bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] text-xs font-semibold px-5 py-2.5 rounded-xl tracking-widest uppercase transition-colors"
              >
                + Add Lead
              </button>
            </div>

            {/* Kanban board */}
            <div className="grid grid-cols-5 gap-4 items-start">
              {STAGES.map((stage) => {
                const stageLeads = leads.filter((l) => l.stage === stage);
                return (
                  <div key={stage} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-widest ${stageColors[stage]}`}>
                        {stage}
                      </span>
                      <span className="text-slate-400 text-xs">{stageLeads.length}</span>
                    </div>
                    <div className="space-y-3 min-h-24">
                      {stageLeads.map((lead) => (
                        <button
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="w-full bg-white rounded-xl p-4 shadow-sm text-left hover:shadow-md transition-shadow border border-gray-100 hover:border-[#C9A84C]/30"
                        >
                          <p className="text-[#0A1628] text-sm font-medium leading-tight">{lead.name}</p>
                          {lead.assigned_to && (
                            <p className="text-slate-400 text-[10px] mt-1">{lead.assigned_to}</p>
                          )}
                          {lead.potential_premium > 0 && (
                            <p className="text-[#C9A84C] text-xs font-semibold mt-2">{fmt(lead.potential_premium)}/yr</p>
                          )}
                          {lead.source && (
                            <span className={`inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full font-medium ${sourceColors[lead.source] ?? "bg-gray-100 text-gray-500"}`}>
                              {lead.source}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CLIENTS ── */}
        {activeTab === "Clients" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-light text-[#0A1628]">Client Accounts</h1>
              <p className="text-slate-400 text-sm mt-1">All active client accounts and portfolio metrics</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 w-72 focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-400"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 uppercase tracking-widest">Advisor:</span>
                {advisors.map((a) => (
                  <button
                    key={a}
                    onClick={() => setFilterAdvisor(a)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      filterAdvisor === a
                        ? "bg-[#C9A84C] text-[#0A1628] font-semibold"
                        : "bg-white border border-gray-200 text-slate-500 hover:border-[#C9A84C]"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <span className="text-slate-400 text-xs ml-auto">{filtered.length} clients</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F4F5F7] border-b border-gray-100">
                    {["Client", "Type", "Advisor", "Death Benefit", "Cash Value", "Annual Premiums", "Policies", "Products", "Status"].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((c) => (
                    <tr key={c.name} className="hover:bg-[#FAFBFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                            <span className="text-[#C9A84C] text-[10px] font-semibold">
                              {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                            </span>
                          </div>
                          <span className="text-[#0A1628] text-sm font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{c.type}</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{c.advisor}</td>
                      <td className="px-6 py-4 text-[#C9A84C] text-sm font-semibold">{c.deathBenefit}</td>
                      <td className="px-6 py-4 text-green-600 text-sm font-semibold">{c.cashValue}</td>
                      <td className="px-6 py-4 text-slate-700 text-sm">{c.premiums}</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{c.policies}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{c.products}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          c.status === "Active" ? "bg-green-50 text-green-700"
                          : c.status === "Work in Progress" ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DEAL INTERESTS ── */}
        {activeTab === "Deal Interests" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-light text-[#0A1628]">Deal Interests</h1>
              <p className="text-slate-400 text-sm mt-1">{dealInterests.length} requests from clients across all private market opportunities</p>
            </div>
            {dealInterests.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
                <p className="text-3xl mb-3">🏦</p>
                <p className="text-slate-500 text-sm font-medium">No interest submissions yet</p>
                <p className="text-slate-400 text-xs mt-1">When clients request more information on deals, they'll appear here.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F4F5F7] border-b border-gray-100">
                      {["Client", "Deal", "Asset Class", "Date Requested"].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dealInterests.map((di) => (
                      <tr key={di.id} className="hover:bg-[#FAFBFC] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                              <span className="text-[#C9A84C] text-[10px] font-semibold">
                                {di.client_name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                              </span>
                            </div>
                            <span className="text-[#0A1628] text-sm font-medium">{di.client_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 text-sm">{di.deal_title}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] font-medium">{di.asset_class}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">{fmtDate(di.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── MARKETING ── */}
        {activeTab === "Marketing" && <MarketingTab />}

        {/* ── DOCUMENTS ── */}
        {activeTab === "Documents" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-light text-[#0A1628]">Send Document to Client</h1>
              <p className="text-slate-400 text-sm mt-1">Upload a file — it appears instantly in that client's Documents tab.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 grid grid-cols-3 gap-6">
                <div className="space-y-4 col-span-1">
                  <div>
                    <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-2">Client</label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] transition-colors"
                    >
                      <option value="">Select a client…</option>
                      {supabaseClients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-2">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {docCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setDocCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                            docCategory === cat
                              ? "bg-[#C9A84C] text-[#0A1628] font-semibold"
                              : "bg-gray-100 text-slate-500 hover:bg-gray-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 flex flex-col gap-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDocDragOver(true); }}
                    onDragLeave={() => setDocDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDocDragOver(false); const f = e.dataTransfer.files[0]; if (f) setDocFile(f); }}
                    onClick={() => docFileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors flex-1 flex flex-col items-center justify-center ${
                      docDragOver ? "border-[#C9A84C] bg-[#C9A84C]/5"
                      : docFile ? "border-green-400 bg-green-50"
                      : "border-gray-200 hover:border-[#C9A84C] hover:bg-[#C9A84C]/5"
                    }`}
                  >
                    <input ref={docFileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                      onChange={(e) => e.target.files?.[0] && setDocFile(e.target.files[0])} />
                    {docFile ? (
                      <div>
                        <p className="text-green-700 text-sm font-medium">{docFile.name}</p>
                        <p className="text-green-600 text-xs mt-1">{fmtSize(docFile.size)} · Ready to upload</p>
                        <button onClick={(e) => { e.stopPropagation(); setDocFile(null); }} className="text-slate-400 text-xs mt-2 hover:text-slate-600 underline">Remove</button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl mb-2">📎</p>
                        <p className="text-slate-500 text-sm">Drag & drop or click to select</p>
                        <p className="text-slate-400 text-xs mt-1">PDF, JPG, PNG, DOCX, XLSX</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleDocUpload}
                    disabled={!docFile || !selectedClientId || uploading}
                    className={`py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all ${
                      uploadResult === "success" ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                      : uploadResult === "error" ? "bg-red-50 text-red-600 border border-red-200 cursor-default"
                      : !docFile || !selectedClientId ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] shadow-sm"
                    }`}
                  >
                    {uploadResult === "success" ? "✓ Document Sent to Client"
                      : uploadResult === "error" ? "Upload Failed — Try Again"
                      : uploading ? "Uploading…"
                      : "Send to Client"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-end" onClick={() => setSelectedLead(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#0A1628] px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{selectedLead.name}</p>
                <p className="text-slate-400 text-xs mt-0.5">{selectedLead.assigned_to ?? "Unassigned"}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-2">Stage</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStageChange(selectedLead, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedLead.stage === s
                          ? "bg-[#C9A84C] text-[#0A1628]"
                          : "bg-gray-100 text-slate-500 hover:bg-gray-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Email", value: selectedLead.email ?? "—" },
                  { label: "Phone", value: selectedLead.phone ?? "—" },
                  { label: "Source", value: selectedLead.source },
                  { label: "Potential Premium", value: selectedLead.potential_premium > 0 ? fmt(selectedLead.potential_premium) + "/yr" : "—" },
                ].map((row) => (
                  <div key={row.label}>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">{row.label}</p>
                    <p className="text-[#0A1628] font-medium">{row.value}</p>
                  </div>
                ))}
              </div>
              {selectedLead.notes && (
                <div>
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-slate-600 text-sm leading-relaxed bg-gray-50 rounded-xl p-4">{selectedLead.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLead && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowAddLead(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[#0A1628] font-medium text-lg mb-5">Add New Lead</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Name *</label>
                  <input value={newLead.name} onChange={(e) => setNewLead(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Email</label>
                  <input value={newLead.email} onChange={(e) => setNewLead(p => ({ ...p, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="email@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Phone</label>
                  <input value={newLead.phone} onChange={(e) => setNewLead(p => ({ ...p, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="(801) 555-0000" />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Annual Premium</label>
                  <input value={newLead.potential_premium} onChange={(e) => setNewLead(p => ({ ...p, potential_premium: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="12000" type="number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Source</label>
                  <select value={newLead.source} onChange={(e) => setNewLead(p => ({ ...p, source: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]">
                    {["Referral", "Website", "Event", "Cold Outreach", "Other"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Assigned To</label>
                  <select value={newLead.assigned_to} onChange={(e) => setNewLead(p => ({ ...p, assigned_to: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]">
                    <option value="">Select advisor…</option>
                    {["Stephen Mongie", "Samuel Noel", "Zach McGlothin"].map((a) => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Notes</label>
                <textarea value={newLead.notes} onChange={(e) => setNewLead(p => ({ ...p, notes: e.target.value }))}
                  rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] resize-none" placeholder="Context, referral source, products of interest…" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddLead(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-slate-500 text-xs font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddLead} disabled={!newLead.name || addingLead}
                className="flex-1 py-2.5 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] rounded-xl text-xs font-semibold uppercase tracking-widest disabled:opacity-50 transition-colors">
                {addingLead ? "Adding…" : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
