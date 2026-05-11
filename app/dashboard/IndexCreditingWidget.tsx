"use client";
import { useState, useEffect } from "react";

interface MarketData {
  currentPrice: number;
  prevClose: number;
  dayChange: number;
  dayChangePct: number;
  ytdChangePct: number;
  oneYearChangePct: number;
  chartPoints: number[];
  asOf: string;
  error?: string;
}

interface Policy {
  product_name: string;
  product_type: string;
  cash_value: number;
  face_amount: number;
  annual_premium: number;
}

interface Props {
  policies: Policy[];
  illustratedRate: number;
}

// Calendar-year S&P 500 price returns (excludes dividends — matches IUL point-to-point indexing)
const HISTORICAL: { year: number; sp: number }[] = [
  { year: 2015, sp: -0.0073 },
  { year: 2016, sp:  0.0954 },
  { year: 2017, sp:  0.1942 },
  { year: 2018, sp: -0.0624 },
  { year: 2019, sp:  0.2888 },
  { year: 2020, sp:  0.1626 },
  { year: 2021, sp:  0.2689 },
  { year: 2022, sp: -0.1944 },
  { year: 2023, sp:  0.2423 },
  { year: 2024, sp:  0.2331 },
];

// Lincoln OptiBlend standard S&P 500 1-yr point-to-point strategy
const CAP        = 0.085; // 8.5%
const FLOOR      = 0.000; // 0%
const PART       = 1.000; // 100% participation

const clamp = (sp: number) => Math.min(Math.max(sp * PART, FLOOR), CAP);

const fmtD  = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtP  = (n: number, d = 2) => (n * 100).toFixed(d) + "%";
const fmtPs = (n: number)       => (n >= 0 ? "+" : "") + (n * 100).toFixed(2) + "%";

