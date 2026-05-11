import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardClient from "@/app/dashboard/DashboardClient";
import ProspectDashboard from "@/app/dashboard/ProspectDashboard";
import UnderwritingDashboard from "@/app/dashboard/UnderwritingDashboard";
import fs from "fs";
import path from "path";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  const supabase = await createClient();

  // Verify admin session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(user.email ?? "")) redirect("/dashboard");

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!client) redirect("/admin");

  const stage = client.stage ?? "client";

  const AdminBar = (
    <div className="fixed top-0 inset-x-0 z-[9999] h-11 bg-[#0A1628] border-b-2 border-[#C9A84C] flex items-center justify-between px-6 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="bg-[#C9A84C] text-[#0A1628] text-[9px] font-bold px-2.5 py-1 rounded uppercase tracking-widest">
          Admin Preview
        </span>
        <span className="text-white text-sm font-medium">{client.name}</span>
        <span className="text-slate-600 text-[10px]">·</span>
        <span className="text-[#C9A84C]/70 text-[10px] uppercase tracking-widest">{stage}</span>
        <span className="text-slate-600 text-[10px]">·</span>
        <span className="text-slate-400 text-xs">Advisor: {client.advisor}</span>
      </div>
      <Link
        href="/admin"
        className="text-slate-400 hover:text-[#C9A84C] text-xs transition-colors"
      >
        ← Back to Admin
      </Link>
    </div>
  );

  if (stage === "prospect") {
    return (
      <>
        {AdminBar}
        <ProspectDashboard client={client} isAdminPreview />
      </>
    );
  }

  if (stage === "underwriting") {
    return (
      <>
        {AdminBar}
        <UnderwritingDashboard client={client} />
      </>
    );
  }

  const [
    { data: policies },
    { data: actionItems },
    { data: deals },
    { data: documents },
    { data: announcements },
    { data: illustrations },
    { data: collateralAccounts },
  ] = await Promise.all([
    supabase.from("policies").select("*").eq("client_id", clientId).order("issue_date"),
    supabase.from("action_items").select("*").eq("client_id", clientId).eq("completed", false).order("due_date"),
    supabase.from("deals").select("*").order("created_at"),
    supabase.from("documents").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("announcements").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1),
    supabase.from("illustrations").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(1),
    supabase.from("collateral_accounts").select("*").eq("client_id", clientId).order("created_at"),
  ]);

  const policyIllustrationUrls: Record<string, string> = {};
  for (const policy of policies ?? []) {
    const filePath = path.join(process.cwd(), "public", "illustrations", `${policy.policy_number}_1.pdf`);
    if (fs.existsSync(filePath)) {
      policyIllustrationUrls[policy.policy_number] = `/illustrations/${policy.policy_number}_1.pdf`;
    }
  }

  return (
    <>
      {AdminBar}
      <DashboardClient
        client={client}
        policies={policies ?? []}
        actionItems={actionItems ?? []}
        deals={deals ?? []}
        documents={documents ?? []}
        announcement={announcements?.[0] ?? null}
        illustration={illustrations?.[0] ?? null}
        collateralAccounts={collateralAccounts ?? []}
        policyIllustrationUrls={policyIllustrationUrls}
      />
    </>
  );
}
