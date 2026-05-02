"use client";
import { useState } from "react";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

const MULTIPLIERS: Record<string, number[]> = {
  "0":  [7, 8, 9],
  "1-2": [10, 12, 14],
  "3+": [12, 15, 17],
};

function getMultiplier(dependents: string, age: number) {
  const [young, mid, older] = MULTIPLIERS[dependents];
  if (age < 40) return older;
  if (age < 55) return mid;
  return young;
}

export default function ProspectGapCalc({ onSchedule }: { onSchedule: () => void }) {
  const [income, setIncome] = useState(150000);
  const [age, setAge] = useState(42);
  const [dependents, setDependents] = useState("1-2");
  const [existing, setExisting] = useState(250000);

  const multiplier = getMultiplier(dependents, age);
  const recommended = income * multiplier;
  const gap = Math.max(0, recommended - existing);
  const covered = Math.min(existing, recommended);
  const pctCovered = Math.min(100, Math.round((existing / recommended) * 100));
  const annualGapCost = gap * 0.0003;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-[#0A1628]">Death Benefit Gap Calculator</h2>
        <p className="text-slate-400 text-sm mt-1">Find out how much coverage your family actually needs — and what you may be missing.</p>
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
              Annual Income: <span className="text-[#0A1628] font-semibold">{fmt(income)}</span>
            </label>
            <input type="range" min={30000} max={1000000} step={5000} value={income}
              onChange={e => setIncome(Number(e.target.value))} className="w-full accent-[#C9A84C]" />
            <div className="flex justify-between text-[10px] text-slate-300 mt-1"><span>$30K</span><span>$1M</span></div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
              Your Age: <span className="text-[#0A1628] font-semibold">{age}</span>
            </label>
            <input type="range" min={25} max={70} step={1} value={age}
              onChange={e => setAge(Number(e.target.value))} className="w-full accent-[#C9A84C]" />
            <div className="flex justify-between text-[10px] text-slate-300 mt-1"><span>25</span><span>70</span></div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">Dependents</label>
            <div className="flex gap-2">
              {["0", "1-2", "3+"].map(d => (
                <button key={d} onClick={() => setDependents(d)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${dependents === d ? "bg-[#0A1628] text-white" : "bg-gray-50 text-slate-400 hover:bg-gray-100"}`}>
                  {d === "0" ? "None" : d === "1-2" ? "1–2" : "3+"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
              Existing Coverage: <span className="text-[#0A1628] font-semibold">{fmt(existing)}</span>
            </label>
            <input type="range" min={0} max={5000000} step={25000} value={existing}
              onChange={e => setExisting(Number(e.target.value))} className="w-full accent-[#C9A84C]" />
            <div className="flex justify-between text-[10px] text-slate-300 mt-1"><span>$0</span><span>$5M</span></div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-[#0A1628] rounded-2xl p-6 text-white space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Recommended</p>
            <p className="text-[#C9A84C] text-2xl font-light">{fmt(recommended)}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">{multiplier}× income · age {age}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">You Have</p>
            <p className="text-white text-2xl font-light">{fmt(existing)}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">{pctCovered}% of recommended</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Your Gap</p>
            <p className={`text-2xl font-light ${gap > 0 ? "text-red-400" : "text-green-400"}`}>
              {gap > 0 ? fmt(gap) : "No gap"}
            </p>
            <p className="text-slate-500 text-[10px] mt-0.5">{gap > 0 ? "Unprotected" : "Well covered"}</p>
          </div>
        </div>

        {/* Coverage bar */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-2">
            <span>Coverage vs Need</span>
            <span>{pctCovered}% covered</span>
          </div>
          <div className="w-full h-3 bg-[#1a3060] rounded-full overflow-hidden flex">
            <div className="h-full bg-green-500 rounded-l-full transition-all" style={{ width: `${pctCovered}%` }} />
            {gap > 0 && <div className="h-full bg-red-500/60 flex-1 rounded-r-full" />}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span className="text-green-400">{fmt(covered)} covered</span>
            {gap > 0 && <span className="text-red-400">{fmt(gap)} gap</span>}
          </div>
        </div>

        {gap > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-300 text-sm font-medium">If something happened to you today…</p>
            <p className="text-slate-300 text-xs mt-1">
              Your family would receive {fmt(existing)} — {fmt(gap)} less than what's recommended to replace your income and protect your dependents. Closing this gap costs approximately {fmt(annualGapCost)}/yr in coverage.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
        <div>
          <p className="text-[#0A1628] font-medium text-sm">Want to see how to close this gap efficiently?</p>
          <p className="text-slate-400 text-xs mt-0.5">Your advisor can show you structures that provide coverage and build cash value simultaneously.</p>
        </div>
        <button onClick={onSchedule}
          className="flex-shrink-0 ml-6 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-colors">
          Schedule a Call
        </button>
      </div>
    </div>
  );
}
