"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Client {
  id: string;
  name: string;
  advisor: string;
  stage: string;
}

interface Task {
  id: string;
  label: string;
  category: string;
  sort_order: number;
  completed: boolean;
  completed_at: string | null;
}

interface Props {
  client: Client;
}

const categoryOrder = ["Application", "Medical", "Underwriting", "Policy", "Onboarding"];

const categoryIcons: Record<string, string> = {
  Application: "◈",
  Medical: "◎",
  Underwriting: "⟁",
  Policy: "◉",
  Onboarding: "◇",
};

export default function UnderwritingDashboard({ client }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("underwriting_tasks")
      .select("*")
      .eq("client_id", client.id)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setTasks(data);
        setLoading(false);
      });
  }, [client.id]);

  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const grouped = categoryOrder.reduce<Record<string, Task[]>>((acc, cat) => {
    const items = tasks.filter((t) => t.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      {/* Header */}
      <header className="bg-[#0A1628] sticky top-0 z-30">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl px-4 py-2 inline-block">
              <img src="/vcg-logo.png" alt="Vision Consulting Group" className="h-7 w-auto" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-amber-400 text-[10px] font-semibold uppercase tracking-widest px-3 py-1 bg-amber-400/10 rounded-full border border-amber-400/30">
              In Underwriting
            </span>
            <form action="/auth/signout" method="POST">
              <button type="submit" className="text-slate-600 text-xs hover:text-slate-400 transition-colors">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="px-6 py-8 max-w-2xl mx-auto space-y-8">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-light text-[#0A1628]">
            Welcome, {client.name.split(" ")[0]}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Your application is moving through underwriting. Here's where things stand.
          </p>
        </div>

        {/* Progress card */}
        <div className="bg-[#0A1628] rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Application Progress</p>
              <p className="text-3xl font-light">{pct}%</p>
            </div>
            <div className="text-right">
              <p className="text-[#C9A84C] text-2xl font-light">{completed}</p>
              <p className="text-slate-400 text-xs">of {total} steps</p>
            </div>
          </div>
          <div className="w-full h-2.5 bg-[#1a3060] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C9A84C] rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${pct === 100 ? "bg-green-400" : "bg-amber-400 animate-pulse"}`} />
            <p className="text-slate-300 text-xs">
              {pct === 100
                ? "All steps complete — your advisor will be in touch shortly"
                : "Actively processing — your advisor will contact you for each step"}
            </p>
          </div>
        </div>

        {/* Advisor */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Your Advisor</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0A1628] flex items-center justify-center">
              <span className="text-[#C9A84C] text-sm font-semibold">
                {client.advisor.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
            </div>
            <div>
              <p className="text-[#0A1628] font-medium text-sm">{client.advisor}</p>
              <p className="text-slate-400 text-xs">Vision Consulting Group</p>
            </div>
          </div>
        </div>

        {/* Checklist */}
        {loading ? (
          <div className="text-slate-400 text-sm text-center py-12">Loading your checklist…</div>
        ) : (
          <div className="space-y-5">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Application Steps</p>
            {Object.entries(grouped).map(([cat, items]) => {
              const catDone = items.filter((t) => t.completed).length;
              return (
                <div key={cat} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[#C9A84C]">{categoryIcons[cat] ?? "◦"}</span>
                      <span className="text-xs font-semibold text-[#0A1628]">{cat}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{catDone}/{items.length}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.map((task) => (
                      <div key={task.id} className="px-5 py-3.5 flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          task.completed ? "bg-green-400 border-green-400" : "border-gray-200"
                        }`}>
                          {task.completed && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        <span className={`text-sm flex-1 ${task.completed ? "line-through text-slate-400" : "text-[#0A1628]"}`}>
                          {task.label}
                        </span>
                        {task.completed && task.completed_at && (
                          <span className="text-slate-300 text-[10px] flex-shrink-0">
                            {new Date(task.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* What's next teaser */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#C9A84C]/20">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-4">What's Waiting for You</p>
          <div className="space-y-3">
            {[
              { icon: "◎", label: "Full portfolio dashboard", desc: "Cash value, death benefit, and policy details in one place" },
              { icon: "◉", label: "Private market deals", desc: "Exclusive investment opportunities curated for VCG clients" },
              { icon: "⟁", label: "Tax strategy tools", desc: "Visualize how your policy reduces your tax burden" },
              { icon: "⊟", label: "Document vault", desc: "All your statements and policy documents, organized" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 opacity-60">
                <span className="text-[#C9A84C] mt-0.5 flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[#0A1628] text-sm font-medium">{item.label}</p>
                  <p className="text-slate-400 text-xs">{item.desc}</p>
                </div>
                <span className="ml-auto text-[10px] text-slate-300 bg-gray-50 px-2 py-0.5 rounded-full flex-shrink-0">Soon</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
