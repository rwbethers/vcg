"use client";
import { useState } from "react";

const CAMPAIGN_TYPES = [
  { label: "Referral Campaign", desc: "Ask clients to refer friends & family" },
  { label: "Annual Policy Review", desc: "Remind clients to schedule their yearly review" },
  { label: "Private Market Announcement", desc: "Announce a new investment opportunity" },
  { label: "Premium Finance Introduction", desc: "Educate clients on premium finance strategies" },
  { label: "Holiday / Appreciation", desc: "Seasonal client appreciation message" },
  { label: "Custom", desc: "Write your own campaign brief" },
];

const AUDIENCES = [
  "All Clients",
  "Stephen Mongie's Clients",
  "Samuel Noel's Clients",
  "Zach McGlothin's Clients",
  "Whole Life Clients",
  "IUL Clients",
  "Custom — I'll specify below",
];

const TONES = [
  { label: "Professional & Formal", icon: "💼" },
  { label: "Warm & Personal", icon: "🤝" },
  { label: "Educational", icon: "📚" },
  { label: "Exciting / Opportunity-Focused", icon: "🚀" },
];

const ADVISORS = ["The VCG Team", "Stephen Mongie", "Samuel Noel", "Zach McGlothin"];

interface Output {
  subject: string;
  email: string;
  sms: string;
}

