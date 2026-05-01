"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

interface Props {
  deals: Deal[];
  clientId: string;
  clientName: string;
}

const assetClasses = ["All", "Real Estate", "Private Equity", "Private Credit", "Equities"];

const classStyles: Record<string, string> = {
  "Real Estate":    "bg-blue-500/20 text-blue-200 border border-blue-400/30",
  "Private Equity": "bg-purple-500/20 text-purple-200 border border-purple-400/30",
  "Private Credit": "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30",
  "Equities":       "bg-amber-500/20 text-amber-200 border border-amber-400/30",
};

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function PrivateMarketsSection({ deals, clientId, clientName }: Props) {
  const [activeClass, setActiveClass] = useState("All");
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  const filtered = activeClass === "All"
    ? deals
    : deals.filter((d) => d.asset_class === activeClass);

  const handleRequest = async (deal: Deal) => {
    if (requested.has(deal.id) || loading) return;
    setLoading(deal.id);
    const supabase = createClient();
    await supabase.from("deal_interest").insert({
      deal_id: deal.id,
      client_id: clientId,
      client_name: clientName,
      deal_title: deal.title,
      asset_class: deal.asset_class,
    });
    setRequested((prev) => new Set([...prev, deal.id]));
    setLoading(null);
  };

  return (
    <div className="space-y-8">

      {/* Hero Banner */}
      <div className="relative bg-[#0A1628] rounded-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #C9A84C 0%, transparent 60%)" }} />
        <div className="relative px-8 py-8">
          <p className="text-[#C9A84C] text-[10px] uppercase tracking-[0.3em] mb-3">Vision Capital Group</p>
          <h2 className="text-white text-2xl font-light mb-2">Private Markets</h2>
          <p className="text-slate-400 text-sm max-w-2xl mb-6">
            Exclusive access to institutional-quality investments across real estate, private equity, private credit, and managed equities — reserved for VCG clients.
          </p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Asset Classes", value: "4" },
              { label: "Open Opportunities", value: String(deals.filter(d => d.status === "Accepting Interest").length) },
              { label: "Min. Investment", value: "$25K" },
              { label: "Target Returns", value: "9–28%" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-[#C9A84C] text-xl font-semibold">{s.value}</p>
                <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {assetClasses.map((cls) => (
          <button
            key={cls}
            onClick={() => setActiveClass(cls)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeClass === cls
                ? "bg-[#C9A84C] text-[#0A1628] shadow-sm"
                : "bg-white border border-gray-200 text-slate-500 hover:border-[#C9A84C] hover:text-[#C9A84C]"
            }`}
          >
            {cls}
            {cls !== "All" && (
              <span className="ml-1.5 opacity-60">
                ({deals.filter(d => d.asset_class === cls).length})
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-slate-400 text-xs">{filtered.length} opportunities</span>
      </div>

      {/* Deal Cards Grid */}
      <div className="grid grid-cols-2 gap-6">
        {filtered.map((deal) => {
          const isRequested = requested.has(deal.id);
          const isLoading = loading === deal.id;
          const isComingSoon = deal.status === "Coming Soon";
          const isExpanded = expandedDeal === deal.id;

          return (
            <div key={deal.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col group">

              {/* Image */}
              <div className="relative h-52 overflow-hidden">
                <img
                  src={deal.image_url}
                  alt={deal.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/40 to-transparent" />

                {/* Badges on image */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium backdrop-blur-sm ${classStyles[deal.asset_class]}`}>
                    {deal.asset_class}
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium backdrop-blur-sm ${
                    isComingSoon
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-green-500/20 text-green-300 border border-green-400/30"
                  }`}>
                    {deal.status}
                  </span>
                </div>

                {/* Title on image */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-semibold text-base leading-tight">{deal.title}</h3>
                  {deal.location && (
                    <p className="text-slate-300 text-xs mt-1">📍 {deal.location}</p>
                  )}
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                <div className="px-4 py-3 text-center">
                  <p className="text-[#C9A84C] text-sm font-semibold">{deal.target_return}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5 uppercase tracking-widest">Target Return</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-[#0A1628] text-sm font-semibold">{fmt(deal.minimum_investment)}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5 uppercase tracking-widest">Minimum</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-[#0A1628] text-sm font-semibold">{deal.term}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5 uppercase tracking-widest">Term</p>
                </div>
              </div>

              {/* Description */}
              <div className="px-5 py-4 flex-1">
                <p className="text-slate-600 text-xs leading-relaxed">
                  {isExpanded ? deal.description : deal.description.slice(0, 120) + "…"}
                </p>
                <button
                  onClick={() => setExpandedDeal(isExpanded ? null : deal.id)}
                  className="text-[#C9A84C] text-xs mt-1 hover:underline"
                >
                  {isExpanded ? "Show less" : "Read more"}
                </button>

                {isExpanded && deal.highlights && (
                  <ul className="mt-3 space-y-1.5">
                    {deal.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="text-[#C9A84C] mt-0.5 flex-shrink-0">◆</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* CTA */}
              <div className="px-5 pb-5">
                <button
                  onClick={() => handleRequest(deal)}
                  disabled={isRequested || isLoading}
                  className={`w-full py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all ${
                    isRequested
                      ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                      : isComingSoon
                      ? "border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10"
                      : "bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] shadow-sm"
                  }`}
                >
                  {isRequested
                    ? "✓ Information Requested"
                    : isLoading
                    ? "Submitting…"
                    : isComingSoon
                    ? "Notify Me When Available"
                    : "Request More Information"}
                </button>
                {!isRequested && (
                  <p className="text-slate-400 text-[10px] text-center mt-2">
                    Your advisor will follow up within 24 hours
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          No opportunities in this category yet. Check back soon.
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
        <span className="text-amber-500 text-lg">⚠</span>
        <p className="text-amber-700 text-xs">
          Private market investments involve risk including loss of principal and illiquidity. Offering documents will be provided prior to any investment. For accredited investors only. Past performance is not indicative of future results.
        </p>
      </div>
    </div>
  );
}
