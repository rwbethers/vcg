import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 500 });
  }

  const { email, name } = await req.json();
  if (!email) return Response.json({ error: "Email required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcg-iota.vercel.app"}/auth/callback`,
    data: { full_name: name },
  });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true, user: data.user });
}
