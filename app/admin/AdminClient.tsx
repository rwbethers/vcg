"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import OverviewTab from "./OverviewTab";
import ActionItemsTab from "./ActionItemsTab";
import ClientDetailPanel from "./ClientDetailPanel";
import DealManagerTab from "./DealManagerTab";
import ReportsTab from "./ReportsTab";
import ClientHealthTab from "./ClientHealthTab";
import PipelineTab from "./PipelineTab";
import PolicyReviewTab from "./PolicyReviewTab";
import QuarterlyDeckTab from "./QuarterlyDeckTab";
import IllustrationRequestsTab from "./IllustrationRequestsTab";
import PremiumFinanceTab from "./PremiumFinanceTab";
import CollateralMonitorTab from "./CollateralMonitorTab";
import CriticalDatesTab from "./CriticalDatesTab";
import AIAssistant from "./AIAssistant";

const clientRows = [
  { name: "Jeffrey Adams",       type: "Individual",         advisor: "Stephen Mongie", deathBenefit: "$2,615,225", cashValue: "$136,016", premiums: "$15,000", policies: 2, products: "Whole Life, Term",       status: "Active" },
  { name: "Elisabeth Andelin",   type: "Individual / Trust", advisor: "Stephen Mongie", deathBenefit: "$7,384,336", cashValue: "$197,954", premiums: "$69,751", policies: 2, products: "Whole Life, FIUL",       status: "Active" },
  { name: "J. Brandt Anderson",  type: "Individual / Plan",  advisor: "Stephen Mongie", deathBenefit: "—",          cashValue: "—",        premiums: "—",       policies: 2, products: "Term (Lapsed), VUL",    status: "Under Review" },
  { name: "Dallin Anderson",     type: "Individual",         advisor: "Samuel Noel",    deathBenefit: "—",          cashValue: "—",        premiums: "—",       policies: 1, products: "IUL (Lapsed)",           status: "Under Review" },
  { name: "Elizabeth Anderson",  type: "Individual",         advisor: "Samuel Noel",    deathBenefit: "—",          cashValue: "—",        premiums: "—",       policies: 0, products: "—",                     status: "Active" },
  { name: "Gary Applegate",      type: "Individual",         advisor: "Zach McGlothin", deathBenefit: "—",          cashValue: "—",        premiums: "—",       policies: 0, products: "Application Pending",    status: "Work in Progress" },
  { name: "Shane Atkinson",      type: "Individual",         advisor: "Zach McGlothin", deathBenefit: "—",          cashValue: "—",        premiums: "—",       policies: 0, products: "Annuity (Keyport)",      status: "Under Review" },
  { name: "Teresa Auvaa",        type: "Individual",         advisor: "Stephen Mongie", deathBenefit: "$1,000,000", cashValue: "—",        premiums: "$397",    policies: 1, products: "Term",                   status: "Active" },
  { name: "Tui Auvaa",           type: "Individual",         advisor: "Stephen Mongie", deathBenefit: "$3,039,132", cashValue: "$325",     premiums: "$15,871", policies: 1, products: "Whole Life",             status: "Active" },
];

const docCategories = ["Statement", "Illustration", "Policy Document", "Tax Document", "Other"];

interface DealInterest {
  id: string;
  client_name: string;
  deal_title: string;
  asset_class: string;
  created_at: string;
}

