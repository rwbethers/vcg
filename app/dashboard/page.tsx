import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import ProspectDashboard from "./ProspectDashboard";
import UnderwritingDashboard from "./UnderwritingDashboard";
import fs from "fs";
import path from "path";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: clientData } = await supabase
    .from("clients")
    .select("*")
    .eq("email", user.email)
    .single();

  if (!clientData) redirect("/");

  const stage = clientData.stage ?? "client";

  if (stage === "prospect") {
    return <ProspectDashboard client={clientData} />;
  }

  if (stage === "underwriting") {
    return <UnderwritingDashboard client={clientData} />;
  }

  const [{ data: policies }, { data: actionItems }, { data: deals }, { data: documents }, { data: announcements }, { data: illustrations }, { data: collateralAccounts }] =
    await Promise.all([
      supabase.from("policies").select("*").eq("client_id", clientData.id).order("issue_date"),
      supabase.from("action_items").select("*").eq("client_id", clientData.id).eq("completed", false).order("due_date"),
      supabase.from("deals").select("*").order("created_at"),
      supabase.from("documents").select("*").eq("client_id", clientData.id).order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1),
      supabase.from("illustrations").select("*").eq("client_id", clientData.id).order("created_at", { ascending: false }).limit(1),
      supabase.from("collateral_accounts").select("*").eq("client_id", clientData.id).order("created_at"),
    ]);

  const policyIllustrationUrls: Record<string, string> = {};
  for (const policy of policies ?? []) {
    const filePath = path.join(process.cwd(), "public", "illustrations", `${policy.policy_number}_1.pdf`);
    if (fs.existsSync(filePath)) {
      policyIllustrationUrls[policy.policy_number] = `/illustrations/${policy.policy_number}_1.pdf`;
    }
  }

  return (
    <DashboardClient
      client={clientData}
      policies={policies ?? []}
      actionItems={actionItems ?? []}
      deals={deals ?? []}
      documents={documents ?? []}
      announcement={announcements?.[0] ?? null}
      illustration={illustrations?.[0] ?? null}
      collateralAccounts={collateralAccounts ?? []}
      policyIllustrationUrls={policyIllustrationUrls}
    />
  );
}
