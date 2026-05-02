"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface FeedItem {
  id: string;
  type: "deal_interest" | "document_upload" | "action_completed";
  title: string;
  subtitle: string;
  timestamp: string;
  icon: string;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityFeedTab() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("deal_interest").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("documents").select("*").eq("uploaded_by", "client").order("created_at", { ascending: false }).limit(30),
    ]).then(([diRes, docRes]) => {
      const items: FeedItem[] = [];

      (diRes.data ?? []).forEach((di) => {
        items.push({
          id: `di-${di.id}`,
          type: "deal_interest",
          title: `${di.client_name} requested info on ${di.deal_title}`,
          subtitle: di.asset_class,
          timestamp: di.created_at,
          icon: "🏦",
        });
      });

      (docRes.data ?? []).forEach((doc) => {
        items.push({
          id: `doc-${doc.id}`,
          type: "document_upload",
          title: `Client uploaded ${doc.file_name}`,
          subtitle: doc.category,
          timestamp: doc.created_at,
          icon: "📎",
        });
      });

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFeed(items);
      setLoading(false);
    });
  }, []);

  const typeColors: Record<string, string> = {
    deal_interest:    "bg-[#C9A84C]/10 text-[#C9A84C]",
    document_upload:  "bg-blue-50 text-blue-600",
    action_completed: "bg-green-50 text-green-600",
  };

  const typeLabels: Record<string, string> = {
    deal_interest:    "Deal Interest",
    document_upload:  "Document",
    action_completed: "Task Done",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light text-[#0A1628]">Activity Feed</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time log of client activity across the portal</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-14 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : feed.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-slate-500 text-sm font-medium">No activity yet</p>
          <p className="text-slate-400 text-xs mt-1">Client actions will appear here as they use the portal.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
          {feed.map((item) => (
            <div key={item.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#FAFBFC] transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#0A1628] text-sm">{item.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{item.subtitle}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${typeColors[item.type]}`}>
                  {typeLabels[item.type]}
                </span>
                <span className="text-slate-400 text-xs">{fmtDate(item.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
