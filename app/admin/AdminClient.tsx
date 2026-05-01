"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const clients = [
  {
    name: "Jeffrey Adams",
    type: "Individual",
    advisor: "Stephen Mongie",
    deathBenefit: "$2,615,225",
    cashValue: "$136,016",
    premiums: "$15,000",
    policies: 2,
    products: "Whole Life, Term",
    status: "Active",
    lastUpdated: "Dec 8, 2015",
  },
  {
    name: "Elisabeth Andelin",
    type: "Individual / Trust",
    advisor: "Stephen Mongie",
    deathBenefit: "$7,384,336",
    cashValue: "$197,954",
    premiums: "$69,751",
    policies: 2,
    products: "Whole Life, FIUL",
    status: "Active",
    lastUpdated: "Sep 3, 2015",
  },
  {
    name: "J. Brandt Anderson",
    type: "Individual / Plan",
    advisor: "Stephen Mongie",
    deathBenefit: "—",
    cashValue: "—",
    premiums: "—",
    policies: 2,
    products: "Term (Lapsed), VUL",
    status: "Under Review",
    lastUpdated: "May 30, 2008",
  },
  {
    name: "Dallin Anderson",
    type: "Individual",
    advisor: "Samuel Noel",
    deathBenefit: "—",
    cashValue: "—",
    premiums: "—",
    policies: 1,
    products: "IUL (Lapsed)",
    status: "Under Review",
    lastUpdated: "Mar 6, 2017",
  },
  {
    name: "Elizabeth Anderson",
    type: "Individual",
    advisor: "Samuel Noel",
    deathBenefit: "—",
    cashValue: "—",
    premiums: "—",
    policies: 0,
    products: "—",
    status: "Active",
    lastUpdated: "—",
  },
  {
    name: "Gary Applegate",
    type: "Individual",
    advisor: "Zach McGlothin",
    deathBenefit: "—",
    cashValue: "—",
    premiums: "—",
    policies: 0,
    products: "Application Pending",
    status: "Work in Progress",
    lastUpdated: "Apr 4, 2018",
  },
  {
    name: "Shane Atkinson",
    type: "Individual",
    advisor: "Zach McGlothin",
    deathBenefit: "—",
    cashValue: "—",
    premiums: "—",
    policies: 0,
    products: "Annuity (Keyport)",
    status: "Under Review",
    lastUpdated: "—",
  },
  {
    name: "Teresa Auvaa",
    type: "Individual",
    advisor: "Stephen Mongie",
    deathBenefit: "$1,000,000",
    cashValue: "—",
    premiums: "$397",
    policies: 1,
    products: "Term",
    status: "Active",
    lastUpdated: "Jun 19, 2014",
  },
  {
    name: "Tui Auvaa",
    type: "Individual",
    advisor: "Stephen Mongie",
    deathBenefit: "$3,039,132",
    cashValue: "$325",
    premiums: "$15,871",
    policies: 1,
    products: "Whole Life",
    status: "Active",
    lastUpdated: "Jun 19, 2014",
  },
];

const summaryMetrics = [
  { label: "Total Death Benefit", value: "$14,038,693" },
  { label: "Total Clients", value: "9" },
  { label: "Total Annual Premiums", value: "$101,019" },
  { label: "Active Policies", value: "7" },
];

interface SupabaseClient {
  id: string;
  name: string;
}

const docCategories = ["Statement", "Illustration", "Policy Document", "Tax Document", "Other"];

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function AdminClient({ adminEmail }: { adminEmail: string }) {
  const [search, setSearch] = useState("");
  const [filterAdvisor, setFilterAdvisor] = useState("All");

  // Document upload state
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
    supabase.from("clients").select("id, name").order("name").then(({ data }) => {
      if (data) setSupabaseClients(data);
    });
  }, []);

  const advisors = ["All", "Stephen Mongie", "Samuel Noel", "Zach McGlothin"];

  const handleDocUpload = async () => {
    if (!docFile || !selectedClientId) return;
    setUploading(true);
    setUploadResult(null);
    const supabase = createClient();
    const path = `${selectedClientId}/advisor/${Date.now()}_${docFile.name}`;
    const { error: storageError } = await supabase.storage
      .from("client-documents")
      .upload(path, docFile);
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

  const filtered = clients.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchAdvisor = filterAdvisor === "All" || c.advisor === filterAdvisor;
    return matchSearch && matchAdvisor;
  });

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
          <Link
            href="/dashboard"
            className="text-xs text-slate-400 hover:text-[#C9A84C] transition-colors px-3 py-1.5 border border-[#1a3060] rounded-lg hover:border-[#C9A84C]"
          >
            Client View
          </Link>
          <form action="/auth/signout" method="POST">
            <button type="submit" className="text-slate-600 text-xs hover:text-slate-400 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-light text-[#0A1628]">Client Overview</h1>
          <p className="text-slate-400 text-sm mt-1">All client accounts and portfolio metrics</p>
        </div>

        <div className="grid grid-cols-4 gap-5">
          {summaryMetrics.map((m) => (
            <div key={m.label} className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-[#C9A84C]">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">{m.label}</p>
              <p className="text-[#0A1628] text-2xl font-light">{m.value}</p>
            </div>
          ))}
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
                    : "bg-white border border-gray-200 text-slate-500 hover:border-[#C9A84C] hover:text-[#C9A84C]"
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
                {["Client", "Type", "Advisor", "Death Benefit", "Cash Value", "Annual Premiums", "Policies", "Products", "Status", "Last Statement"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.name} className="hover:bg-[#FAFBFC] transition-colors cursor-pointer group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                        <span className="text-[#C9A84C] text-[10px] font-semibold">
                          {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </span>
                      </div>
                      <span className="text-[#0A1628] text-sm font-medium group-hover:text-[#C9A84C] transition-colors">
                        {c.name}
                      </span>
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
                      c.status === "Active"
                        ? "bg-green-50 text-green-700"
                        : c.status === "Work in Progress"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{c.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              No clients match your search.
            </div>
          )}
          <div className="px-6 py-4 border-t border-gray-50 bg-[#F9FAFB]">
            <div className="flex items-center gap-8 text-xs text-slate-400">
              <span>9 clients</span>
              <span>Total Death Benefit: <span className="text-[#C9A84C] font-bold">$14,038,693</span></span>
              <span>Total Annual Premiums: <span className="text-[#0A1628] font-bold">$101,019</span></span>
              <span>Active Policies: <span className="text-green-600 font-bold">7</span></span>
              <span className="text-slate-300 text-[10px] italic ml-auto">Values from carrier statements · update regularly</span>
            </div>
          </div>
        </div>
        {/* Document Upload */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-[#0A1628] font-medium">Send Document to Client</h2>
            <p className="text-slate-400 text-xs mt-0.5">Upload a file — it will appear instantly in that client's Documents tab.</p>
          </div>
          <div className="p-6 grid grid-cols-3 gap-6">
            {/* Left: selectors */}
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

            {/* Right: drop zone */}
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
                <input
                  ref={docFileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                  onChange={(e) => e.target.files?.[0] && setDocFile(e.target.files[0])}
                />
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
    </div>
  );
}
