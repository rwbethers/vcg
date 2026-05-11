"use client";
import { useState } from "react";
import ProspectGapCalc from "./ProspectGapCalc";
import ProspectCostOfWaiting from "./ProspectCostOfWaiting";
import ProspectTaxCalc from "./ProspectTaxCalc";
import ProspectWealthScore from "./ProspectWealthScore";
import ProspectCaseStudies from "./ProspectCaseStudies";
import ProspectWealthAudit from "./ProspectWealthAudit";
import ProspectPolicyReviews from "./ProspectPolicyReviews";
import ProspectQuarterlyDeck from "./ProspectQuarterlyDeck";

interface Client {
  id: string;
  name: string;
  advisor: string;
  stage: string;
}

interface Props {
  client: Client;
  isAdminPreview?: boolean;
}

const advisorEmails: Record<string, string> = {
  "Stephen Mongie": "smongie@vcgclient.com",
  "Samuel Noel": "snoel@vcgclient.com",
  "Zach McGlothin": "zmcglothin@vcgclient.com",
};

const navItems = [
  { key: "illustration", label: "My Dashboard",        icon: "◑", sub: "Your personalized projection" },
  { key: "gap",          label: "Coverage Gap",        icon: "◈", sub: "How much are you missing?" },
  { key: "waiting",      label: "Cost of Waiting",     icon: "⟲", sub: "What delay costs you" },
  { key: "tax",          label: "Tax Analysis",        icon: "⟁", sub: "What taxes take from you" },
  { key: "audit",        label: "Wealth Audit",        icon: "▦", sub: "Protected vs exposed" },
  { key: "reviews",      label: "Policy Reviews",      icon: "◎", sub: "Weekly & monthly updates" },
  { key: "quarterly",   label: "Quarterly Report",    icon: "◈", sub: "Your advisor's quarterly deck" },
];

export default function ProspectDashboard({ client, isAdminPreview = false }: Props) {
  const [activeNav, setActiveNav] = useState("illustration");
  const [contactSent, setContactSent] = useState(false);

  const firstName = client.name.split(" ")[0];
  const advisorEmail = advisorEmails[client.advisor] ?? "advisor@vcgclient.com";

  const defaultConfig = {
    name: client.name,
    product: "Lincoln OptiBlend Fixed Indexed UL",
    carrier: "Lincoln Financial",
    advisor: client.advisor,
    issueAge: 40,
    faceAmount: 2000000,
    annualPrem: 25000,
    premYears: 7,
    illustratedRate: 7.0,
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  };
  const viewerUrl = `/illustration-viewer.html?c=${btoa(JSON.stringify(defaultConfig))}`;

  const handleSchedule = () => setContactSent(true);

  const currentNav = navItems.find(n => n.key === activeNav)!;

  return (
    <div className="flex h-screen bg-[#F4F5F7] overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 bg-[#0A1628] flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-[#1a3060]">
          <div className="bg-white rounded-xl px-4 py-3 inline-block">
            <img src="/vcg-logo.png" alt="Vision Consulting Group" className="h-8 w-auto" />
          </div>
        </div>

        <div className="px-6 py-5 border-b border-[#1a3060]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400 text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 bg-blue-400/10 rounded-full border border-blue-400/20">
              Member Preview
            </span>
          </div>
          <p className="text-white text-sm font-medium">{client.name}</p>
          <p className="text-slate-500 text-xs mt-0.5">Advisor: {client.advisor.split(" ")[1]}</p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setActiveNav(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                activeNav === item.key
                  ? "bg-[#C9A84C]/10 text-[#C9A84C]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}>
              <span className="text-base leading-none flex-shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-sm leading-tight truncate">{item.label}</p>
                <p className={`text-[10px] leading-tight mt-0.5 ${activeNav === item.key ? "text-[#C9A84C]/60" : "text-slate-600"}`}>
                  {item.sub}
                </p>
              </div>
            </button>
          ))}
        </nav>

        {/* Advisor CTA */}
        <div className="px-5 py-5 border-t border-[#1a3060] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#C9A84C] text-xs font-semibold">
                {client.advisor.split(" ").map(w => w[0]).join("")}
              </span>
            </div>
            <div>
              <p className="text-white text-xs font-medium">{client.advisor}</p>
              <p className="text-slate-500 text-[10px]">Your Advisor</p>
            </div>
          </div>
          {contactSent ? (
            <div className="bg-green-400/10 border border-green-400/20 rounded-xl px-3 py-2.5 text-center">
              <p className="text-green-400 text-xs font-medium">✓ Request sent</p>
              <p className="text-slate-500 text-[10px] mt-0.5">They'll be in touch shortly</p>
            </div>
          ) : (
            <button onClick={handleSchedule}
              className="w-full py-2.5 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-[10px] uppercase tracking-widest rounded-xl transition-colors">
              Schedule a Call
            </button>
          )}
          {isAdminPreview ? (
            <a href="/admin" className="block w-full text-center text-[#C9A84C] text-[10px] hover:text-[#E8C96C] transition-colors">
              ← Exit Admin Preview
            </a>
          ) : (
            <form action="/auth/signout" method="POST">
              <button type="submit" className="w-full text-slate-600 text-[10px] hover:text-slate-400 transition-colors">
                ← Sign out
              </button>
            </form>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-[#0A1628] text-lg font-medium">{currentNav.label}</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {activeNav === "illustration"
                ? `Personalized for ${firstName} · Adjust any number to model your scenario`
                : currentNav.sub}
            </p>
          </div>
          <span className="text-blue-500 text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 bg-blue-50 rounded-full">
            VCG Member Preview
          </span>
        </div>

        <div className="px-8 py-8">

          {/* Illustration */}
          {activeNav === "illustration" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: "760px" }}>
                <iframe src={viewerUrl} className="w-full h-full border-0" title="Policy Illustration" />
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
                <div>
                  <p className="text-[#0A1628] font-medium text-sm">These are your personalized numbers</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Use the tools in the sidebar to understand your full financial picture — then schedule a call to build a real plan.
                  </p>
                </div>
                <button onClick={handleSchedule}
                  className="flex-shrink-0 ml-6 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-colors">
                  {contactSent ? "✓ Request Sent" : "Schedule a Call"}
                </button>
              </div>
              <p className="text-slate-400 text-[10px] text-center">
                Illustration is for educational purposes only. Numbers are not a guarantee of future performance.
              </p>
            </div>
          )}

          {activeNav === "gap" && (
            <ProspectGapCalc onSchedule={handleSchedule} />
          )}

          {activeNav === "waiting" && (
            <ProspectCostOfWaiting onSchedule={handleSchedule} />
          )}

          {activeNav === "tax" && (
            <ProspectTaxCalc onSchedule={handleSchedule} />
          )}

          {activeNav === "audit" && (
            <ProspectWealthAudit onSchedule={handleSchedule} />
          )}

          {activeNav === "reviews" && (
            <ProspectPolicyReviews clientId={client.id} onSchedule={handleSchedule} />
          )}

          {activeNav === "quarterly" && (
            <ProspectQuarterlyDeck
              clientId={client.id}
              clientName={client.name}
              advisorName={client.advisor}
              onSchedule={handleSchedule}
            />
          )}

        </div>
      </main>
    </div>
  );
}
