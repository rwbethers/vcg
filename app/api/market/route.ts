import { NextResponse } from "next/server";

export const revalidate = 1800; // 30-min cache

export async function GET() {
  try {
    // Fetch YTD chart data — gives current price, prev close, and all YTD closes
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=ytd&includePrePost=false",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        next: { revalidate: 1800 },
      }
    );

    if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`);

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error("No result");

    const meta = result.meta as {
      regularMarketPrice: number;
      chartPreviousClose: number;
      previousClose?: number;
      symbol: string;
    };

    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.filter((c): c is number => c != null);
    if (valid.length === 0) throw new Error("No close data");

    const currentPrice = meta.regularMarketPrice ?? valid[valid.length - 1];
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? valid[valid.length - 2];
    const ytdStart = valid[0];

    const dayChange = currentPrice - prevClose;
    const dayChangePct = dayChange / prevClose;
    const ytdChange = currentPrice - ytdStart;
    const ytdChangePct = ytdChange / ytdStart;

    // Compute 52-week return using first available close from a year ago
    // The ytd range won't include that, so we approximate from the chart length
    const oneYearAgoClose = valid[Math.max(0, valid.length - 252)] ?? ytdStart;
    const oneYearChangePct = (currentPrice - oneYearAgoClose) / oneYearAgoClose;

    // Downsample to max 120 points for the chart
    const step = Math.max(1, Math.floor(valid.length / 120));
    const chartPoints = valid.filter((_, i) => i % step === 0);
    if (chartPoints[chartPoints.length - 1] !== currentPrice) chartPoints.push(round(currentPrice, 2));

    return NextResponse.json({
      symbol: "^GSPC",
      currentPrice: round(currentPrice, 2),
      prevClose: round(prevClose, 2),
      dayChange: round(dayChange, 2),
      dayChangePct: round(dayChangePct, 6),
      ytdStart: round(ytdStart, 2),
      ytdChangePct: round(ytdChangePct, 6),
      oneYearChangePct: round(oneYearChangePct, 6),
      chartPoints,
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function round(n: number, decimals: number) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