export default function IndexCreditingWidget({ policies, illustratedRate }: Props) {
  const [market, setMarket]   = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market")
      .then(r => r.json())
      .then(d => { setMarket(d); setLoading(false); })
      .catch(() => { setMarket({ error: "unavailable" } as MarketData); setLoading(false); });
  }, []);

  const iulPolicies = policies.filter(p =>
    /FIU|IUL|Index/i.test(p.product_type + " " + p.product_name)
  );
  const hasIul = iulPolicies.length > 0;

  // YTD live credit estimate
  const ytd       = market && !market.error ? market.ytdChangePct : null;
  const ytdCredit = ytd != null ? clamp(ytd) : null;
  const ytdCapped  = ytd != null && ytd > CAP;
  const ytdFloored = ytd != null && ytd < FLOOR;

  // Historical analysis
  const rows = HISTORICAL.map(r => ({
    ...r,
    credit:  clamp(r.sp),
    capped:  r.sp > CAP,
    floored: r.sp < FLOOR,
  }));

  const avgSp     = rows.reduce((s, r) => s + r.sp,     0) / rows.length;
  const avgCredit = rows.reduce((s, r) => s + r.credit, 0) / rows.length;
  const nFloored  = rows.filter(r => r.floored).length;
  const nCapped   = rows.filter(r => r.capped).length;

  // $100K growth comparison
  const START = 100_000;
  let spBal = START, iulBal = START;
  const growth = rows.map(r => {
    spBal  = spBal  * (1 + r.sp);
    iulBal = iulBal * (1 + r.credit);
    return { year: r.year, sp: Math.round(spBal), iul: Math.round(iulBal) };
  });
  const peakSp  = Math.max(...growth.map(g => g.sp));
  const peakIul = Math.max(...growth.map(g => g.iul));
  const peakAll = Math.max(peakSp, peakIul);

  // Interest at illustration rate
  const ilustBal = START * Math.pow(1 + illustratedRate / 100, 10);

  return (
    <div className="space-y-6">

      {/* ── LIVE S&P HEADER ── */}
      <div className="bg-[#0A1628] rounded-2xl overflow-hidden relative">

        {/* Live S&P chart background */}
        {market && !market.error && market.chartPoints?.length > 1 && (() => {
          const pts = market.chartPoints;
          const minP = Math.min(...pts);
          const maxP = Math.max(...pts);
          const W = 800, H = 220, pad = 0;
          const x = (i: number) => (i / (pts.length - 1)) * W;
          const y = (p: number) => H - pad - ((p - minP) / (maxP - minP || 1)) * (H - pad * 2);
          const isUp = market.ytdChangePct >= 0;
          const color = isUp ? "#22c55e" : "#ef4444";
          const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(" ");
          const fillPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;
          return (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: 0.12 }}
            >
              <defs>
                <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path d={fillPath} fill="url(#spGrad)" />
              <path d={linePath} fill="none" stroke={color} strokeWidth="3" />
            </svg>
          );
        })()}

        <div className="px-7 py-5 flex items-center justify-between border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-[#C9A84C] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-[#C9A84C]/10 rounded-full border border-[#C9A84C]/20">
              Live Market
            </span>
            <h3 className="text-white font-medium text-sm">S&P 500 — ^GSPC</h3>
          </div>
          <p className="text-slate-500 text-[10px]">
            {loading
              ? "Fetching…"
              : market?.error
              ? "Data unavailable"
              : `Updated ${new Date(market!.asOf).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
          </p>
        </div>

        <div className="px-7 py-6 relative z-10">
          {loading ? (
            <div className="flex items-center gap-3 h-12">
              <div className="w-5 h-5 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400 text-sm">Loading live data…</span>
            </div>
          ) : market && !market.error ? (
            <div className="grid grid-cols-4 gap-8">
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1.5">Index Level</p>
                <p className="text-white text-3xl font-light">
                  {market.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1.5">Today</p>
                <p className={`text-3xl font-light ${market.dayChangePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {fmtPs(market.dayChangePct)}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {market.dayChange >= 0 ? "+" : ""}{market.dayChange.toFixed(2)} pts
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1.5">Year-to-Date</p>
                <p className={`text-3xl font-light ${market.ytdChangePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {fmtPs(market.ytdChangePct)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1.5">
                  Estimated Policy Credit
                </p>
                {ytdCredit != null ? (
                  <>
                    <p className="text-[#C9A84C] text-3xl font-semibold">{fmtP(ytdCredit)}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">
                      {ytdCapped ? `Capped at ${fmtP(CAP)}` : ytdFloored ? "Floor protection active" : "Uncapped — full credit"}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm">—</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Live data unavailable — historical analysis below is current.</p>
          )}
        </div>

        {/* YTD credit explanation bar */}
        {ytdCredit != null && (
          <div className={`mx-7 mb-6 rounded-xl px-5 py-4 flex items-start gap-4 relative z-10 ${
            ytdFloored
              ? "bg-blue-500/10 border border-blue-400/20"
              : "bg-green-500/10 border border-green-400/20"
          }`}>
            <span className="text-xl mt-0.5 flex-shrink-0">
              {ytdFloored ? "🛡" : ytdCapped ? "⬆" : "✓"}
            </span>
            <div>
              {ytdFloored ? (
                <>
                  <p className="text-blue-300 text-sm font-medium">Floor protection active this segment</p>
                  <p className="text-slate-400 text-xs mt-1">
                    The S&P is down {fmtPs(ytd!)} YTD. If your anniversary were today, your account credits 0%
                    — your cash value is fully protected from this {fmtP(Math.abs(ytd!))} loss.
                  </p>
                </>
              ) : ytdCapped ? (
                <>
                  <p className="text-green-300 text-sm font-medium">Strong market year — cap of {fmtP(CAP)} applied</p>
                  <p className="text-slate-400 text-xs mt-1">
                    The S&P is up {fmtPs(ytd!)} YTD. Your policy&apos;s {fmtP(CAP)} cap is the maximum credit.
                    If your anniversary were today, your account would be credited {fmtP(ytdCredit)}.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-green-300 text-sm font-medium">Your policy credits the full {fmtP(ytdCredit)} this segment</p>
                  <p className="text-slate-400 text-xs mt-1">
                    The S&P is up {fmtPs(ytd!)} — below your cap, so you capture the full return.
                    If your anniversary were today, your account would be credited {fmtP(ytdCredit)}.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── HOW CREDITING WORKS ── */}
      {hasIul && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-[#0A1628] font-medium text-sm mb-1">How Your Policy Credits Interest</p>
          <p className="text-slate-400 text-xs mb-5">
            Lincoln OptiBlend · S&P 500 1-Year Point-to-Point Strategy
          </p>
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: "Participation Rate", value: fmtP(PART, 0), sub: "You capture 100% of index moves", color: "border-blue-400" },
              { label: "Cap Rate",           value: fmtP(CAP),     sub: "Maximum credit per segment year", color: "border-amber-400" },
              { label: "Floor Rate",         value: fmtP(FLOOR, 0),sub: "Your principal is never reduced by index loss", color: "border-green-400" },
            ].map(m => (
              <div key={m.label} className={`bg-[#F4F5F7] rounded-xl p-4 border-l-4 ${m.color}`}>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">{m.label}</p>
                <p className="text-[#0A1628] text-xl font-semibold">{m.value}</p>
                <p className="text-slate-400 text-xs mt-1">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#F4F5F7] rounded-xl p-4 text-xs text-slate-500 space-y-1">
            <p><strong className="text-[#0A1628]">Segment Year:</strong> Your credit is calculated from one policy anniversary to the next — not the calendar year.</p>
            <p><strong className="text-[#0A1628]">Calculation:</strong> min( max( S&P Return × {fmtP(PART, 0)}, {fmtP(FLOOR, 0)} ), {fmtP(CAP)} )</p>
            <p><strong className="text-[#0A1628]">Price Return Only:</strong> The S&P price index (not total return) is used — dividends are not included in the credit calculation.</p>
          </div>
        </div>
      )}

      {/* ── HISTORICAL TABLE ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-[#0A1628] font-medium text-sm">10-Year Historical Crediting Analysis</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Actual S&P 500 returns vs what your policy would have credited · 2015–2024
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">10-Yr Avg Credit</p>
            <p className="text-[#C9A84C] text-xl font-semibold">{fmtP(avgCredit)}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F4F5F7]">
                {["Year", "S&P 500 Return", "Policy Credit", "Credit Bar", "Outcome", "Difference"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.year} className={`hover:bg-gray-50/50 transition-colors ${r.floored ? "bg-blue-50/40" : ""}`}>
                  <td className="px-5 py-3 text-sm font-semibold text-[#0A1628] whitespace-nowrap">{r.year}</td>
                  <td className={`px-5 py-3 text-sm font-medium whitespace-nowrap ${r.sp >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {fmtPs(r.sp)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="text-sm font-bold text-[#C9A84C]">{fmtP(r.credit)}</span>
                  </td>
                  <td className="px-5 py-3 w-36">
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.credit === 0 ? "bg-blue-200" : "bg-[#C9A84C]"}`}
                        style={{ width: `${(r.credit / CAP) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {r.floored ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold">
                        🛡 Floor — 0% loss
                      </span>
                    ) : r.capped ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-semibold">
                        ⬆ Capped at {fmtP(CAP)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-semibold">
                        ✓ Full credit
                      </span>
                    )}
                  </td>
                  <td className={`px-5 py-3 text-sm whitespace-nowrap ${r.floored ? "text-green-600 font-semibold" : "text-slate-400"}`}>
                    {r.floored
                      ? `Protected ${fmtP(Math.abs(r.sp))} loss`
                      : r.capped
                      ? `−${fmtP(r.sp - r.credit)} capped`
                      : "Full"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#0A1628]">
                <td className="px-5 py-4 text-xs font-semibold text-white">10-Yr Avg</td>
                <td className="px-5 py-4 text-xs font-semibold text-slate-300">{fmtPs(avgSp)}/yr</td>
                <td className="px-5 py-4 text-xs font-bold text-[#C9A84C]">{fmtP(avgCredit)}/yr</td>
                <td className="px-5 py-4" />
                <td className="px-5 py-4 text-xs text-slate-400">
                  {nFloored} yr{nFloored !== 1 ? "s" : ""} floored · {nCapped} yr{nCapped !== 1 ? "s" : ""} capped
                </td>
                <td className="px-5 py-4 text-xs text-slate-400">
                  {fmtP(avgSp - avgCredit)} avg gap vs S&P
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── GROWTH COMPARISON ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h3 className="text-[#0A1628] font-medium text-sm">$100,000 Growth Comparison — 2015 to 2024</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Applying actual S&P 500 annual returns with your policy&apos;s cap ({fmtP(CAP)}) and floor ({fmtP(FLOOR, 0)})
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* End values */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#F4F5F7] rounded-2xl p-5">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">S&P 500 Uncapped</p>
              <p className="text-[#0A1628] text-2xl font-light">{fmtD(growth[growth.length - 1].sp)}</p>
              <p className="text-green-600 text-xs mt-1">
                {fmtPs((growth[growth.length - 1].sp - START) / START)} total · {fmtP(Math.pow(growth[growth.length - 1].sp / START, 1/10) - 1)} ann.
              </p>
              <p className="text-slate-400 text-[10px] mt-1">No floor protection · Full index exposure</p>
            </div>
            <div className="bg-[#0A1628] rounded-2xl p-5">
              <p className="text-[#C9A84C] text-[10px] uppercase tracking-widest mb-2">Your IUL Credits</p>
              <p className="text-white text-2xl font-light">{fmtD(growth[growth.length - 1].iul)}</p>
              <p className="text-[#C9A84C] text-xs mt-1">
                {fmtPs((growth[growth.length - 1].iul - START) / START)} total · {fmtP(Math.pow(growth[growth.length - 1].iul / START, 1/10) - 1)} ann.
              </p>
              <p className="text-slate-400 text-[10px] mt-1">{fmtP(CAP)} cap · 0% floor · 3 yrs protected</p>
            </div>
            <div className="border-2 border-[#C9A84C]/30 rounded-2xl p-5">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">Illustrated Rate ({fmtP(illustratedRate / 100, 0)})</p>
              <p className="text-[#0A1628] text-2xl font-light">{fmtD(Math.round(ilustBal))}</p>
              <p className="text-slate-400 text-xs mt-1">
                {fmtPs((ilustBal - START) / START)} total · {fmtP(illustratedRate / 100)} ann.
              </p>
              <p className="text-slate-400 text-[10px] mt-1">Projected, not guaranteed</p>
            </div>
          </div>

          {/* Year-by-year bars */}
          <div>
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <span className="text-xs text-slate-400">S&P 500 (uncapped)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#C9A84C]" />
                <span className="text-xs text-slate-400">Policy index credits</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-[#C9A84C]" />
                <span className="text-xs text-slate-400">Illustrated rate ({fmtP(illustratedRate / 100, 0)})</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {growth.map((g, i) => {
                const illustBal = Math.round(START * Math.pow(1 + illustratedRate / 100, i + 1));
                const row = rows[i];
                return (
                  <div key={g.year} className="grid grid-cols-[52px_1fr_1fr_1fr_64px_64px_64px] gap-2 items-center">
                    <span className="text-xs text-slate-400 font-medium">{g.year}</span>
                    {/* S&P bar */}
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: `${(g.sp / peakAll) * 100}%` }} />
                    </div>
                    {/* IUL bar */}
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${(g.iul / peakAll) * 100}%` }} />
                    </div>
                    {/* Illustrated bar */}
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full border-r-2 border-[#C9A84C]/60 bg-[#C9A84C]/20 rounded-full" style={{ width: `${(illustBal / peakAll) * 100}%` }} />
                    </div>
                    <span className={`text-[10px] text-right font-medium ${row.sp < 0 ? "text-red-400" : "text-slate-500"}`}>
                      {fmtD(g.sp)}
                    </span>
                    <span className="text-[10px] text-right font-medium text-[#C9A84C]">{fmtD(g.iul)}</span>
                    <span className="text-[10px] text-right font-medium text-slate-400">{fmtD(illustBal)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insight callout */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
              <p className="text-blue-700 text-xs font-semibold mb-1">Floor Protection Value</p>
              <p className="text-blue-600 text-xs">
                In 2015, 2018, and 2022 the S&P lost {fmtPs(rows[0].sp)}, {fmtPs(rows[3].sp)}, and {fmtPs(rows[7].sp)}.
                Your policy credited 0% each year — protecting your cash value from{" "}
                {fmtP(Math.abs(rows[0].sp) + Math.abs(rows[3].sp) + Math.abs(rows[7].sp))} in cumulative index losses.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
              <p className="text-amber-700 text-xs font-semibold mb-1">Illustrated Rate Context</p>
              <p className="text-amber-600 text-xs">
                Your policy&apos;s {fmtP(illustratedRate / 100, 0)} illustrated rate sits above the 10-year historical
                credit average of {fmtP(avgCredit)} — a conservative assumption that factors in future cap rate
                variability and different market cycles, not just 2015–2024&apos;s strong bull run.
              </p>
            </div>
          </div>

          <p className="text-slate-300 text-[10px] text-center">
            Historical S&P 500 price returns used for illustration only. Past performance does not guarantee future index credits.
            Policy crediting is subject to cap and floor rates in effect at each anniversary — rates may change.
          </p>
        </div>
      </div>

    </div>
  );
}
