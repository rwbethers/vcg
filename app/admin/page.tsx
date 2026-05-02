import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(user.email ?? "")) redirect("/dashboard");

  const [
    { data: goals },
    { data: clients },
    { data: actionItems },
    { data: deals },
    { data: announcements },
  ] = await Promise.all([
    supabase.from("goals").select("*").order("metric"),
    supabase.from("clients").select("*").order("name"),
    supabase.from("action_items").select("*, clients(name)").order("due_date"),
    supabase.from("deals").select("*").order("created_at"),
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <AdminClient
      adminEmail={user.email ?? ""}
      goals={goals ?? []}
      clients={clients ?? []}
      actionItems={actionItems ?? []}
      deals={deals ?? []}
      announcements={announcements ?? []}
    />
  );
}
