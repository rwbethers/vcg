"use client";
import { useState, useRef, useEffect } from "react";

interface Client {
  id: string;
  name: string;
  email: string;
  type: string;
  advisor: string;
  stage?: string;
}

interface ActionItem {
  id: string;
  client_id: string;
  label: string;
  due_date: string;
  priority: string;
  completed: boolean;
  clients?: { name: string };
}

interface Deal {
  id: string;
  title: string;
  asset_class: string;
  status: string;
  target_return: string;
  minimum_investment: number;
  sponsor: string;
}

interface Announcement {
  id: string;
  message: string;
  type: string;
  active: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  adminEmail: string;
  clients: Client[];
  actionItems: ActionItem[];
  deals: Deal[];
  announcements: Announcement[];
}

const QUICK_PROMPTS = [
  "What action items are due this week?",
  "Give me a snapshot of all active clients",
  "Which clients are in underwriting or prospect stage?",
  "Summarize the private market deals",
  "Draft a policy review follow-up email",
  "Which clients should I prioritize contacting?",
];

function buildSystemContext(props: Props) {
  const { adminEmail, clients, actionItems, deals, announcements } = props;

  const clientList = clients
    .map(
      (c) =>
        `- ${c.name} | Advisor: ${c.advisor} | Type: ${c.type} | Stage: ${c.stage ?? "client"} | Email: ${c.email}`
    )
    .join("\n");

  const openItems = actionItems
    .filter((a) => !a.completed)
    .map(
      (a) =>
        `- [${a.priority.toUpperCase()}] ${a.label} | Client: ${a.clients?.name ?? a.client_id} | Due: ${a.due_date}`
    )
    .join("\n");

  const dealList = deals
    .map(
      (d) =>
        `- ${d.title} | ${d.asset_class} | Status: ${d.status} | Target: ${d.target_return} | Min: $${d.minimum_investment?.toLocaleString()} | Sponsor: ${d.sponsor}`
    )
    .join("\n");

  const activeAnnouncements = announcements
    .filter((a) => a.active)
    .map((a) => `- [${a.type}] ${a.message}`)
    .join("\n");

  return `You are an elite AI assistant embedded inside the Vision Consulting Group (VCG) admin portal. You work alongside the advisor team to manage high-net-worth clients, life insurance portfolios, and private market investments.

VCG is a premium insurance and financial services firm. The three advisors are Stephen Mongie, Samuel Noel, and Zach McGlothin. The admin logged in is ${adminEmail}.

You have full access to the following live data:

## CLIENTS (${clients.length} total)
${clientList || "No clients loaded."}

## OPEN ACTION ITEMS
${openItems || "No open action items."}

## PRIVATE MARKET DEALS
${dealList || "No deals loaded."}

## ACTIVE ANNOUNCEMENTS
${activeAnnouncements || "None."}

## YOUR CAPABILITIES
- Answer any question about clients, their status, advisor assignments, and pipeline stage
- Identify which clients need attention based on action items, stage, or priority
- Draft professional client communications (emails, follow-ups, summaries)
- Summarize portfolio snapshots for advisor meetings
- Help prioritize workload across the three advisors
- Flag high-priority items or patterns across the book of business
- Assist with deal analysis, client onboarding, or policy review prep

## TONE & FORMAT
- Be concise and direct — advisors are busy
- Use bullet points and clear structure for multi-part answers
- When drafting emails, write them ready to copy and send
- Always maintain a premium, professional tone befitting a high-net-worth advisory firm
- You may refer to clients by first name in informal contexts but always use full name in communications

Today's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
}

export default function AIAssistant(props: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `Good ${getTimeOfDay()}, I'm your VCG AI assistant. I have full visibility into your ${props.clients.length} clients, open action items, and private market deals.\n\nWhat can I help you with today?`,
        },
      ]);
    }
  }, [open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    const apiMessages = updated.map((m) => ({ role: m.role, content: m.content }));
    const systemContext = buildSystemContext(props);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, systemContext }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: assistantText },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I ran into an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open
            ? "bg-[#0A1628] rotate-45"
            : "bg-[#C9A84C] hover:bg-[#E8C96C] hover:scale-105"
        }`}
      >
        {open ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-[#0A1628]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      <div
        className={`fixed bottom-0 right-0 z-40 flex flex-col bg-white shadow-2xl border-l border-gray-100 transition-all duration-300 ease-in-out ${
          open ? "w-[420px] h-[calc(100vh-0px)] opacity-100" : "w-[420px] h-0 opacity-0 pointer-events-none"
        }`}
        style={{ maxHeight: "100vh" }}
      >
        {/* Header */}
        <div className="bg-[#0A1628] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#C9A84C]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">VCG AI Assistant</p>
              <p className="text-slate-500 text-[10px]">{props.clients.length} clients · {props.actionItems.filter(a => !a.completed).length} open items</p>
            </div>
          </div>
          <button
            onClick={() => { setMessages([]); }}
            className="text-slate-600 text-[10px] hover:text-slate-400 transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                  <svg className="w-3 h-3 text-[#C9A84C]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-[#0A1628] text-white rounded-br-sm"
                    : "bg-[#F4F5F7] text-slate-700 rounded-bl-sm"
                }`}
              >
                {m.content}
                {m.role === "assistant" && loading && i === messages.length - 1 && m.content === "" && (
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5 flex-shrink-0">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="text-[10px] px-3 py-1.5 bg-[#F4F5F7] hover:bg-[#C9A84C]/10 hover:text-[#C9A84C] text-slate-500 rounded-full transition-colors border border-transparent hover:border-[#C9A84C]/20"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-end gap-2 bg-[#F4F5F7] rounded-2xl px-4 py-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about your clients or book of business…"
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 resize-none focus:outline-none max-h-32"
              style={{ lineHeight: "1.5" }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#C9A84C] disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-[#E8C96C]"
            >
              <svg className="w-4 h-4 text-[#0A1628]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