interface SupabaseClient {
  id: string;
  name: string;
  email: string;
  type: string;
  advisor: string;
  member_since: string;
  state: string;
  stage?: string;
  created_at?: string;
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

interface Announcement {
  id: string;
  message: string;
  type: string;
  active: boolean;
  created_at: string;
}

interface Goal { id: string; metric: string; target: number; period: string; }

interface Props {
  adminEmail: string;
  goals: Goal[];
  clients: SupabaseClient[];
  actionItems: ActionItem[];
  deals: Deal[];
  announcements: Announcement[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function AdminClient({ adminEmail, goals: initialGoals, clients, actionItems, deals, announcements }: Props) {
  const [activeTab, setActiveTab] = useState("Overview");

  const NAV_GROUPS = [
    { label: "CLIENTS",     tabs: ["Overview", "Clients", "Pipeline", "Client Health"] },
    { label: "OPERATIONS",  tabs: ["Illustration Requests", "Policy Reviews", "Quarterly Decks", "Action Items"] },
    { label: "FINANCE",     tabs: ["Premium Finance", "Collateral Monitor", "Critical Dates"] },
    { label: "DEALS",       tabs: ["Deal Manager", "Deal Interests"] },
    { label: "ADMIN",       tabs: ["Documents", "Reports"] },
  ];

  const [dealInterests, setDealInterests] = useState<DealInterest[]>([]);

  // Clients tab
  const [search, setSearch] = useState("");
  const [filterAdvisor, setFilterAdvisor] = useState("All");
  const [panelClient, setPanelClient] = useState<SupabaseClient | null>(null);

  // Documents tab
  const [selectedClientId, setSelectedClientId] = useState("");
  const [docCategory, setDocCategory] = useState("Statement");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docDragOver, setDocDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<"success" | "error" | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("deal_interest").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setDealInterests(data);
    });
  }, []);

  const financialLookup = Object.fromEntries(clientRows.map((r) => [r.name, r]));

  const advisors = ["All", "Stephen Mongie", "Samuel Noel", "Zach McGlothin"];
  const filtered = clients
    .filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      (filterAdvisor === "All" || c.advisor === filterAdvisor)
    )
    .map((c) => {
      const fin = financialLookup[c.name];
      return {
        name: c.name,
        type: c.type ?? fin?.type ?? "—",
        advisor: c.advisor ?? fin?.advisor ?? "—",
        deathBenefit: fin?.deathBenefit ?? "—",
        cashValue: fin?.cashValue ?? "—",
        premiums: fin?.premiums ?? "—",
        policies: fin?.policies ?? 0,
        products: fin?.products ?? "—",
        status: fin?.status ?? "Active",
      };
    });

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

  const openClientPanel = (rowName: string) => {
    const match = clients.find((c) => c.name === rowName);
    if (match) setPanelClient(match);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7]">

      {/* Top Bar */}
      <header className="bg-[#0A1628] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl px-4 py-2 inline-block">
            <img src="/vcg-logo.png" alt="Vision Consulting Group" className="h-7 w-auto" />
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

      {/* Grouped Tab Nav */}
      <div className="bg-[#07101f] border-b border-[#0f1f3a] px-6 overflow-x-auto">
        <div className="flex items-stretch min-w-max">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className="flex items-stretch">
              {/* Group */}
              <div className="flex flex-col">
                <span className="text-[#1a3a60] text-[8px] font-bold tracking-[0.2em] uppercase px-4 pt-2.5 pb-0">{group.label}</span>
                <div className="flex items-stretch gap-0.5 pb-0">
                  {group.tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2.5 text-[11px] font-medium transition-all relative whitespace-nowrap ${
                        activeTab === tab
                          ? "text-[#C9A84C]"
                          : "text-[#4a6080] hover:text-slate-300"
                      }`}
                    >
                      {tab}
                      {activeTab === tab && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C9A84C] rounded-t-full" />
                      )}
                      {tab === "Deal Interests" && dealInterests.length > 0 && (
                        <span className="ml-1 bg-[#C9A84C] text-[#0A1628] text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                          {dealInterests.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {/* Divider between groups */}
              {gi < NAV_GROUPS.length - 1 && (
                <div className="w-px bg-[#0f1f3a] mx-1 self-stretch" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 py-8 space-y-8">

        {/* ── OVERVIEW ── */}
        {activeTab === "Overview" && (
          <OverviewTab
            dealInterests={dealInterests}
            goals={initialGoals}
            clients={clients}
            actionItems={actionItems}
            onTabChange={setActiveTab}
          />
        )}

        {/* ── PIPELINE ── */}
        {activeTab === "Pipeline" && (
          <PipelineTab clients={clients.map(c => ({ ...c, stage: c.stage ?? "client" }))} />
        )}

        {/* ── POLICY REVIEWS ── */}
        {activeTab === "Policy Reviews" && (
          <PolicyReviewTab clients={clients.map(c => ({ ...c, stage: c.stage ?? "client" }))} adminEmail={adminEmail} />
        )}

        {/* ── QUARTERLY DECKS ── */}
        {activeTab === "Quarterly Decks" && (
          <QuarterlyDeckTab clients={clients.map(c => ({ ...c, stage: c.stage ?? "client" }))} adminEmail={adminEmail} />
        )}

        {/* ── ILLUSTRATION REQUESTS ── */}
        {activeTab === "Illustration Requests" && (
          <IllustrationRequestsTab clients={clients.map(c => ({ ...c, stage: c.stage ?? "client" }))} adminEmail={adminEmail} />
        )}

        {/* ── CLIENTS ── */}
        {activeTab === "Clients" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-light text-[#0A1628]">Client Accounts</h1>
              <p className="text-slate-400 text-sm mt-1">All active client accounts and portfolio metrics — click any row for full details</p>
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
                    {["Client", "Type", "Advisor", "Death Benefit", "Cash Value", "Annual Premiums", "Policies", "Products", "Status", ""].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((c) => (
                    <tr
                      key={c.name}
                      onClick={() => openClientPanel(c.name)}
                      className="hover:bg-[#FAFBFC] transition-colors cursor-pointer"
                    >
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
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const sc = clients.find((x) => x.name === c.name);
                          return sc ? (
                            <a
                              href={`/admin/preview/${sc.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-slate-500 border border-gray-200 rounded-lg hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors whitespace-nowrap"
                            >
                              <span>👁</span> Preview
                            </a>
                          ) : null;
                        })()}
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
                      {clients.map((c) => (
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
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-40 ${
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

        {/* ── ACTION ITEMS ── */}
        {activeTab === "Action Items" && (
          <ActionItemsTab actionItems={actionItems} clients={clients} />
        )}

        {/* ── DEAL MANAGER ── */}
        {activeTab === "Deal Manager" && (
          <DealManagerTab deals={deals} />
        )}

        {/* ── PREMIUM FINANCE ── */}
        {activeTab === "Premium Finance" && (
          <PremiumFinanceTab />
        )}

        {/* ── COLLATERAL MONITOR ── */}
        {activeTab === "Collateral Monitor" && (
          <CollateralMonitorTab />
        )}

        {/* ── CRITICAL DATES ── */}
        {activeTab === "Critical Dates" && (
          <CriticalDatesTab />
        )}

        {/* ── REPORTS ── */}
        {activeTab === "Reports" && (
          <ReportsTab clients={clients} deals={deals} actionItems={actionItems} />
        )}

        {/* ── CLIENT HEALTH ── */}
        {activeTab === "Client Health" && (
          <ClientHealthTab clients={clients} actionItems={actionItems} />
        )}

      </div>

      {/* AI Assistant */}
      <AIAssistant
        adminEmail={adminEmail}
        clients={clients}
        actionItems={actionItems}
        deals={deals}
        announcements={announcements}
      />

      {/* Client Detail Panel */}
      {panelClient && (
        <ClientDetailPanel
          client={panelClient}
          onClose={() => setPanelClient(null)}
          previewUrl={`/admin/preview/${panelClient.id}`}
        />
      )}
    </div>
  );
}
