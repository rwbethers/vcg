"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  clientId: string;
  clientName: string;
  advisorName: string;
  onSchedule: () => void;
}

const questions = [
  {
    category: "Protection",
    question: "What life insurance do you currently have?",
    options: [
      { label: "None", score: 0 },
      { label: "Term only", score: 1 },
      { label: "Some permanent coverage", score: 2 },
      { label: "Permanent + term, well-structured", score: 3 },
    ],
  },
  {
    category: "Protection",
    question: "Is your income protected if you're unable to work?",
    options: [
      { label: "No disability coverage", score: 0 },
      { label: "Short-term only through employer", score: 1 },
      { label: "Some long-term disability coverage", score: 2 },
      { label: "Comprehensive disability plan", score: 3 },
    ],
  },
  {
    category: "Retirement",
    question: "How are you building toward retirement?",
    options: [
      { label: "No retirement savings", score: 0 },
      { label: "Just a 401(k)", score: 1 },
      { label: "401(k) + IRA, some diversification", score: 2 },
      { label: "Multiple accounts, tax-diversified strategy", score: 3 },
    ],
  },
  {
    category: "Retirement",
    question: "Do you have a tax reduction strategy beyond your 401(k)?",
    options: [
      { label: "No — just the standard deduction", score: 0 },
      { label: "HSA, maybe a backdoor Roth", score: 1 },
      { label: "Active tax planning with a CPA", score: 2 },
      { label: "Comprehensive tax strategy across accounts", score: 3 },
    ],
  },
  {
    category: "Legal",
    question: "Do you have an estate plan?",
    options: [
      { label: "Nothing in place", score: 0 },
      { label: "Just a basic will", score: 1 },
      { label: "Will, POA, healthcare directive", score: 2 },
      { label: "Trust established, fully structured", score: 3 },
    ],
  },
  {
    category: "Legal",
    question: "How exposed are your assets to lawsuits or creditors?",
    options: [
      { label: "Mostly exposed — no asset protection", score: 0 },
      { label: "Some protection through retirement accounts", score: 1 },
      { label: "Business structured (LLC/Corp), some shielding", score: 2 },
      { label: "Comprehensive protection — trusts, entities, insurance", score: 3 },
    ],
  },
  {
    category: "Legacy",
    question: "Do you have a financial plan for what you leave behind?",
    options: [
      { label: "No legacy plan", score: 0 },
      { label: "Basic beneficiary designations only", score: 1 },
      { label: "Some life insurance + basic estate planning", score: 2 },
      { label: "Comprehensive legacy and wealth transfer plan", score: 3 },
    ],
  },
];

const MAX_SCORE = questions.length * 3;

const categoryColors: Record<string, string> = {
  Protection: "bg-blue-400",
  Retirement: "bg-purple-400",
  Legal: "bg-amber-400",
  Legacy: "bg-green-400",
};

const categoryText: Record<string, string> = {
  Protection: "text-blue-600",
  Retirement: "text-purple-600",
  Legal: "text-amber-600",
  Legacy: "text-green-600",
};

function scoreLabel(pct: number) {
  if (pct >= 80) return { label: "Strong", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" };
  if (pct >= 55) return { label: "Developing", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
  return { label: "At Risk", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
}

export default function ProspectWealthScore({ clientId, clientName, advisorName, onSchedule }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const answered = Object.keys(answers).length;
  const complete = answered === questions.length;

  const totalScore = Object.values(answers).reduce((s, v) => s + v, 0);
  const pct = Math.round((totalScore / MAX_SCORE) * 100);
  const overall = scoreLabel(pct);

  const categories = ["Protection", "Retirement", "Legal", "Legacy"];
  const catScores = categories.map(cat => {
    const qs = questions.map((q, i) => ({ q, i })).filter(({ q }) => q.category === cat);
    const maxCat = qs.length * 3;
    const got = qs.reduce((s, { i }) => s + (answers[i] ?? 0), 0);
    return { cat, pct: maxCat > 0 ? Math.round((got / maxCat) * 100) : 0 };
  });

  const sendToAdvisor = async () => {
    setSubmitting(true);
    const supabase = createClient();
    const summary = catScores.map(c => `${c.cat}: ${c.pct}%`).join(", ");
    await supabase.from("action_items").insert({
      client_id: clientId,
      label: `Wealth Score submitted — ${pct}/100 (${overall.label}) · ${summary}`,
      due_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
      priority: "high",
      completed: false,
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-[#0A1628]">Wealth Score</h2>
        <p className="text-slate-400 text-sm mt-1">7 questions. See exactly where your financial plan is strong — and where it has gaps.</p>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryText[q.category]} bg-gray-50 flex-shrink-0`}>
                {q.category}
              </span>
              <p className="text-[#0A1628] text-sm font-medium">{q.question}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <button key={oi} onClick={() => setAnswers(prev => ({ ...prev, [qi]: opt.score }))}
                  className={`text-left px-4 py-3 rounded-xl text-xs border transition-all ${
                    answers[qi] === opt.score
                      ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#0A1628] font-medium"
                      : "border-gray-100 text-slate-500 hover:border-gray-300 hover:bg-gray-50"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Score */}
      {complete && (
        <div className={`rounded-2xl p-6 border ${overall.bg} ${overall.border} space-y-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Your Wealth Score</p>
              <p className={`text-5xl font-light ${overall.color}`}>{pct}<span className="text-2xl">/100</span></p>
              <p className={`text-sm font-semibold mt-1 ${overall.color}`}>{overall.label}</p>
            </div>
            <div className="space-y-2 flex-1 ml-8">
              {catScores.map(({ cat, pct: cp }) => (
                <div key={cat}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className={categoryText[cat] + " font-semibold"}>{cat}</span>
                    <span className="text-slate-400">{cp}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full ${categoryColors[cat]} rounded-full transition-all`} style={{ width: `${cp}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/70 rounded-xl p-4">
            <p className="text-[#0A1628] text-sm font-medium mb-2">Your biggest gaps</p>
            <ul className="space-y-1.5">
              {catScores.filter(c => c.pct < 60).map(({ cat, pct: cp }) => (
                <li key={cat} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className={`w-2 h-2 rounded-full ${categoryColors[cat]} flex-shrink-0`} />
                  {cat} ({cp}%) — {cp < 30 ? "Needs immediate attention" : "Room to strengthen"}
                </li>
              ))}
              {catScores.every(c => c.pct >= 60) && (
                <li className="text-xs text-green-600">Strong across all categories — let's optimize further</li>
              )}
            </ul>
          </div>

          {submitted ? (
            <div className="bg-white rounded-xl p-4 flex items-center gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <div>
                <p className="text-[#0A1628] font-medium text-sm">Score sent to {advisorName}</p>
                <p className="text-slate-400 text-xs mt-0.5">They'll reach out within 1–2 business days with a personalized review.</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={sendToAdvisor} disabled={submitting}
                className="flex-1 py-3 bg-[#0A1628] hover:bg-[#0d1e3a] text-white rounded-xl text-xs font-semibold uppercase tracking-widest disabled:opacity-50 transition-colors">
                {submitting ? "Sending…" : `Send Score to ${advisorName.split(" ")[0]}`}
              </button>
              <button onClick={onSchedule}
                className="flex-1 py-3 bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors">
                Schedule a Review
              </button>
            </div>
          )}
        </div>
      )}

      {!complete && (
        <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
          <p className="text-slate-400 text-sm">{answered} of {questions.length} answered — complete all questions to see your score</p>
          <div className="mt-3 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#C9A84C] rounded-full transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