export default function MarketingTab() {
  const [campaignType, setCampaignType] = useState("");
  const [audience, setAudience] = useState("All Clients");
  const [tone, setTone] = useState("Warm & Personal");
  const [advisor, setAdvisor] = useState("The VCG Team");
  const [customNotes, setCustomNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editedSubject, setEditedSubject] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedSms, setEditedSms] = useState("");

  // Send state
  const [sendTo, setSendTo] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"success" | "error" | null>(null);
  const [copied, setCopied] = useState<"email" | "sms" | null>(null);

  const handleGenerate = async () => {
    if (!campaignType) return;
    setGenerating(true);
    setOutput(null);
    setError(null);
    setSendResult(null);

    const res = await fetch("/api/generate-marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignType, audience, tone, advisor, customNotes }),
    });

    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setOutput(data);
      setEditedSubject(data.subject);
      setEditedEmail(data.email);
      setEditedSms(data.sms);
    }
    setGenerating(false);
  };

  const handleSendEmail = async () => {
    if (!sendTo || !editedEmail) return;
    setSending(true);
    setSendResult(null);
    const emails = sendTo.split(",").map((e) => e.trim()).filter(Boolean);
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: emails,
        subject: editedSubject,
        body: editedEmail,
        fromName: advisor === "The VCG Team" ? "Vision Consulting Group" : advisor,
      }),
    });
    const data = await res.json();
    setSendResult(data.success ? "success" : "error");
    setSending(false);
    setTimeout(() => setSendResult(null), 5000);
  };

  const handleCopy = (type: "email" | "sms") => {
    navigator.clipboard.writeText(type === "email" ? `Subject: ${editedSubject}\n\n${editedEmail}` : editedSms);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const smsLength = editedSms.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light text-[#0A1628]">Marketing Studio</h1>
        <p className="text-slate-400 text-sm mt-1">Generate professional client communications in seconds. Edit, copy, or send directly from here.</p>
      </div>

      <div className="grid grid-cols-2 gap-8 items-start">

        {/* ── LEFT: Inputs ── */}
        <div className="space-y-6">

          {/* Campaign Type */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-[#0A1628] font-medium text-sm mb-4">Campaign Type</h2>
            <div className="space-y-2">
              {CAMPAIGN_TYPES.map((c) => (
                <button
                  key={c.label}
                  onClick={() => setCampaignType(c.label)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    campaignType === c.label
                      ? "border-[#C9A84C] bg-[#C9A84C]/5"
                      : "border-gray-100 hover:border-[#C9A84C]/40 bg-gray-50"
                  }`}
                >
                  <p className={`text-sm font-medium ${campaignType === c.label ? "text-[#0A1628]" : "text-slate-600"}`}>{c.label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-[#0A1628] font-medium text-sm mb-4">Target Audience</h2>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a}
                  onClick={() => setAudience(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    audience === a
                      ? "bg-[#0A1628] text-[#C9A84C]"
                      : "bg-gray-100 text-slate-500 hover:bg-gray-200"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Tone + Advisor */}
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-[#0A1628] font-medium text-sm mb-3">Tone</h2>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setTone(t.label)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      tone === t.label
                        ? "border-[#C9A84C] bg-[#C9A84C]/5 text-[#0A1628]"
                        : "border-gray-100 text-slate-500 hover:border-gray-200 bg-gray-50"
                    }`}
                  >
                    <span>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-[#0A1628] font-medium text-sm mb-3">Sign From</h2>
              <div className="flex flex-wrap gap-2">
                {ADVISORS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAdvisor(a)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      advisor === a
                        ? "bg-[#C9A84C] text-[#0A1628]"
                        : "bg-gray-100 text-slate-500 hover:bg-gray-200"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Notes */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-[#0A1628] font-medium text-sm mb-3">Additional Context <span className="text-slate-400 font-normal">(optional)</span></h2>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={3}
              placeholder="E.g. mention the new Sunbelt Multifamily Fund, focus on tax advantages, keep it brief..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-300 resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!campaignType || generating}
            className={`w-full py-4 rounded-2xl text-sm font-semibold tracking-widest uppercase transition-all ${
              !campaignType
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : generating
                ? "bg-[#C9A84C]/50 text-[#0A1628] cursor-wait"
                : "bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] shadow-sm"
            }`}
          >
            {generating ? "Generating…" : "✦ Generate Campaign"}
          </button>
        </div>

        {/* ── RIGHT: Output ── */}
        <div className="space-y-6">
          {!output && !generating && !error && (
            <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
              <p className="text-4xl mb-4">✦</p>
              <p className="text-slate-500 text-sm font-medium">Your campaign will appear here</p>
              <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">Select a campaign type and click Generate to create your email and SMS copy.</p>
            </div>
          )}

          {generating && (
            <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
              <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Writing your campaign…</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p className="text-red-600 text-sm font-medium">Generation failed</p>
              <p className="text-red-400 text-xs mt-1">{error}</p>
              {error.includes("ANTHROPIC_API_KEY") && (
                <p className="text-red-400 text-xs mt-3">Add <code className="bg-red-100 px-1 rounded">ANTHROPIC_API_KEY</code> to your Vercel environment variables.</p>
              )}
            </div>
          )}

          {output && (
            <>
              {/* Email Output */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>📧</span>
                    <h3 className="text-[#0A1628] font-medium text-sm">Email</h3>
                  </div>
                  <button
                    onClick={() => handleCopy("email")}
                    className="text-xs text-slate-400 hover:text-[#C9A84C] transition-colors px-3 py-1.5 border border-gray-200 rounded-lg hover:border-[#C9A84C]"
                  >
                    {copied === "email" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Subject Line</label>
                    <input
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#0A1628] font-medium focus:outline-none focus:border-[#C9A84C] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Body</label>
                    <textarea
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      rows={10}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed focus:outline-none focus:border-[#C9A84C] transition-colors resize-none"
                    />
                  </div>

                  {/* Send section */}
                  <div className="pt-2 border-t border-gray-100 space-y-3">
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Send To (comma-separated emails)</label>
                      <input
                        value={sendTo}
                        onChange={(e) => setSendTo(e.target.value)}
                        placeholder="client@email.com, another@email.com"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-300"
                      />
                    </div>
                    <button
                      onClick={handleSendEmail}
                      disabled={!sendTo || sending}
                      className={`w-full py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all ${
                        sendResult === "success" ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                        : sendResult === "error" ? "bg-red-50 text-red-600 border border-red-200"
                        : !sendTo ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-[#0A1628] hover:bg-[#0d1e3a] text-white"
                      }`}
                    >
                      {sendResult === "success" ? "✓ Email Sent"
                        : sendResult === "error" ? "Failed — Check API Key"
                        : sending ? "Sending…"
                        : "Send Email"}
                    </button>
                    {sendResult === "error" && (
                      <p className="text-xs text-red-400 text-center">Add <code className="bg-red-50 px-1 rounded">RESEND_API_KEY</code> to Vercel env vars.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SMS Output */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>💬</span>
                    <h3 className="text-[#0A1628] font-medium text-sm">SMS</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-1 ${
                      smsLength > 160 ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"
                    }`}>
                      {smsLength}/160
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy("sms")}
                    className="text-xs text-slate-400 hover:text-[#C9A84C] transition-colors px-3 py-1.5 border border-gray-200 rounded-lg hover:border-[#C9A84C]"
                  >
                    {copied === "sms" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  <textarea
                    value={editedSms}
                    onChange={(e) => setEditedSms(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed focus:outline-none focus:border-[#C9A84C] transition-colors resize-none"
                  />
                  <p className="text-slate-400 text-xs">SMS sending via Twilio — add <code className="bg-gray-100 px-1 rounded">TWILIO_ACCOUNT_SID</code>, <code className="bg-gray-100 px-1 rounded">TWILIO_AUTH_TOKEN</code>, and <code className="bg-gray-100 px-1 rounded">TWILIO_PHONE_NUMBER</code> to enable.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
