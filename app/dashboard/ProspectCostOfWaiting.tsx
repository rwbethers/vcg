"use client";
import { useState } from "react";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// Approximate monthly premium for $1M 20-yr term by age (male, standard health)
function basePremium(age: number): number {
  if (age <= 30) return 48;
  if (age <= 35) return 68;
  if (age <= 40) return 108;
  if (age <= 45) return 172;
  if (age <= 50) return 278;
  if (age <= 55) return 445;
  if (age <= 60) return 730;
  return 1200;
}

// Future value of annuity: monthly payments compounding at annualRate
function fvAnnuity(monthlyPayment: number, months: number, annualRate: number): number {
  const r = annualRate / 12;
  return monthlyPayment * ((Math.pow(1 + r, months) - 1) / r);
}

export default function ProspectCostOfWaiting({ onSchedule }: { onSchedule: () => void }) {
  const [age, setAge] = useState(38);
  const [budget, setBudget] = useState(500);
  const GROWTH = 0.07;
  const HORIZON = 20; // years modeled

  const delays = [0, 1, 2, 3, 5];

  const rows = delays.map(delay => {
    const startAge = age + delay;
    const monthlyPrem = basePremium(startAge);
    const extraPerMonth = monthlyPrem - basePremium(age);
    const extraOver20yr = extraPerMonth * 12 * HORIZON;
    const growthMissed = fvAnnuity(budget, delay * 12, GROWTH);
    const totalCostOfDelay = extraOver20yr + growthMissed;
    return { delay, startAge, monthlyPrem, extraPerMonth, extraOver20yr, growthMissed, totalCostOfDelay };
  });

  const worstRow = rows[rows.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-[#0A1628]">Cost of Waiting</h2>
        <p className="text-slate-400 text-sm mt-1">Every year you delay costs more than you think — in higher premiums and lost growth.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
              Your Age Today: <span className="text-[#0A1628] font-semibold">{age}</span>
            </label>
            <input type="range" min={25} max={60} step={1} value={age}
              onChange={e => setAge(Number(e.target.value))} className="w-full accent-[#C9A84C]" />
            <div className="flex justify-between text-[10px] text-slate-300 mt-1"><span>25</span><span>60</span></div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
              Monthly Premium Budget: <span className="text-[#0A1628] font-semibold">{fmt(budget)}/mo</span>
            </label>
            <input type="range" min={100} max={5000} step={50} value={budget}
              onChange={e => setBudget(Number(e.target.value))} className="w-full accent-[#C9A84C]" />
            <div className="flex justify-between text-[10px] text-slate-300 mt-1"><span>$100</span><span>$5,000</span></div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 bg-gray-50">
          <div className="grid grid-cols-5 gap-2 text-[10px] uppercase tracking-widest text-slate-400 font-medium">
            <span>If You Start</span>
            <span>Monthly Cost</span>
            <span>Extra Premiums (20yr)</span>
            <span>Growth Missed</span>
            <span>Total Cost of Delay</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {rows.map(row => (
            <div key={row.delay}
              className={`px-5 py-4 grid grid-cols-5 gap-2 items-center transition-colors ${row.delay === 0 ? "bg-green-50" : ""}`}>
              <div>
                <p className={`text-sm font-semibold ${row.delay === 0 ? "text-green-700" : "text-[#0A1628]"}`}>
                  {row.delay === 0 ? "Today" : `+${row.delay} yr${row.delay > 1 ? "s" : ""}`}
                </p>
                <p className="text-slate-400 text-[10px]">Age {row.startAge}</p>
              </div>
              <p className={`text-sm font-medium ${row.delay === 0 ? "text-green-600" : "text-[#0A1628]"}`}>
                {fmt(row.monthlyPrem)}/mo
              </p>
              <div>
                <p className={`text-sm font-medium ${row.delay === 0 ? "text-green-600" : "text-red-500"}`}>
                  {row.delay === 0 ? "—" : "+" + fmt(row.extraOver20yr)}
                </p>
              </div>
              <div>
                <p className={`text-sm font-medium ${row.delay === 0 ? "text-green-600" : "text-amber-600"}`}>
                  {row.delay === 0 ? "—" : fmt(row.growthMissed)}
                </p>
              </div>
              <div>
                <p className={`text-sm font-bold ${row.delay === 0 ? "text-green-600" : "text-red-600"}`}>
                  {row.delay === 0 ? "No cost" : fmt(row.totalCostOfDelay)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0A1628] rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Waiting {worstRow.delay} years costs you</p>
          <p className="text-[#C9A84C] text-3xl font-light">{fmt(worstRow.totalCostOfDelay)}</p>
          <p className="text-slate-400 text-xs mt-1">In higher premiums and foregone compound growth over 20 years</p>
        </div>
        <button onClick={onSchedule}
          className="flex-shrink-0 ml-6 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-colors">
          Start Today
        </button>
      </div>
    </div>
  );
}
