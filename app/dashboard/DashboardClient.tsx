"use client";
import { useState, useRef } from "react";
import TaxStrategySection from "./TaxStrategySection";
import ContactAdvisorSection from "./ContactAdvisorSection";
import PrivateMarketsSection from "./PrivateMarketsSection";
import DocumentsSection from "./DocumentsSection";
import CollateralAccountSection from "./CollateralAccountSection";
import IndexCreditingWidget from "./IndexCreditingWidget";
import MarketSummaryCards from "./MarketSummaryCards";
import PremiumFinanceLoanSection from "./PremiumFinanceLoanSection";

interface Client {
  id: string;
  name: string;
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
  insured_name: string;
  owner_name: string;
  owner_type: string;
  issue_date: string;
  issue_age: number;
  rate_class: string;
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

interface ActionItem {
  id: string;
  label: string;
  due_date: string;
  priority: string;
  completed: boolean;
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
  highlights: string[];
  image_url: string;
}

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

interface Announcement {
  id: string;
  message: string;
  type: string;
}

interface Illustration {
  id: string;
  prospect_name: string;
  carrier: string;
  product_name: string;
  advisor_name: string;
  issue_age: number;
  face_amount: number;
  annual_prem: number;
  prem_years: number;
  illustrated_rate: number;
  created_at: string;
}

interface CollateralAccount {
  id: string;
  lender: string;
  loan_amount: number;
  loan_balance: number;
  interest_rate: number;
  collateral_value: number;
  required_ratio: number;
  status: string;
  notes: string | null;
  policy_id: string | null;
}

interface Props {
  client: Client;
  policies: Policy[];
  actionItems: ActionItem[];
  deals: Deal[];
  documents: Document[];
  announcement: Announcement | null;
  illustration: Illustration | null;
  collateralAccounts: CollateralAccount[];
  policyIllustrationUrls?: Record<string, string>;
}

const statusColors: Record<string, string> = {
  Active: "bg-green-50 text-green-700",
  Surrendered: "bg-gray-100 text-gray-500",
  Lapsed: "bg-red-50 text-red-600",
  "Under Review": "bg-yellow-50 text-yellow-700",
};

const fmt = (n: number) =>
  !n || n === 0 ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtPayUp = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const navItems = [
  { label: "Overview", icon: "▦" },
  { label: "Premium Finance Loan", icon: "⬢" },
  { label: "Collateral Account", icon: "⬡" },
  { label: "Policies", icon: "◈" },
  { label: "My Dashboard", icon: "◑" },
  { label: "Policy Performance", icon: "◎" },
  { label: "Tax Strategy", icon: "⟁" },
  { label: "Private Markets", icon: "◉" },
  { label: "Documents", icon: "⊟" },
  { label: "Contact Advisor", icon: "◇" },
];

const highlights = [
  "Penn Mutual Flexible Choice Whole Life provides guaranteed death benefit with growing paid-up additions",
  "Policy is set to pay up at age 65 — premiums end, coverage remains permanent",
  "Cash value grows tax-deferred and can be accessed via policy loans income-tax-free",
  "Dividends reinvested as Paid-Up Additions increase both cash value and death benefit each year",
  "Trust ownership (Malia Andelin Rev Trust) keeps policy proceeds outside of taxable estate",
];

const sectionTitles: Record<string, { title: string; sub: string }> = {
  Overview: { title: "Portfolio Overview", sub: "Values sourced from carrier statements · All values in USD" },
  Policies: { title: "My Policies", sub: "Full detail on each insurance policy in your portfolio" },
  "My Dashboard": { title: "My Dashboard", sub: "Long-term projections · Estate value analysis" },
  "Policy Performance": { title: "Policy Performance", sub: "Your policy in the market today" },
  "Tax Strategy": { title: "Tax Strategy", sub: "How your portfolio is structured to minimize taxes" },
  "Private Markets": { title: "Private Markets", sub: "Exclusive investment opportunities curated for VCG clients" },
  Documents: { title: "Documents", sub: "Statements, illustrations, and policy documents" },
  "Premium Finance Loan": { title: "Premium Finance Loan", sub: "Loan details · Interest rate · Refinance options" },
  "Collateral Account": { title: "Collateral Account", sub: "Pledged collateral positions and coverage ratios" },
  "Contact Advisor": { title: "Contact Your Advisor", sub: "Reach out to your Vision Consulting Group team" },
};

const announcementStyles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  info:    { bg: "bg-blue-50",   text: "text-blue-700",  border: "border-blue-200",  icon: "ℹ️" },
  success: { bg: "bg-green-50",  text: "text-green-700", border: "border-green-200", icon: "✓" },
  warning: { bg: "bg-amber-50",  text: "text-amber-700", border: "border-amber-200", icon: "⚠" },
};

