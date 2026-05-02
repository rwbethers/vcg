"use client";
import { useState } from "react";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const fmtPct = (n: number) => (n * 100).toFixed(1) + "%";

const STATE_RATES: Record<string, number> = {
  AL: 0.05, AK: 0, AZ: 0.025, AR: 0.055, CA: 0.093,
  CO: 0.044, CT: 0.0699, DE: 0.066, FL: 0, GA: 0.0575,
  HI: 0.11, ID: 0.058, IL: 0.0495, IN: 0.0323, IA: 0.057,
  KS: 0.057, KY: 0.05, LA: 0.0425, ME: 0.0715, MD: 0.0575,
  MA: 0.05, MI: 0.0425, MN: 0.0985, MS: 0.05, MO: 0.054,
  MT: 0.069, NE: 0.0684, NV: 0, NH: 0, NJ: 0.1075,
  NM: 0.059, NY: 0.0685, NC: 0.0499, ND: 0.029, OH: 0.0399,
  OK: 0.0475, OR: 0.099, PA: 0.0307, RI: 0.0599, SC: 0.07,
  SD: 0, TN: 0, TX: 0, UT: 0.0485, VT: 0.0875,
  VA: 0.0575, WA: 0, WV: 0.065, WI: 0.0765, WY: 0, DC: 0.0895,
};

const SINGLE_BRACKETS = [
  { max: 11600,  rate: 0.10 },
  { max: 47150,  rate: 0.12 },
  { max: 100525, rate: 0.22 },
  { max: 191950, rate: 0.24 },
  { max: 243725, rate: 0.32 },
  { max: 609350, rate: 0.35 },
  { max: Infinity, rate: 0.37 },
];

const MARRIED_BRACKETS = [
  { max: 23200,  rate: 0.10 },
  { max: 94300,  rate: 0.12 },
  { max: 201050, rate: 0.22 },
  { max: 383900, rate: 0.24 },
  { max: 487450, rate: 0.32 },
  { max: 731200, rate: 0.35 },
  { max: Infinity, rate: 0.37 },
];

function calcFederal(income: number, married: boolean) {
  const brackets = married ? MARRIED_BRACKETS : SINGLE_BRACKETS;
  let tax = 0;
  let prev = 0;
  let marginal = 0.10;
  for (const b of brackets) {
    if (income <= prev) break;
    const taxable = Math.min(income, b.max) - prev;
    tax += taxable * b.rate;
    marginal = b.rate;
    prev = b.max;
  }
  return { tax, marginal, effective: income > 0 ? tax / income : 0 };
}

const RETURN_RATE = 0.07;

