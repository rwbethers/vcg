"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  clients: { id: string; name: string; advisor: string; stage?: string }[];
  adminEmail: string;
}

interface Policy {
  id: string;
  client_id: string;
  policy_number: string;
  carrier: string;
  product_name: string;
  product_type: string;
  face_amount: number;
  annual_premium: number;
  status: string;
  clients: { name: string; advisor: string; email: string } | null;
}

interface IllustrationRequest {
  id: string;
  policy_id: string | null;
  client_id: string;
  quarter: string;
  carrier: string;
  carrier_email: string;
  policy_number: string;
  policy_owner: string;
  status: string;
  email_subject: string;
  email_body: string;
  sent_at: string | null;
  pdf_path: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft:    "bg-slate-100 text-slate-500",
  sent:     "bg-blue-50 text-blue-600",
  received: "bg-amber-50 text-amber-700",
  uploaded: "bg-green-50 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", received: "Received", uploaded: "Uploaded",
};

function currentQuarter() {
  const d = new Date();
  return `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const QUARTER_OPTIONS = (() => {
  const opts: string[] = [];
  const now = new Date();
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) {
    for (let q = 1; q <= 4; q++) opts.push(`Q${q} ${y}`);
  }
  return opts;
})();

export default function IllustrationRequestsTab({ adminEmail }: Props) {
  const supabase = createClient();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [requests, setRequests] = useState<IllustrationRequest[]>([]);
  const [selected, setSelected] = useState<Policy | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "sent" | "uploaded">("all");

  // Form state
  const [quarter, setQuarter] = useState(currentQuarter());
  const [carrierEmail, setCarrierEmail] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"success" | "error" | null>(null);
  const [generatingDeck, setGeneratingDeck] = useState(false);

  // Upload
  const [uploadingReqId, setUploadingReqId] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [activeUploadReq, setActiveUploadReq] = useState<IllustrationRequest | null>(null);

  // Bulk
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkLog, setBulkLog] = useState<{ client: string; carrier: string; status: string; reason?: string }[]>([]);
  const [bulkDone, setBulkDone] = useState(false);

  useEffect(() => { fetchPolicies(); fetchRequests(); }, []);

  async function fetchPolicies() {
    const { data } = await supabase
      .from("policies")
      .select("*, clients(name, advisor, email)")
      .eq("status", "Active")
      .order("carrier");
    if (data) setPolicies(data as Policy[]);
  }

  async function fetchRequests() {
    const { data } = await supabase
      .from("illustration_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRequests(data as IllustrationRequest[]);
  }

  function policyRequests(policyId: string) {
    return requests
      .filter((r) => r.policy_id === policyId || r.policy_number === policies.find(p => p.id === policyId)?.policy_number)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  function lastRequest(policyId: string) {
    return policyRequests(policyId)[0] ?? null;
  }

  function sentThisQuarter(policyId: string) {
    const q = currentQuarter();
    return policyRequests(policyId).some((r) => r.quarter === q && (r.status === "sent" || r.status === "uploaded"));
  }

  function selectPolicy(policy: Policy) {
    setSelected(policy);
    setCarrierEmail("");
    setEmailDraft("");
    setDraftSubject("");
    setSendResult(null);
  }

  async function handleGenerateDraft() {
    if (!selected) return;
    setGenerating(true);
    setEmailDraft("");
    try {
      const res = await fetch("/api/request-illustration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy_id: selected.id,
          policy_number: selected.policy_number,
          carrier: selected.carrier,
          product_name: selected.product_name,
          face_amount: selected.face_amount,
          annual_prem: selected.annual_premium,
          client_name: selected.clients?.name ?? "Client",
          advisor_name: selected.clients?.advisor ?? adminEmail,
          carrier_email: carrierEmail,
          quarter,
          action: "draft",
        }),
      });
      const data = await res.json();
      setEmailDraft(data.emailBody ?? "");
      setDraftSubject(data.subject ?? "");
    } catch {
      setEmailDraft("Error generating draft. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!selected || !carrierEmail || !emailDraft) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/request-illustration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy_id: selected.id,
          policy_number: selected.policy_number,
          carrier: selected.carrier,
          product_name: selected.product_name,
          face_amount: selected.face_amount,
          annual_prem: selected.annual_premium,
          client_name: selected.clients?.name ?? "Client",
          client_id: selected.client_id,
          advisor_name: selected.clients?.advisor ?? adminEmail,
          carrier_email: carrierEmail,
          email_body: emailDraft,
          quarter,
          action: "send",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSendResult("success");
      setEmailDraft("");
      await fetchRequests();
    } catch {
      setSendResult("error");
    } finally {
      setSending(false);
    }
  }

  async function handleBulkSend() {
    setBulkRunning(true);
    setBulkLog([]);
    setBulkDone(false);
    try {
      const res = await fetch("/api/request-illustration/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quarter }),
      });
      const data = await res.json() as { results: typeof bulkLog; sent: number; drafted: number; skipped: number; errors: number };
      setBulkLog(data.results ?? []);
      setBulkDone(true);
      await fetchRequests();
    } catch (e) {
      setBulkLog([{ client: "System", carrier: "", status: "error", reason: String(e) }]);
      setBulkDone(true);
    } finally {
      setBulkRunning(false);
    }
  }

  async function handleGenerateDeck() {
    if (!selected) return;
    setGeneratingDeck(true);
    try {
      const res = await fetch("/api/generate-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: selected.client_id, quarter }),
      });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VCG_Review_${(selected.clients?.name ?? "Client").replace(/\s+/g, "_")}_${quarter.replace(/\s+/g, "_")}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Error generating deck. Please try again.");
    } finally {
      setGeneratingDeck(false);
    }
  }

  async function handleUpload(req: IllustrationRequest, file: File) {
    setUploadingReqId(req.id);
    const path = `${req.client_id}/illustrations/${Date.now()}_${file.name}`;
    const { error: storageErr } = await supabase.storage.from("client-documents").upload(path, file);
    if (!storageErr) {
      await supabase.from("illustration_requests")
        .update({ status: "uploaded", pdf_path: path, received_at: new Date().toISOString() })
        .eq("id", req.id);
      await fetchRequests();
    }
    setUploadingReqId(null);
    setActiveUploadReq(null);
  }

  const cq = currentQuarter();
  const totalPolicies   = policies.length;
  const sentCount       = policies.filter((p) => sentThisQuarter(p.id)).length;
  const pendingCount    = totalPolicies - sentCount;
  const uploadedCount   = policies.filter((p) => policyRequests(p.id)[0]?.status === "uploaded").length;

  const filteredPolicies = policies.filter((p) => {
    const name = p.clients?.name ?? "";
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) ||
      p.carrier.toLowerCase().includes(search.toLowerCase()) ||
      p.policy_number?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filterStatus === "pending") return !sentThisQuarter(p.id);
    if (filterStatus === "sent") return sentThisQuarter(p.id) && policyRequests(p.id)[0]?.status !== "uploaded";
    if (filterStatus === "uploaded") return policyRequests(p.id)[0]?.status === "uploaded";
    return true;
  });

  return (
    <div className="space-y-6">

      {/* ── Quarterly Dashboard ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Policies", value: totalPolicies, sub: "Active policies in portfolio", color: "border-[#C9A84C]" },
          { label: `${cq} — Pending`, value: pendingCount, sub: "Need illustration request", color: "border-amber-400" },
          { label: `${cq} — Sent`, value: sentCount, sub: "Requests sent to carriers", color: "border-blue-400" },
          { label: "Illustrations Received", value: uploadedCount, sub: "PDFs uploaded & on file", color: "border-green-400" },
        ].map((m) => (
          <div key={m.label} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${m.color}`}>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">{m.label}</p>
            <p className="text-[#0A1628] text-2xl font-light">{m.value}</p>
            <p className="text-slate-400 text-xs mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Bulk send ── */}
      <div className="bg-[#0A1628] rounded-2xl px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[#C9A84C] text-[10px] uppercase tracking-widest font-semibold mb-1">Bulk Quarterly Send</p>
            <p className="text-white text-sm font-light">
              Send illustration requests to all carriers for all active policies in one click.
            </p>
            <p className="text-slate-500 text-xs mt-0.5">Already-sent policies for the selected quarter are automatically skipped.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="border border-[#1a3060] bg-[#0d1e3a] text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors"
            >
              {QUARTER_OPTIONS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <button
              onClick={handleBulkSend}
              disabled={bulkRunning}
              className="px-6 py-2.5 bg-[#C9A84C] hover:bg-[#E8C96C] disabled:opacity-50 text-[#0A1628] font-bold text-xs uppercase tracking-widest rounded-xl transition-colors whitespace-nowrap"
            >
              {bulkRunning ? "Sending…" : `Send All for ${quarter}`}
            </button>
          </div>
        </div>

        {(bulkLog.length > 0 || bulkRunning) && (
          <div className="bg-black/20 rounded-xl p-4 space-y-1 max-h-44 overflow-y-auto">
            {bulkRunning && !bulkDone && (
              <p className="text-[#C9A84C] text-[10px] font-mono animate-pulse mb-2">Generating drafts & sending…</p>
            )}
            {bulkLog.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-[10px] font-mono ${
                  r.status === "sent" ? "text-green-400" :
                  r.status === "drafted" ? "text-amber-400" :
                  r.status === "skipped" ? "text-slate-500" : "text-red-400"
                }`}>
                  {r.status === "sent" ? "✓" : r.status === "skipped" ? "—" : r.status === "error" ? "✗" : "~"}
                </span>
                <p className="text-slate-300 text-[10px] font-mono truncate">
                  {r.client} · {r.carrier}
                  {r.status === "skipped" && <span className="text-slate-600"> (already sent this quarter)</span>}
                  {r.reason && r.status === "error" && <span className="text-red-400"> — {r.reason}</span>}
                </p>
              </div>
            ))}
            {bulkDone && (
              <p className="text-slate-400 text-[10px] font-mono pt-2 border-t border-white/5">
                Done — {bulkLog.filter(r => r.status === "sent").length} sent ·{" "}
                {bulkLog.filter(r => r.status === "skipped").length} skipped ·{" "}
                {bulkLog.filter(r => r.status === "error").length} errors
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Policy List + Detail ── */}
      <div className="flex gap-6" style={{ minHeight: "600px" }}>

        {/* Left — policy list */}
        <aside className="w-80 flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client or carrier…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-400"
            />
          </div>

          <div className="flex gap-1">
            {(["all", "pending", "sent", "uploaded"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded-lg transition-colors ${
                  filterStatus === f ? "bg-[#0A1628] text-white" : "bg-white text-slate-400 hover:text-slate-600"
                }`}
              >
                {f === "all" ? `All (${totalPolicies})` :
                 f === "pending" ? `Due (${pendingCount})` :
                 f === "sent" ? `Sent (${sentCount})` :
                 `Filed (${uploadedCount})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5">
            {filteredPolicies.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm">No policies found.</p>
              </div>
            ) : filteredPolicies.map((policy) => {
              const name = policy.clients?.name ?? "Unknown";
              const last = lastRequest(policy.id);
              const isSent = sentThisQuarter(policy.id);
              const isSelected = selected?.id === policy.id;

              return (
                <button
                  key={policy.id}
                  onClick={() => selectPolicy(policy)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl transition-all border ${
                    isSelected
                      ? "bg-[#C9A84C]/10 border-[#C9A84C]/30"
                      : "bg-white border-transparent hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                        <span className="text-[#C9A84C] text-[9px] font-semibold">
                          {name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                        </span>
                      </div>
                      <span className="text-[#0A1628] text-sm font-medium leading-tight truncate max-w-[120px]">{name}</span>
                    </div>
                    {last ? (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide flex-shrink-0 ${STATUS_STYLES[last.status] ?? ""}`}>
                        {STATUS_LABELS[last.status] ?? last.status}
                      </span>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide bg-amber-50 text-amber-600 flex-shrink-0">
                        Never Sent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pl-9">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0A1628]/5 text-slate-500 font-medium">
                      {policy.carrier}
                    </span>
                    {policy.policy_number && (
                      <span className="text-[10px] text-slate-400">#{policy.policy_number}</span>
                    )}
                  </div>
                  {last?.sent_at && (
                    <p className={`text-[10px] pl-9 mt-1 ${isSent ? "text-blue-500" : "text-slate-400"}`}>
                      {isSent ? `✓ ${cq} sent` : `Last: ${fmtDate(last.sent_at)}`}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right — request detail */}
        <main className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center bg-white rounded-2xl shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#0A1628]/5 flex items-center justify-center mb-4">
                <span className="text-3xl">✉</span>
              </div>
              <p className="text-[#0A1628] font-medium text-base">Select a policy</p>
              <p className="text-slate-400 text-sm mt-1 max-w-xs">
                Choose a client policy from the left to draft and send a quarterly illustration request to the carrier.
              </p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* Policy header */}
              <div className="bg-[#0A1628] rounded-2xl px-6 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[#C9A84C] text-[10px] uppercase tracking-widest mb-1">
                      {selected.carrier} · {selected.product_name}
                    </p>
                    <h2 className="text-white text-lg font-medium">
                      {selected.clients?.name ?? "Client"}
                    </h2>
                    <div className="flex items-center gap-4 mt-1.5">
                      {selected.policy_number && (
                        <span className="text-slate-400 text-xs">Policy #{selected.policy_number}</span>
                      )}
                      <span className="text-slate-400 text-xs">{fmt(selected.face_amount)} face</span>
                      <span className="text-slate-400 text-xs">{fmt(selected.annual_premium)}/yr premium</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#C9A84C] text-xs mb-0.5">Advisor</p>
                    <p className="text-white text-sm font-medium">{selected.clients?.advisor ?? "—"}</p>
                    <div className="flex flex-col items-end gap-2 mt-1">
                    {sentThisQuarter(selected.id) && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-400">
                        <span>✓</span> {cq} request sent
                      </span>
                    )}
                    <button
                      onClick={handleGenerateDeck}
                      disabled={generatingDeck}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C96C] disabled:opacity-50 text-[#0A1628] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-colors whitespace-nowrap"
                    >
                      {generatingDeck ? (
                        <>
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Building Deck…
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Generate Review Deck
                        </>
                      )}
                    </button>
                  </div>
                  </div>
                </div>
              </div>

              {/* Compose new request */}
              <div className="bg-white rounded-2xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-[#0A1628] font-medium text-sm">
                    {sentThisQuarter(selected.id) ? "Send Another Request" : "Send Illustration Request"}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    AI will draft a professional email to the carrier service center requesting an updated inforce illustration.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Quarter</label>
                      <select
                        value={quarter}
                        onChange={(e) => setQuarter(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] transition-colors"
                      >
                        {QUARTER_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Carrier Service Email</label>
                      <input
                        type="email"
                        value={carrierEmail}
                        onChange={(e) => setCarrierEmail(e.target.value)}
                        placeholder="servicecenter@carrier.com"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-300"
                      />
                    </div>
                  </div>

                  {!emailDraft ? (
                    <button
                      onClick={handleGenerateDraft}
                      disabled={!carrierEmail || generating}
                      className={`w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors ${
                        !carrierEmail || generating
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-[#0A1628] hover:bg-[#1a3060] text-white"
                      }`}
                    >
                      {generating ? "Generating Draft…" : "Generate Email Draft with AI"}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Subject</label>
                        <input
                          type="text"
                          value={draftSubject}
                          onChange={(e) => setDraftSubject(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">
                          Email Body <span className="normal-case font-normal text-slate-300 ml-1">(editable)</span>
                        </label>
                        <textarea
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          rows={12}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] transition-colors font-mono resize-none"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setEmailDraft(""); setDraftSubject(""); setSendResult(null); }}
                          className="px-4 py-2.5 rounded-xl text-xs text-slate-500 border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          Regenerate
                        </button>
                        <button
                          onClick={handleSend}
                          disabled={sending}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors ${
                            sendResult === "success" ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                            : sendResult === "error" ? "bg-red-50 text-red-600 border border-red-200"
                            : sending ? "bg-[#C9A84C]/50 text-[#0A1628] cursor-not-allowed"
                            : "bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] shadow-sm"
                          }`}
                        >
                          {sendResult === "success" ? "✓ Request Sent to Carrier"
                            : sendResult === "error" ? "Send Failed — Retry"
                            : sending ? "Sending…"
                            : `Send to ${selected.carrier}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Request history */}
              {policyRequests(selected.id).length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-[#0A1628] font-medium text-sm">Request History</h3>
                    <span className="text-slate-400 text-xs">{policyRequests(selected.id).length} total</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {policyRequests(selected.id).map((req) => (
                      <div key={req.id} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[#0A1628] text-sm font-semibold">{req.quarter}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${STATUS_STYLES[req.status] ?? ""}`}>
                              {STATUS_LABELS[req.status] ?? req.status}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs">
                            {req.sent_at ? `Sent ${fmtDate(req.sent_at)}` : "Not yet sent"} · {req.carrier_email}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <details className="relative">
                            <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600 transition-colors list-none px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-300">
                              View Email
                            </summary>
                            <div className="absolute right-0 top-9 z-20 w-[480px] bg-white border border-gray-200 rounded-xl shadow-xl p-5">
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Subject</p>
                              <p className="text-sm text-[#0A1628] font-medium mb-4">{req.email_subject}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Body</p>
                              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                                {req.email_body}
                              </pre>
                            </div>
                          </details>

                          {(req.status === "sent" || req.status === "draft") && (
                            <>
                              <input
                                ref={activeUploadReq?.id === req.id ? uploadRef : undefined}
                                type="file"
                                accept=".pdf,.xls,.xlsx"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file && activeUploadReq) handleUpload(activeUploadReq, file);
                                }}
                              />
                              <button
                                onClick={() => { setActiveUploadReq(req); setTimeout(() => uploadRef.current?.click(), 50); }}
                                disabled={uploadingReqId === req.id}
                                className="text-xs px-3 py-1.5 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold rounded-lg transition-colors"
                              >
                                {uploadingReqId === req.id ? "Uploading…" : "Upload PDF"}
                              </button>
                            </>
                          )}

                          {req.status === "uploaded" && req.pdf_path && (
                            <button
                              onClick={async () => {
                                const { data } = await supabase.storage.from("client-documents").createSignedUrl(req.pdf_path!, 300);
                                if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                              }}
                              className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 font-semibold rounded-lg hover:bg-green-100 transition-colors"
                            >
                              View PDF
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
