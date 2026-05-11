"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcLiveSnapshot } from "@/lib/illustrationCalc";

interface Client {
  id: string;
  name: string;
  advisor: string;
  stage?: string;
}

interface QuarterlyDeck {
  id: string;
  client_id: string;
  quarter: string;
  quarter_end_date: string;
  face_amount: number | null;
  annual_prem: number | null;
  prem_years: number | null;
  illustrated_rate: number | null;
  issue_age: number | null;
  policy_start_date: string | null;
  actual_cash_value: number | null;
  actual_death_benefit: number | null;
  actual_premiums_paid: number | null;
  index_used: string | null;
  index_return_pct: number | null;
  cap_rate_pct: number | null;
  floor_rate_pct: number | null;
  market_commentary: string | null;
  policy_notes: string | null;
  action_items: string | null;
  pdf_path: string | null;
  status: string;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
}

function getQuarterOptions(): string[] {
  const now = new Date();
  let q = Math.ceil((now.getMonth() + 1) / 3);
  let y = now.getFullYear();
  const opts: string[] = [];
  for (let i = 0; i < 8; i++) {
    opts.push(`Q${q} ${y}`);
    q--;
    if (q === 0) { q = 4; y--; }
  }
  return opts;
}

function quarterEndDate(quarter: string): string {
  const [qPart, yPart] = quarter.split(" ");
  const qNum = parseInt(qPart.replace("Q", ""));
  const year = parseInt(yPart);
  return new Date(year, qNum * 3, 0).toISOString().split("T")[0];
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const EMPTY_FORM = {
  quarter: "",
  face_amount: "",
  annual_prem: "",
  prem_years: "7",
  illustrated_rate: "7.0",
  issue_age: "",
  policy_start_date: "",
  actual_cash_value: "",
  actual_death_benefit: "",
  actual_premiums_paid: "",
  index_used: "",
  index_return_pct: "",
  cap_rate_pct: "",
  floor_rate_pct: "",
  market_commentary: "",
  policy_notes: "",
  action_items: "",
};

interface Props {
  clients: Client[];
  adminEmail: string;
}

export default function QuarterlyDeckTab({ clients, adminEmail }: Props) {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [decks, setDecks] = useState<QuarterlyDeck[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [tableReady, setTableReady] = useState(true);
  const pdfRef = useRef<HTMLInputElement>(null);
  const quarterOptions = getQuarterOptions();

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedClient) return;
    loadDecks(selectedClient.id);
  }, [selectedClient]);

  async function loadDecks(clientId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quarterly_decks")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if ((error as any)?.code === "42P01") {
      setTableReady(false);
      setDecks([]);
    } else {
      setTableReady(true);
      setDecks(data ?? []);
    }
  }

  function setField(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function getProjected() {
    if (!form.face_amount || !form.annual_prem || !form.policy_start_date) return null;
    try {
      return calcLiveSnapshot({
        faceAmount: parseInt(form.face_amount),
        annualPrem: parseInt(form.annual_prem),
        premYears: parseInt(form.prem_years) || 7,
        illustratedRate: parseFloat(form.illustrated_rate) || 7.0,
        issueAge: parseInt(form.issue_age) || 40,
        startDate: form.policy_start_date,
      });
    } catch {
      return null;
    }
  }

  async function handleSave(publish: boolean) {
    if (!selectedClient || !form.quarter) return;
    publish ? setPublishing(true) : setSaving(true);
    const supabase = createClient();

    let pdfPath: string | null = null;
    if (pdfFile) {
      const path = `${selectedClient.id}/quarterly-decks/${Date.now()}_${pdfFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("client-documents")
        .upload(path, pdfFile);
      if (!uploadErr) pdfPath = path;
    }

    const payload: Record<string, unknown> = {
      client_id: selectedClient.id,
      quarter: form.quarter,
      quarter_end_date: quarterEndDate(form.quarter),
      face_amount: form.face_amount ? parseInt(form.face_amount) : null,
      annual_prem: form.annual_prem ? parseInt(form.annual_prem) : null,
      prem_years: form.prem_years ? parseInt(form.prem_years) : 7,
      illustrated_rate: form.illustrated_rate ? parseFloat(form.illustrated_rate) : 7.0,
      issue_age: form.issue_age ? parseInt(form.issue_age) : null,
      policy_start_date: form.policy_start_date || null,
      actual_cash_value: form.actual_cash_value ? parseFloat(form.actual_cash_value) : null,
      actual_death_benefit: form.actual_death_benefit ? parseFloat(form.actual_death_benefit) : null,
      actual_premiums_paid: form.actual_premiums_paid ? parseFloat(form.actual_premiums_paid) : null,
      index_used: form.index_used || null,
      index_return_pct: form.index_return_pct ? parseFloat(form.index_return_pct) : null,
      cap_rate_pct: form.cap_rate_pct ? parseFloat(form.cap_rate_pct) : null,
      floor_rate_pct: form.floor_rate_pct ? parseFloat(form.floor_rate_pct) : null,
      market_commentary: form.market_commentary || null,
      policy_notes: form.policy_notes || null,
      action_items: form.action_items || null,
      pdf_path: pdfPath,
      status: publish ? "published" : "draft",
      published_at: publish ? new Date().toISOString() : null,
      created_by: adminEmail,
    };

    const { error } = await supabase.from("quarterly_decks").insert(payload);
    setSaving(false);
    setPublishing(false);
    if (!error) {
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setPdfFile(null);
      loadDecks(selectedClient.id);
    }
  }

  async function handlePublishDraft(deckId: string) {
    const supabase = createClient();
    await supabase.from("quarterly_decks").update({
      status: "published",
      published_at: new Date().toISOString(),
    }).eq("id", deckId);
    if (selectedClient) loadDecks(selectedClient.id);
  }

  async function handleDelete(deckId: string) {
    if (!confirm("Delete this deck? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.from("quarterly_decks").delete().eq("id", deckId);
    if (selectedClient) loadDecks(selectedClient.id);
  }

  const projected = getProjected();

  const baselineFields = [
    { key: "face_amount", label: "Face Amount", placeholder: "2000000" },
    { key: "annual_prem", label: "Annual Premium", placeholder: "25000" },
    { key: "prem_years", label: "Premium Years", placeholder: "7" },
    { key: "illustrated_rate", label: "Illustrated Rate %", placeholder: "7.0" },
    { key: "issue_age", label: "Issue Age", placeholder: "40" },
    { key: "policy_start_date", label: "Policy Start Date", placeholder: "", type: "date" },
  ] as const;

  const actualFields = [
    { key: "actual_cash_value", label: "Actual Cash Value" },
    { key: "actual_death_benefit", label: "Actual Death Benefit" },
    { key: "actual_premiums_paid", label: "Premiums Paid to Date" },
  ] as const;

  const indexFields = [
    { key: "index_return_pct", label: "Index Return %" },
    { key: "cap_rate_pct", label: "Cap Rate %" },
    { key: "floor_rate_pct", label: "Floor Rate %" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light text-[#0A1628]">Quarterly Decks</h1>
        <p className="text-slate-400 text-sm mt-1">Generate and publish quarterly policy reviews — clients see them instantly in their portal</p>
      </div>

      {!tableReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm font-medium">Setup required</p>
          <p className="text-amber-700 text-sm mt-1">
            Run the SQL in <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">policy_review_schema.sql</code> in your{" "}
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase SQL Editor</a>{" "}
            to create the <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">quarterly_decks</code> table.
          </p>
        </div>
      )}

      <div className="flex gap-6" style={{ minHeight: "600px" }}>
        {/* Left: client list */}
        <div className="w-72 flex-shrink-0 space-y-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors"
          />
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {filteredClients.length === 0 ? (
              <p className="px-4 py-6 text-center text-slate-400 text-sm">No clients found</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredClients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedClient(c); setShowForm(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                      selectedClient?.id === c.id
                        ? "bg-[#C9A84C]/8 border-l-2 border-[#C9A84C]"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#C9A84C] text-[10px] font-semibold">
                        {c.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#0A1628] text-sm font-medium truncate">{c.name}</p>
                      <p className="text-slate-400 text-[10px]">{c.advisor.split(" ")[1]}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: deck form + history */}
        <div className="flex-1 space-y-4">
          {!selectedClient ? (
            <div className="bg-white rounded-2xl shadow-sm h-64 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-3 opacity-20">◈</p>
                <p className="text-slate-500 text-sm font-medium">Select a client to manage their quarterly decks</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-[#0A1628]">{selectedClient.name}</h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {decks.length} deck{decks.length !== 1 ? "s" : ""} · {selectedClient.advisor}
                  </p>
                </div>
                {!showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl transition-colors"
                  >
                    + New Deck
                  </button>
                )}
              </div>

              {/* New deck form */}
              {showForm && (
                <div className="bg-white rounded-2xl shadow-sm p-6 space-y-7">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[#0A1628] font-medium">Create Quarterly Deck</h3>
                    <button onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setPdfFile(null); }}
                      className="text-slate-400 text-xs hover:text-slate-600 transition-colors">
                      Cancel
                    </button>
                  </div>

                  {/* Quarter selector */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">Quarter</label>
                    <div className="flex flex-wrap gap-2">
                      {quarterOptions.slice(0, 6).map(q => (
                        <button
                          key={q}
                          onClick={() => setField("quarter", q)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            form.quarter === q
                              ? "bg-[#C9A84C] text-[#0A1628]"
                              : "bg-gray-100 text-slate-600 hover:bg-gray-200"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Policy baseline */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Policy Baseline</p>
                    <div className="grid grid-cols-3 gap-3">
                      {baselineFields.map(f => (
                        <div key={f.key}>
                          <label className="block text-[10px] text-slate-500 mb-1">{f.label}</label>
                          <input
                            type={("type" in f ? f.type : "text") as string}
                            value={form[f.key]}
                            onChange={e => setField(f.key, e.target.value)}
                            placeholder={f.placeholder}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                    {projected && (
                      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex gap-6">
                        <div>
                          <p className="text-blue-400 text-[10px] uppercase tracking-widest">Projected CV Now</p>
                          <p className="font-semibold text-[#0A1628] text-sm mt-0.5">{fmt(projected.projectedCV)}</p>
                        </div>
                        <div>
                          <p className="text-blue-400 text-[10px] uppercase tracking-widest">Projected DB Now</p>
                          <p className="font-semibold text-[#0A1628] text-sm mt-0.5">{fmt(projected.projectedDB)}</p>
                        </div>
                        <div>
                          <p className="text-blue-400 text-[10px] uppercase tracking-widest">Policy Year</p>
                          <p className="font-semibold text-[#0A1628] text-sm mt-0.5">{projected.policyYear}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actual performance */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Actual Performance from Carrier</p>
                    <div className="grid grid-cols-3 gap-3">
                      {actualFields.map(f => (
                        <div key={f.key}>
                          <label className="block text-[10px] text-slate-500 mb-1">{f.label}</label>
                          <input
                            type="text"
                            value={form[f.key]}
                            onChange={e => setField(f.key, e.target.value)}
                            placeholder="0"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Index performance */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                      Index Performance
                      <span className="normal-case font-normal text-slate-300 ml-2">optional</span>
                    </p>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div className="col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-1">Index Used</label>
                        <input
                          value={form.index_used}
                          onChange={e => setField("index_used", e.target.value)}
                          placeholder="e.g. S&P 500 Point-to-Point Cap"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors"
                        />
                      </div>
                      {indexFields.map(f => (
                        <div key={f.key}>
                          <label className="block text-[10px] text-slate-500 mb-1">{f.label}</label>
                          <input
                            type="text"
                            value={form[f.key]}
                            onChange={e => setField(f.key, e.target.value)}
                            placeholder="0.0"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Advisor content */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Advisor Content</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Market Commentary</label>
                        <textarea
                          value={form.market_commentary}
                          onChange={e => setField("market_commentary", e.target.value)}
                          placeholder="Your perspective on market conditions, how the index performed, and what it means for this policy…"
                          rows={3}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] resize-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Policy Notes</label>
                        <textarea
                          value={form.policy_notes}
                          onChange={e => setField("policy_notes", e.target.value)}
                          placeholder="Anything notable about this client's policy — premium schedule, upcoming decisions, etc."
                          rows={2}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] resize-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">
                          Action Items
                          <span className="text-slate-300 ml-2 font-normal normal-case">one per line</span>
                        </label>
                        <textarea
                          value={form.action_items}
                          onChange={e => setField("action_items", e.target.value)}
                          placeholder={"Review beneficiary designations\nSchedule annual policy review\nConfirm premium payment schedule"}
                          rows={3}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] resize-none font-mono transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PDF upload */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                      Carrier Illustration PDF
                      <span className="normal-case font-normal text-slate-300 ml-2">optional</span>
                    </p>
                    <div
                      onClick={() => pdfRef.current?.click()}
                      className={`mt-2 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                        pdfFile
                          ? "border-green-400 bg-green-50"
                          : "border-gray-200 hover:border-[#C9A84C] hover:bg-[#C9A84C]/5"
                      }`}
                    >
                      <input
                        ref={pdfRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && setPdfFile(e.target.files[0])}
                      />
                      {pdfFile ? (
                        <div>
                          <p className="text-green-700 text-sm font-medium">{pdfFile.name}</p>
                          <button
                            onClick={e => { e.stopPropagation(); setPdfFile(null); }}
                            className="text-slate-400 text-xs mt-1 hover:text-slate-600 underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-slate-500 text-sm">Click to attach carrier illustration PDF</p>
                          <p className="text-slate-400 text-xs mt-0.5">Clients can download the original document</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleSave(false)}
                      disabled={!form.quarter || saving || publishing}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-slate-600 hover:border-[#C9A84C] hover:text-[#0A1628] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving…" : "Save Draft"}
                    </button>
                    <button
                      onClick={() => handleSave(true)}
                      disabled={!form.quarter || saving || publishing}
                      className="flex-1 py-2.5 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {publishing ? "Publishing…" : "Publish to Client"}
                    </button>
                  </div>
                </div>
              )}

              {/* Deck history */}
              {decks.length === 0 && !showForm ? (
                <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                  <p className="text-4xl mb-3 opacity-20">◈</p>
                  <p className="text-slate-500 text-sm font-medium">No decks yet for {selectedClient.name}</p>
                  <p className="text-slate-400 text-xs mt-1">Click "+ New Deck" to create the first quarterly review</p>
                </div>
              ) : decks.length > 0 ? (
                <div className="space-y-3">
                  {!showForm && <p className="text-[10px] uppercase tracking-widest text-slate-400">Deck History</p>}
                  {decks.map(deck => (
                    <div key={deck.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#0A1628] font-medium">{deck.quarter}</span>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                            deck.status === "published"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {deck.status === "published" ? "Published" : "Draft"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          {deck.actual_cash_value != null && (
                            <span className="text-xs text-slate-400">CV {fmt(deck.actual_cash_value)}</span>
                          )}
                          {deck.actual_death_benefit != null && (
                            <span className="text-xs text-slate-400">DB {fmt(deck.actual_death_benefit)}</span>
                          )}
                          {deck.index_used && (
                            <span className="text-xs text-slate-400">{deck.index_used}</span>
                          )}
                          <span className="text-xs text-slate-300">Created {fmtDate(deck.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {deck.status === "draft" && (
                          <button
                            onClick={() => handlePublishDraft(deck.id)}
                            className="text-xs px-3 py-1.5 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold rounded-lg transition-colors"
                          >
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(deck.id)}
                          className="text-xs px-3 py-1.5 text-slate-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