export default function ProspectTaxCalc({ onSchedule }: { onSchedule: () => void }) {
  const [income, setIncome] = useState(200000);
  const [married, setMarried] = useState(false);
  const [state, setState] = useState("UT");
  const [portfolio, setPortfolio] = useState(500000);

  const { tax: fedTax, marginal, effective: fedEffective } = calcFederal(income, married);
  const stateRate = STATE_RATES[state] ?? 0;
  const totalRate = Math.min(fedEffective + stateRate, 0.60);
  const marginalTotal = Math.min(marginal + stateRate, 0.65);

  const annualReturn = portfolio * RETURN_RATE;
  const annualTaxDrag = annualReturn * marginalTotal;
  const netReturn = annualReturn - annualTaxDrag;
  const tenYearDrag = annualTaxDrag * 10 * 1.3; // rough compounding effect

  const stateList = Object.keys(STATE_RATES).sort();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-[#0A1628]">Tax Drag Calculator</h2>
        <p className="text-slate-400 text-sm mt-1">See how much of your investment growth disappears to taxes every year — and what VCG clients do about it.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
              Annual Income: <span className="text-[#0A1628] font-semibold">{fmt(income)}</span>
            </label>
            <input type="range" min={50000} max={1000000} step={5000} value={income}
              onChange={e => setIncome(Number(e.target.value))} className="w-full accent-[#C9A84C]" />
            <div className="flex justify-between text-[10px] text-slate-300 mt-1"><span>$50K</span><span>$1M</span></div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
              Investment Portfolio: <span className="text-[#0A1628] font-semibold">{fmt(portfolio)}</span>
            </label>
            <input type="range" min={50000} max={5000000} step={25000} value={portfolio}
              onChange={e => setPortfolio(Number(e.target.value))} className="w-full accent-[#C9A84C]" />
            <div className="flex justify-between text-[10px] text-slate-300 mt-1"><span>$50K</span><span>$5M</span></div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">Filing Status</label>
            <div className="flex gap-2">
              {[["Single", false], ["Married", true]].map(([label, val]) => (
                <button key={String(label)} onClick={() => setMarried(val as boolean)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${married === val ? "bg-[#0A1628] text-white" : "bg-gray-50 text-slate-400 hover:bg-gray-100"}`}>
                  {String(label)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">State</label>
            <select value={state} onChange={e => setState(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C]">
              {stateList.map(s => (
                <option key={s} value={s}>{s} — {STATE_RATES[s] === 0 ? "No income tax" : fmtPct(STATE_RATES[s])}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Federal Effective Rate", value: fmtPct(fedEffective), sub: `${fmtPct(marginal)} marginal bracket`, color: "border-blue-400" },
          { label: "State Rate", value: fmtPct(stateRate), sub: `${state} — ${stateRate === 0 ? "No income tax" : "state income tax"}`, color: "border-purple-400" },
          { label: "Combined Marginal Rate", value: fmtPct(marginalTotal), sub: "On investment income", color: "border-red-400" },
        ].map(m => (
          <div key={m.label} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${m.color}`}>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2">{m.label}</p>
            <p className="text-[#0A1628] text-2xl font-light">{m.value}</p>
            <p className="text-slate-400 text-xs mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0A1628] rounded-2xl p-6 text-white space-y-5">
        <p className="text-slate-400 text-[10px] uppercase tracking-widest">At {fmtPct(RETURN_RATE)} annual return on {fmt(portfolio)}</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-slate-400 text-xs mb-1">Gross Annual Return</p>
            <p className="text-white text-xl font-light">{fmt(annualReturn)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Lost to Taxes Annually</p>
            <p className="text-red-400 text-xl font-light">{fmt(annualTaxDrag)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">You Actually Keep</p>
            <p className="text-green-400 text-xl font-light">{fmt(netReturn)}</p>
          </div>
        </div>
        <div className="w-full h-3 bg-[#1a3060] rounded-full overflow-hidden flex">
          <div className="h-full bg-green-500 rounded-l-full" style={{ width: `${((netReturn / annualReturn) * 100).toFixed(0)}%` }} />
          <div className="h-full bg-red-500 flex-1 rounded-r-full" />
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-300 text-sm font-medium">Over 10 years, you'll give up an estimated {fmt(tenYearDrag)} in taxes on this portfolio</p>
          <p className="text-slate-400 text-xs mt-1">That's money that could have compounded inside a tax-advantaged structure instead.</p>
        </div>
      </div>

      {/* Locked solution */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-[#0A1628] font-medium text-sm">How VCG clients in your bracket reduce this</p>
            <p className="text-slate-400 text-xs mt-0.5">Structures that let your money grow and come out tax-free</p>
          </div>
          <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="px-6 py-5 space-y-3 opacity-40 pointer-events-none select-none blur-[2px]">
          {["Tax-free income in retirement via policy loans", "Zero capital gains on internal policy growth", "Estate transfer with no income tax to heirs", "Indexed growth with no downside market exposure"].map(item => (
            <div key={item} className="flex items-center gap-3">
              <span className="text-[#C9A84C]">◆</span>
              <span className="text-slate-600 text-sm">{item}</span>
            </div>
          ))}
        </div>
        <div className="px-6 pb-5">
          <button onClick={onSchedule}
            className="w-full py-3 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-xs uppercase tracking-widest rounded-xl transition-colors">
            Unlock This — Schedule a Call
          </button>
        </div>
      </div>
    </div>
  );
}
