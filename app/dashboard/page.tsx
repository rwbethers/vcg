import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

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

  const { data: policies } = await supabase
    .from("policies")
    .select("*")
    .eq("client_id", clientData.id)
    .order("issue_date");

  const { data: actionItems } = await supabase
    .from("action_items")
    .select("*")
    .eq("client_id", clientData.id)
    .eq("completed", false)
    .order("due_date");

  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .order("created_at");

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", clientData.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardClient
      client={clientData}
      policies={policies ?? []}
      actionItems={actionItems ?? []}
      deals={deals ?? []}
      documents={documents ?? []}
    />
  );
}
