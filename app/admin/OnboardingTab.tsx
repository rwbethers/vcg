"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const advisors = ["Stephen Mongie", "Samuel Noel", "Zach McGlothin"];
const steps = ["Client Info", "Send Invite", "Done"];

interface FormData {
  name: string;
  email: string;
  state: string;
  type: string;
  advisor: string;
  member_since: string;
}

const blank: FormData = {
  name: "", email: "", state: "", type: "Individual", advisor: "Stephen Mongie", member_since: new Date().getFullYear().toString(),
};

export default function OnboardingTab() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClient, setCreatedClient] = useState<{ name: string; email: string } | null>(null);

  const handleCreateClient = async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: dbError } = await supabase.from("clients").insert({
      name: form.name,
      email: form.email,
      state: form.state,
      type: form.type,
      advisor: form.advisor,
      member_since: form.member_since,
    }).select().single();
    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }
    setCreatedClient({ name: form.name, email: form.email });
    setStep(1);
    setSaving(false);
  };

  const handleSendInvite = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/invite-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, name: form.name, advisor: form.advisor }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      setSaving(false);
      return;
    }
    setStep(2);
    setSaving(false);
  };

  const reset = () => {
    setStep(0);
    setForm(blank);
    setCreatedClient(null);
    setError(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-light text-[#0A1628]">Client Onboarding</h1>
        <p className="text-slate-400 text-sm mt-1">Add a new client to the portal and send them their login invite.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              i < step ? "bg-green-400 text-white"
              : i === step ? "bg-[#C9A84C] text-[#0A1628]"
              : "bg-gray-100 text-slate-400"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === step ? "text-[#0A1628]" : "text-slate-400"}`}>{s}</span>
            {i < steps.length - 1 && <div className={`w-12 h-0.5 ${i < step ? "bg-green-400" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Client Info */}
      {step === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <h3 className="text-[#0A1628] font-medium">Client Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Full Name *</label>
              <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="John Smith"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="john@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">State</label>
              <input value={form.state} onChange={(e) => setForm(p => ({ ...p, state: e.target.value }))}
                placeholder="UT"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Member Since</label>
              <input value={form.member_since} onChange={(e) => setForm(p => ({ ...p, member_since: e.target.value }))}
                placeholder="2024"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Account Type</label>
              <select value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]">
                {["Individual", "Individual / Trust", "Individual / Plan", "Business"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Assigned Advisor</label>
              <select value={form.advisor} onChange={(e) => setForm(p => ({ ...p, advisor: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]">
                {advisors.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button onClick={handleCreateClient} disabled={!form.name || !form.email || saving}
            className="w-full py-3 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] rounded-xl text-xs font-semibold uppercase tracking-widest disabled:opacity-50 transition-colors">
            {saving ? "Creating…" : "Create Client Account →"}
          </button>
        </div>
      )}

      {/* Step 1: Send Invite */}
      {step === 1 && createdClient && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
            <span className="text-green-500 text-xl">✓</span>
            <div>
              <p className="text-green-700 text-sm font-medium">Client account created</p>
              <p className="text-green-600 text-xs mt-0.5">{createdClient.name} · {createdClient.email}</p>
            </div>
          </div>
          <div>
            <h3 className="text-[#0A1628] font-medium mb-2">Send Portal Invite</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              This will send a magic link to <strong>{createdClient.email}</strong> so they can log into their dashboard. The link expires after 24 hours.
            </p>
            <p className="text-amber-600 text-xs mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
              Requires <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in your Vercel environment variables to send the invite email.
            </p>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-slate-500 text-xs font-medium hover:bg-gray-50">
              Skip for now
            </button>
            <button onClick={handleSendInvite} disabled={saving}
              className="flex-1 py-3 bg-[#0A1628] hover:bg-[#0d1e3a] text-white rounded-xl text-xs font-semibold uppercase tracking-widest disabled:opacity-50 transition-colors">
              {saving ? "Sending…" : "Send Invite Email →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Done */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <span className="text-green-500 text-3xl">✓</span>
          </div>
          <h3 className="text-[#0A1628] text-lg font-medium">Client Onboarded</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            {createdClient?.name} has been added to the portal. Once they click their invite link, they can access their dashboard.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={reset}
              className="px-6 py-2.5 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors">
              Onboard Another Client
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