function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const style = announcementStyles[announcement.type] ?? announcementStyles.info;
  return (
    <div className={`mx-8 mt-4 ${style.bg} ${style.border} border rounded-xl px-5 py-3.5 flex items-center gap-3`}>
      <span className="text-lg flex-shrink-0">{style.icon}</span>
      <p className={`${style.text} text-sm flex-1`}>{announcement.message}</p>
      <button onClick={() => setDismissed(true)} className={`${style.text} opacity-50 hover:opacity-100 text-lg leading-none flex-shrink-0`}>×</button>
    </div>
  );
}

export default function DashboardClient({ client, policies, actionItems, deals, documents, announcement, illustration, collateralAccounts, policyIllustrationUrls = {} }: Props) {
  const [activeNav, setActiveNav] = useState("Overview");
  const [projTab, setProjTab] = useState<"policy" | "projections" | "estate">("policy");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const scrollIframeTo = (sectionId: string) => {
    const iframe = iframeRef.current;
    const main = mainRef.current;
    if (!iframe || !main) return;
    const tryScroll = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const el = doc.getElementById(sectionId);
        if (!el) return;
        let elTop = 0;
        let node: HTMLElement | null = el;
        while (node && node !== doc.body) {
          elTop += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        let iframeTop = 0;
        let cur: HTMLElement | null = iframe;
        while (cur && cur !== main) {
          iframeTop += cur.offsetTop;
          cur = cur.offsetParent as HTMLElement | null;
        }
        main.scrollTo({ top: iframeTop + elTop - 80, behavior: "smooth" });
      } catch { /* cross-origin guard */ }
    };
    if (iframe.contentDocument?.readyState === "complete") {
      tryScroll();
    } else {
      iframe.addEventListener("load", tryScroll, { once: true });
    }
  };

  const illustrationConfig = illustration ? {
    name: client.name,
    product: illustration.product_name,
    carrier: illustration.carrier,
    advisor: illustration.advisor_name,
    issueAge: illustration.issue_age,
    faceAmount: illustration.face_amount,
    annualPrem: illustration.annual_prem,
    premYears: illustration.prem_years,
    illustratedRate: Number(illustration.illustrated_rate),
    date: new Date(illustration.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  } : {
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
  const illustrationUrl = `/illustration-viewer.html?c=${btoa(JSON.stringify(illustrationConfig))}`;

  const activePolicies = policies.filter((p) => p.status === "Active");
  const totalDeathBenefit = activePolicies.reduce((s, p) => s + (p.death_benefit ?? 0), 0);
  const totalCashValue = activePolicies.reduce((s, p) => s + (p.cash_value ?? 0), 0);
  const totalNetCashValue = activePolicies.reduce((s, p) => s + (p.net_cash_value ?? 0), 0);
  const totalPremium = activePolicies.reduce((s, p) => s + (p.annual_premium ?? 0), 0);

  const activeCollateral = collateralAccounts.filter((a) => a.status === "active");
  const collateralNet = activeCollateral.reduce(
    (s, a) => s + (a.collateral_value - a.loan_balance * a.required_ratio),
    0
  );
  const hasCollateral = activeCollateral.length > 0;

  const metrics = [
    { label: "Total Death Benefit", value: fmt(totalDeathBenefit), sub: `${activePolicies.length} active ${activePolicies.length === 1 ? "policy" : "policies"}` },
    { label: "Total Cash Value", value: fmt(totalCashValue), sub: "As of last statement" },
    { label: "Net Cash Value", value: fmt(totalNetCashValue), sub: "After loans" },
    { label: "Annual Premium", value: fmt(totalPremium), sub: "Current year" },
  ];

  const section = sectionTitles[activeNav] ?? sectionTitles["Overview"];

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
          <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Client Portal</p>
          <p className="text-white text-sm font-medium">{client.name}</p>
          <p className="text-slate-500 text-xs mt-0.5">{client.type} · Member since {client.member_since}</p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveNav(item.label)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all text-left ${
                activeNav === item.label
                  ? "bg-[#C9A84C]/10 text-[#C9A84C]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-6 py-5 border-t border-[#1a3060]">
          <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-2">Your Advisor</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#C9A84C] text-xs font-semibold">
                {client.advisor.split(" ").map((w) => w[0]).join("")}
              </span>
            </div>
            <div>
              <p className="text-white text-xs font-medium">{client.advisor}</p>
              <p className="text-slate-500 text-[10px]">Senior Strategist</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-5">
          <form action="/auth/signout" method="POST">
            <button type="submit" className="text-slate-600 text-xs hover:text-slate-400 transition-colors">
              ← Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-[#0A1628] text-lg font-medium">{section.title}</h1>
            <p className="text-slate-400 text-xs mt-0.5">{section.sub}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
              {activePolicies.length} Active {activePolicies.length === 1 ? "Policy" : "Policies"}
            </span>
          </div>
        </div>

        {/* Announcement Banner */}
        {announcement && (
          <AnnouncementBanner announcement={announcement} />
        )}

        <div className="px-8 py-8 space-y-8">

          {/* ── OVERVIEW ── */}
          {activeNav === "Overview" && (
            <>
              <div>
                <h2 className="text-2xl font-light text-[#0A1628]">
                  Good morning, <span className="font-medium">{client.name.split(" ")[0]}.</span>
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Your permanent life insurance portfolio provides lasting protection and tax-advantaged growth. Here&apos;s your current position.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-5">
                {metrics.map((m) => (
                  <div key={m.label} className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-[#C9A84C]">
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">{m.label}</p>
                    <p className="text-[#0A1628] text-xl font-light mb-1.5">{m.value}</p>
                    <p className="text-xs text-slate-400">{m.sub}</p>
                  </div>
                ))}
              </div>

              <MarketSummaryCards cashValue={totalCashValue} />

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-[#0A1628] font-medium text-sm">Insurance Policies</h3>
                    <p className="text-slate-400 text-xs mt-0.5">All figures from most recent carrier statements</p>
                  </div>
                  <span className="text-xs text-slate-400">{policies.length} {policies.length === 1 ? "policy" : "policies"}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F4F5F7]">
                        {["Policy #", "Carrier", "Product", "Owner", "Face Amount", "Death Benefit", "Cash Value", "Loan", "Net CV", "Annual Premium", "Pay-Up", "Status"].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {policies.map((p) => (
                        <tr key={p.id} className="hover:bg-[#FAFBFC] transition-colors">
                          <td className="px-5 py-4">
                            <p className="text-[#0A1628] text-sm font-medium whitespace-nowrap">{p.policy_number}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{p.product_type}</p>
                          </td>
                          <td className="px-5 py-4 text-slate-600 text-sm whitespace-nowrap">{p.carrier}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <p className="text-slate-700 text-xs leading-tight max-w-[140px]">{p.product_name}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">Issued {fmtDate(p.issue_date)}</p>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <p className="text-slate-600 text-xs">{p.owner_name}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">{p.owner_type}</p>
                          </td>
                          <td className="px-5 py-4 text-slate-700 text-sm whitespace-nowrap">{fmt(p.face_amount)}</td>
                          <td className="px-5 py-4 whitespace-nowrap"><span className="text-[#C9A84C] text-sm font-semibold">{fmt(p.death_benefit)}</span></td>
                          <td className="px-5 py-4 text-slate-700 text-sm whitespace-nowrap">{fmt(p.cash_value)}</td>
                          <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">{fmt(p.loan_balance)}</td>
                          <td className="px-5 py-4 whitespace-nowrap"><span className="text-green-600 text-sm font-semibold">{fmt(p.net_cash_value)}</span></td>
                          <td className="px-5 py-4 text-[#0A1628] text-sm font-medium whitespace-nowrap">{fmt(p.annual_premium)}</td>
                          <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">{fmtPayUp(p.pay_up_date)}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusColors[p.status] ?? "bg-gray-100 text-gray-500"}`}>{p.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-50 bg-[#F9FAFB]">
                  <div className="flex items-center gap-8 text-xs text-slate-400">
                    <span>Active Policies: <span className="text-[#0A1628] font-bold">{activePolicies.length}</span></span>
                    <span>Total Death Benefit: <span className="text-[#C9A84C] font-bold">{fmt(totalDeathBenefit)}</span></span>
                    <span>Total Cash Value: <span className="text-[#0A1628] font-bold">{fmt(totalCashValue)}</span></span>
                    <span>Net Cash Value: <span className="text-green-600 font-bold">{fmt(totalNetCashValue)}</span></span>
                    <span>Annual Premium: <span className="text-[#0A1628] font-bold">{fmt(totalPremium)}</span></span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="text-[#0A1628] font-medium text-sm mb-4">Strategy Highlights</h3>
                  <ul className="space-y-3">
                    {highlights.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                        <span className="text-[#C9A84C] mt-0.5 flex-shrink-0">◆</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#0A1628] rounded-2xl p-6">
                  <h3 className="text-white font-medium text-sm mb-5">Upcoming &amp; Action Items</h3>
                  <ul className="space-y-4">
                    {actionItems.map((item) => (
                      <li key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.priority === "high" && <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0"></span>}
                          <span className="text-slate-300 text-sm">{item.label}</span>
                        </div>
                        <span className="text-[#C9A84C] text-xs font-medium whitespace-nowrap ml-4">{fmtDate(item.due_date)}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="mt-6 w-full bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] text-xs font-semibold py-3 rounded-lg tracking-widest uppercase transition-colors">
                    Schedule a Review
                  </button>
                  <p className="text-slate-600 text-xs text-center mt-3">Contact: {client.advisor}</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
                <span className="text-amber-500 text-lg">⚠</span>
                <p className="text-amber-700 text-xs">
                  Policy values shown are from carrier statements as of the dates listed. Contact your advisor to request updated inforce illustrations with current values.
                </p>
              </div>
            </>
          )}

          {/* ── PREMIUM FINANCE LOAN ── */}
          {activeNav === "Premium Finance Loan" && (
            <PremiumFinanceLoanSection
              accounts={collateralAccounts}
              policies={policies}
              advisorName={client.advisor}
              clientId={client.id}
              clientName={client.name}
            />
          )}

          {/* ── COLLATERAL ACCOUNT ── */}
          {activeNav === "Collateral Account" && (
            <CollateralAccountSection
              accounts={collateralAccounts}
              policies={policies}
            />
          )}

          {/* ── POLICIES ── */}
          {activeNav === "Policies" && (
            <div className="space-y-8">
              {policies.map((p) => {
                const illustrationUrl = policyIllustrationUrls[p.policy_number];
                return (
                  <div key={p.id} className="space-y-0">
                    {/* Main Policy Card */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      {/* Card Header */}
                      <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                            <span className="text-[#C9A84C] text-xs font-bold">{p.carrier.slice(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-[#0A1628] font-semibold text-sm">{p.carrier} — Policy {p.policy_number}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{p.product_name}</p>
                          </div>
                        </div>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusColors[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {p.status}
                        </span>
                      </div>

                      <div className="p-6 grid grid-cols-3 gap-6">
                        {/* Column 1 — Coverage */}
                        <div className="space-y-4">
                          <p className="text-slate-400 text-[10px] uppercase tracking-widest">Coverage</p>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Face Amount</p>
                            <p className="text-[#0A1628] text-sm font-medium">{fmt(p.face_amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Current Death Benefit</p>
                            <p className="text-[#C9A84C] text-lg font-semibold">{fmt(p.death_benefit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Product Type</p>
                            <p className="text-[#0A1628] text-sm">{p.product_type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Rate Class</p>
                            <p className="text-[#0A1628] text-sm">{p.rate_class ?? "—"}</p>
                          </div>
                        </div>

                        {/* Column 2 — Values & Premium */}
                        <div className="space-y-4">
                          <p className="text-slate-400 text-[10px] uppercase tracking-widest">Values & Premium</p>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Cash Value</p>
                            <p className="text-[#0A1628] text-sm font-medium">{fmt(p.cash_value)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Loan Balance</p>
                            <p className="text-[#0A1628] text-sm">{fmt(p.loan_balance)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Net Cash Value</p>
                            <p className="text-green-600 text-sm font-semibold">{fmt(p.net_cash_value)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Annual Premium</p>
                            <p className="text-[#0A1628] text-sm font-medium">{fmt(p.annual_premium)}</p>
                          </div>
                          {p.pay_up_date && (
                            <div>
                              <p className="text-xs text-slate-400 mb-0.5">Pay-Up Date</p>
                              <p className="text-[#0A1628] text-sm">{fmtPayUp(p.pay_up_date)}</p>
                            </div>
                          )}
                          {p.dividend_option && (
                            <div>
                              <p className="text-xs text-slate-400 mb-0.5">Dividend Option</p>
                              <p className="text-[#0A1628] text-sm">{p.dividend_option}</p>
                            </div>
                          )}
                        </div>

                        {/* Column 3 — Ownership & Riders */}
                        <div className="space-y-4">
                          <p className="text-slate-400 text-[10px] uppercase tracking-widest">Ownership & Riders</p>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Insured</p>
                            <p className="text-[#0A1628] text-sm">{p.insured_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Owner</p>
                            <p className="text-[#0A1628] text-sm">{p.owner_name}</p>
                            <p className="text-slate-400 text-[10px]">{p.owner_type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Issue Date</p>
                            <p className="text-[#0A1628] text-sm">{fmtDate(p.issue_date)}{p.issue_age ? ` (Age ${p.issue_age})` : ""}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">MEC Status</p>
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${p.mec_status ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                              {p.mec_status ? "MEC" : "Non-MEC"}
                            </span>
                          </div>
                          {p.riders && p.riders.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-400 mb-1.5">Riders</p>
                              <ul className="space-y-1">
                                {p.riders.map((r) => (
                                  <li key={r} className="flex items-start gap-1.5 text-xs text-slate-600">
                                    <span className="text-[#C9A84C] mt-0.5 flex-shrink-0">◆</span>
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="px-6 py-3 bg-[#F9FAFB] border-t border-gray-50 flex items-center justify-between">
                        <p className="text-slate-400 text-xs">Last statement: {fmtDate(p.last_statement_date)}</p>
                        <button className="text-xs text-[#C9A84C] hover:underline">Request Inforce Illustration →</button>
                      </div>
                    </div>

                    {/* Illustration Section */}
                    {illustrationUrl && (
                      <div className="bg-white rounded-b-2xl shadow-sm border-t-0 overflow-hidden -mt-2 pt-2">
                        <div className="border-t-2 border-[#C9A84C]/20 mx-6" />
                        <div className="px-6 py-5">
                          <div className="flex items-center justify-between mb-5">
                            <div>
                              <p className="text-[#0A1628] font-semibold text-sm">Policy Illustration</p>
                              <p className="text-slate-400 text-xs mt-0.5">
                                {p.carrier} · {p.product_name} · Policy {p.policy_number}
                              </p>
                            </div>
                            <a
                              href={illustrationUrl}
                              download={`${p.policy_number}_illustration.pdf`}
                              className="inline-flex items-center gap-2 bg-[#0A1628] hover:bg-[#162040] text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download PDF
                            </a>
                          </div>

                          <div className="grid grid-cols-4 gap-4 mb-5">
                            <div className="bg-[#F4F5F7] rounded-xl p-4">
                              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Face Amount</p>
                              <p className="text-[#0A1628] text-sm font-semibold">{fmt(p.face_amount)}</p>
                            </div>
                            <div className="bg-[#F4F5F7] rounded-xl p-4">
                              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Death Benefit</p>
                              <p className="text-[#C9A84C] text-sm font-semibold">{fmt(p.death_benefit)}</p>
                            </div>
                            <div className="bg-[#F4F5F7] rounded-xl p-4">
                              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Policy Value</p>
                              <p className="text-[#0A1628] text-sm font-semibold">{fmt(p.cash_value)}</p>
                            </div>
                            <div className="bg-[#F4F5F7] rounded-xl p-4">
                              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Annual Premium</p>
                              <p className="text-[#0A1628] text-sm font-semibold">{fmt(p.annual_premium)}</p>
                            </div>
                          </div>

                          <div className="rounded-xl overflow-hidden border border-gray-100" style={{ height: "820px" }}>
                            <iframe
                              src={illustrationUrl}
                              className="w-full h-full border-0"
                              title={`Illustration for policy ${p.policy_number}`}
                            />
                          </div>
                          <p className="text-slate-400 text-[10px] text-center mt-3">
                            For informational purposes only. Contact your advisor for an updated inforce illustration.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── MY DASHBOARD (Projections) ── */}
          {activeNav === "My Dashboard" && (
            <div className="space-y-8">

              {/* Section tabs */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                  {[
                    { key: "policy"      as const, label: "Policy Dashboard",                 anchor: "sec-policy",      sub: "Coverage summary · Premium schedule · Key dates" },
                    { key: "projections" as const, label: "Long Term Projections Dashboard", anchor: "sec-projections", sub: "Policy growth · Loan payoff · Year-by-year table" },
                    { key: "estate"      as const, label: "Estate Value Dashboard",           anchor: "sec-estate",      sub: "Net death benefit · Tax-free transfer · Beneficiary allocation" },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setProjTab(tab.key);
                        scrollIframeTo(tab.anchor);
                      }}
                      className={`flex-1 px-6 py-4 text-left border-b-2 transition-all ${
                        projTab === tab.key
                          ? "border-[#C9A84C] bg-[#C9A84C]/5"
                          : "border-transparent hover:bg-gray-50"
                      }`}
                    >
                      <p className={`text-sm font-semibold ${projTab === tab.key ? "text-[#0A1628]" : "text-slate-400"}`}>
                        {tab.label}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{tab.sub}</p>
                    </button>
                  ))}
                </div>

                <iframe
                  ref={iframeRef}
                  src={illustrationUrl}
                  className="w-full border-0 block"
                  style={{ height: "0px" }}
                  title="Policy Illustration"
                  onLoad={(e) => {
                    const iframe = e.currentTarget;
                    try {
                      const doc = iframe.contentDocument;
                      if (doc) {
                        doc.body.style.overflow = "hidden";
                        doc.documentElement.style.overflow = "hidden";
                        iframe.style.height = doc.documentElement.scrollHeight + "px";
                      }
                    } catch {}
                    const anchor = projTab === "estate" ? "sec-estate" : projTab === "projections" ? "sec-projections" : "sec-policy";
                    scrollIframeTo(anchor);
                  }}
                />

                <div className="px-6 py-3 bg-[#F9FAFB] border-t border-gray-50 flex items-center justify-between">
                  <p className="text-slate-400 text-[10px]">
                    {illustration
                      ? `${illustration.carrier} · ${illustration.product_name} · Prepared by ${illustration.advisor_name}`
                      : "Hypothetical illustration · Not a guarantee of future performance"}
                  </p>
                  <p className="text-slate-300 text-[10px]">Adjust rate and year sliders inside to model scenarios</p>
                </div>
              </div>

            </div>
          )}

          {/* ── POLICY PERFORMANCE ── */}
          {activeNav === "Policy Performance" && (
            <div className="space-y-6">
              <IndexCreditingWidget
                policies={policies}
                illustratedRate={illustration?.illustrated_rate ?? 7}
              />
            </div>
          )}

          {/* ── TAX STRATEGY ── */}
          {activeNav === "Tax Strategy" && (
            <TaxStrategySection policies={policies} clientName={client.name} illustratedRate={illustration?.illustrated_rate ?? 7} />
          )}

          {/* ── PRIVATE MARKETS ── */}
          {activeNav === "Private Markets" && (
            <PrivateMarketsSection
              deals={deals}
              clientId={client.id}
              clientName={client.name}
            />
          )}

          {/* ── CONTACT ADVISOR ── */}
          {activeNav === "Contact Advisor" && (
            <ContactAdvisorSection advisorName={client.advisor} clientName={client.name} />
          )}

          {/* ── DOCUMENTS ── */}
          {activeNav === "Documents" && (
            <DocumentsSection
              documents={documents}
              policies={policies}
              clientId={client.id}
              clientName={client.name}
            />
          )}

        </div>
      </main>
    </div>
  );
}
