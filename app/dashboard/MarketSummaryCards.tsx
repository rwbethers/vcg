"use client";
import { useState, useEffect } from "react";

interface MarketData {
  currentPrice: number;
  dayChange: number;
  dayChangePct: number;
  ytdChangePct: number;
  asOf: string;
  error?: string;
}

interface Props {
  cashValue: number;
  cap?: number;
  floor?: number;
}

// S&P 500 annual price returns — down years only, for floor protection calc
const DOWN_YEARS = [
  { year: 2015, loss: 0.0073 },
  { year: 2018, loss: 0.0624 },
  { year: 2022, loss: 0.1944 },
];

const fmtD  = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtPs = (n: number) => (n >= 0 ? "+" : "") + (n * 100).toFixed(2) + "%";
const fmtP  = (n: number) => (n * 100).toFixed(2) + "%";

export default function MarketSummaryCards({ cashValue, cap = 0.085, floor = 0 }: Props) {
  const [market, setMarket]   = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market")
      .then(r => r.json())
      .then(d => { setMarket(d); setLoading(false); })
      .catch(() => { setMarket({ error: "unavailable" } as MarketData); setLoading(false); });
  }, []);

  const ytd        = market && !market.error ? market.ytdChangePct : null;
  const creditPct  = ytd != null ? Math.min(Math.max(ytd, floor), cap) : null;
  const creditDol  = creditPct != null && cashValue > 0 ? Math.round(cashValue * creditPct) : null;
  const isCapped   = ytd != null && ytd > cap;
  const isFloored  = ytd != null && ytd < floor;

  const totalFloorProtection = DOWN_YEARS.reduce((s, d) => s + d.loss, 0);
  const protectionDollar     = cashValue > 0 ? Math.round(cashValue * totalFloorProtection) : null;

  return (
    <div className="grid grid-cols-3 gap-5">

      {/* Card 1 — S&P 500 live */}
      <div className="bg-[#0A1628] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-400 text-[10px] uppercase tracking-widest">S&P 500 — Live</p>
          <span className="text-[9px] text-slate-600 uppercase tracking-widest">^GSPC</span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 h-10">
            <div className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-500 text-xs">Loading…</span>
          </div>
        ) : market && !market.error ? (
          <>
            <p className="text-white text-2xl font-light">
              {market.currentPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`text-sm font-medium ${market.dayChangePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                {fmtPs(market.dayChangePct)} today
              </span>
              <span className="text-slate-600 text-xs">·</span>
              <span className={`text-xs ${market.ytdChangePct >= 0 ? "text-green-400/80" : "text-red-400/80"}`}>
                {fmtPs(market.ytdChangePct)} YTD
              </span>
            </div>
            <p className="text-slate-600 text-[10px] mt-2">
              Updated {new Date(market.asOf).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </>
        ) : (
          <p className="text-slate-500 text-sm">Unavailable</p>
        )}
      </div>

      {/* Card 2 — Estimated segment credit */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-[#C9A84C]">
        <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">Estimated Segment Credit</p>
        {loading ? (
          <div className="flex items-center gap-2 h-10">
            <div className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-xs">Loading…</span>
          </div>
        ) : creditPct != null ? (
          <>
            <p className="text-[#C9A84C] text-2xl font-semibold">{fmtP(creditPct)}</p>
            {creditDol != null && (
              <p className="text-[#0A1628] text-sm font-medium mt-0.5">{fmtD(creditDol)} on your cash value</p>
            )}
            <p className="text-slate-400 text-[10px] mt-2">
              {isFloored
                ? "Floor active — your cash value is protected from the S&P decline"
                : isCapped
                ? `S&P up ${fmtPs(ytd!)} YTD — your ${fmtP(cap)} cap is the maximum credit`
                : `S&P up ${fmtPs(ytd!)} YTD — full credit applies`}
            </p>
          </>
        ) : (
          <p className="text-slate-400 text-sm">—</p>
        )}
      </div>

      {/* Card 3 — Historical floor protection */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-blue-400">
        <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">Floor Protection (2015–2024)</p>
        <p className="text-[#0A1628] text-2xl font-light">{fmtP(totalFloorProtection)}</p>
        {protectionDollar != null && (
          <p className="text-blue-600 text-sm font-medium mt-0.5">{fmtD(protectionDollar)} in losses avoided</p>
        )}
        <p className="text-slate-400 text-[10px] mt-2">
          {DOWN_YEARS.map(d => `${d.year}: −${fmtP(d.loss)}`).join(" · ")} — all credited 0%
        </p>
      </div>

    </div>
  );
}
