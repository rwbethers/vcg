import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim());

  if (!adminEmails.includes(user.email ?? "")) redirect("/dashboard");

  const { data: goals } = await supabase.from("goals").select("*").order("metric");

  return <AdminClient adminEmail={user.email ?? ""} goals={goals ?? []} />;
}
