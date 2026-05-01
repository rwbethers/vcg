"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  category: string;
  uploaded_by: string;
  created_at: string;
}

interface Policy {
  id: string;
  policy_number: string;
  carrier: string;
  product_name: string;
  product_type: string;
  insured_name: string;
  owner_name: string;
  owner_type: string;
  issue_date: string;
  face_amount: number;
  death_benefit: number;
  cash_value: number;
  loan_balance: number;
  net_cash_value: number;
  annual_premium: number;
  pay_up_date: string | null;
  dividend_option: string | null;
  dividend_value: number;
  mec_status: boolean;
  riders: string[] | null;
  last_statement_date: string | null;
  status: string;
}

interface Props {
  documents: Document[];
  policies: Policy[];
  clientId: string;
  clientName: string;
}

const categoryIcons: Record<string, string> = {
  Illustration: "📊",
  Statement: "📄",
  "Policy Document": "📋",
  "Tax Document": "🧾",
  "Signed Form": "✍️",
  Other: "📎",
};

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtDate2 = (s: string | null) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function DocumentsSection({ documents: initialDocs, policies, clientId, clientName }: Props) {
  const [activeTab, setActiveTab] = useState<"from-advisor" | "send">("from-advisor");
  const [docs, setDocs] = useState(initialDocs);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const advisorDocs = docs.filter((d) => d.uploaded_by === "advisor");
  const clientDocs = docs.filter((d) => d.uploaded_by === "client");

  const grouped = advisorDocs.reduce<Record<string, Document[]>>((acc, doc) => {
    (acc[doc.category] = acc[doc.category] || []).push(doc);
    return acc;
  }, {});

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id);
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = doc.file_name;
      a.click();
    }
    setDownloading(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const path = `${clientId}/client/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("client-documents")
      .upload(path, file);
    if (!error) {
      const { data: doc } = await supabase
        .from("documents")
        .insert({
          client_id: clientId,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
          category: "Signed Form",
          uploaded_by: "client",
          uploaded_by_name: clientName,
        })
        .select()
        .single();
      if (doc) setDocs((prev) => [...prev, doc]);
    }
    setFile(null);
    setUploading(false);
    setUploaded(true);
    setTimeout(() => setUploaded(false), 4000);
  };

  return (
    <div className="space-y-6">

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("from-advisor")}
          className={`px-5 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === "from-advisor"
              ? "bg-white shadow-sm text-[#0A1628]"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          From Your Advisor
          {advisorDocs.length > 0 && (
            <span className="ml-2 bg-[#C9A84C]/20 text-[#C9A84C] text-[10px] px-1.5 py-0.5 rounded-full">
              {advisorDocs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("send")}
          className={`px-5 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === "send"
              ? "bg-white shadow-sm text-[#0A1628]"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Send Documents
          {clientDocs.length > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full">
              {clientDocs.length} sent
            </span>
          )}
        </button>
      </div>

      {/* From Advisor Tab */}
      {activeTab === "from-advisor" && (
        <div className="space-y-6">

          {/* Auto-generated policy summaries */}
          {policies.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <span>🛡️</span>
                <h3 className="text-[#0A1628] font-medium text-sm">Policy Summaries</h3>
                <span className="text-slate-400 text-xs">({policies.length}) · Auto-generated from your account</span>
              </div>
              <div className="divide-y divide-gray-50">
                {policies.map((p) => {
                  const isExpanded = expandedPolicy === p.id;
                  return (
                    <div key={p.id}>
                      <button
                        onClick={() => setExpandedPolicy(isExpanded ? null : p.id)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#FAFBFC] transition-colors text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#0A1628]/5 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">📋</span>
                          </div>
                          <div>
                            <p className="text-[#0A1628] text-sm font-medium">{p.product_name}</p>
                            <p className="text-slate-400 text-xs mt-0.5">
                              {p.carrier} · Policy #{p.policy_number}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                            p.status === "Active"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {p.status}
                          </span>
                          <span className={`text-[#C9A84C] text-lg transition-transform ${isExpanded ? "rotate-45" : ""}`}>+</span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-6 pb-6 bg-[#FAFBFC]">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            {[
                              { label: "Death Benefit", value: fmt(p.death_benefit || p.face_amount) },
                              { label: "Cash Value", value: fmt(p.cash_value) },
                              { label: "Annual Premium", value: fmt(p.annual_premium) },
                              { label: "Net Cash Value", value: fmt(p.net_cash_value) },
                              { label: "Loan Balance", value: p.loan_balance > 0 ? fmt(p.loan_balance) : "None" },
                              { label: "Dividends (YTD)", value: p.dividend_value > 0 ? fmt(p.dividend_value) : "—" },
                            ].map((row) => (
                              <div key={row.label} className="bg-white rounded-xl p-4 border border-gray-100">
                                <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">{row.label}</p>
                                <p className="text-[#0A1628] text-sm font-semibold">{row.value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                            {[
                              { label: "Insured", value: p.insured_name },
                              { label: "Owner", value: p.owner_name },
                              { label: "Policy Type", value: p.product_type },
                              { label: "Issue Date", value: fmtDate2(p.issue_date) },
                              { label: "Pay-Up Date", value: fmtDate2(p.pay_up_date) },
                              { label: "Last Statement", value: fmtDate2(p.last_statement_date) },
                              { label: "Dividend Option", value: p.dividend_option ?? "—" },
                              { label: "MEC Status", value: p.mec_status ? "MEC" : "Non-MEC" },
                            ].map((row) => (
                              <div key={row.label} className="flex justify-between py-1.5 border-b border-gray-100">
                                <span className="text-slate-400">{row.label}</span>
                                <span className="text-[#0A1628] font-medium">{row.value}</span>
                              </div>
                            ))}
                          </div>
                          {p.riders && p.riders.length > 0 && (
                            <div className="mt-3">
                              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">Riders</p>
                              <div className="flex flex-wrap gap-2">
                                {p.riders.map((r) => (
                                  <span key={r} className="bg-[#0A1628]/5 text-[#0A1628] text-[10px] px-2.5 py-1 rounded-full">{r}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Uploaded advisor documents */}
          {advisorDocs.length === 0 && policies.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
              <div className="w-16 h-16 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📂</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">No documents yet</p>
              <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                Illustrations, statements, and policy documents shared by your advisor will appear here.
              </p>
            </div>
          )}

          {Object.entries(grouped).map(([category, catDocs]) => (
            <div key={category} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <span>{categoryIcons[category] ?? "📎"}</span>
                <h3 className="text-[#0A1628] font-medium text-sm">{category}</h3>
                <span className="text-slate-400 text-xs">({catDocs.length})</span>
              </div>
              <div className="divide-y divide-gray-50">
                {catDocs.map((doc) => (
                  <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#FAFBFC] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#0A1628]/5 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">{categoryIcons[doc.category] ?? "📎"}</span>
                      </div>
                      <div>
                        <p className="text-[#0A1628] text-sm font-medium">{doc.file_name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {fmtDate(doc.created_at)}
                          {doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={downloading === doc.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C9A84C] text-[#C9A84C] text-xs font-medium hover:bg-[#C9A84C]/10 transition-colors disabled:opacity-50"
                    >
                      {downloading === doc.id ? "Preparing…" : "↓ Download"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Documents Tab */}
      {activeTab === "send" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-[#0A1628] font-medium text-sm mb-1">Upload a Signed Document</h3>
            <p className="text-slate-400 text-xs mb-6">
              Your advisor will be notified when you send a file. Accepted: PDF, JPG, PNG, DOCX (max 20 MB).
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) setFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-[#C9A84C] bg-[#C9A84C]/5"
                  : file
                  ? "border-green-400 bg-green-50"
                  : "border-gray-200 hover:border-[#C9A84C] hover:bg-[#C9A84C]/5"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
              />
              {file ? (
                <div>
                  <p className="text-green-700 text-sm font-medium">{file.name}</p>
                  <p className="text-green-600 text-xs mt-1">{fmtSize(file.size)} · Ready to send</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-slate-400 text-xs mt-3 hover:text-slate-600 underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-3xl mb-3">📎</p>
                  <p className="text-slate-500 text-sm">Drag & drop or click to select a file</p>
                  <p className="text-slate-400 text-xs mt-1">PDF, JPG, PNG, DOCX up to 20 MB</p>
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || uploading || uploaded}
              className={`w-full mt-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all ${
                uploaded
                  ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                  : !file
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] shadow-sm"
              }`}
            >
              {uploaded
                ? "✓ Document Sent to Advisor"
                : uploading
                ? "Uploading…"
                : "Send to Advisor"}
            </button>
          </div>

          {/* Previously sent */}
          {clientDocs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-[#0A1628] font-medium text-sm">Previously Sent</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {clientDocs.map((doc) => (
                  <div key={doc.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">✍️</span>
                    </div>
                    <div>
                      <p className="text-[#0A1628] text-sm font-medium">{doc.file_name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Sent {fmtDate(doc.created_at)}
                        {doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ""}
                      </p>
                    </div>
                    <span className="ml-auto text-[10px] px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">
                      Delivered
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
