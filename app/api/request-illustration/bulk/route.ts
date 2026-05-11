import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const ADVISOR_PHONES: Record<string, string> = {
  "Stephen Mongie":  "(435) 899-0172",
  "Samuel Noel":     "(435) 899-0172",
  "Zach McGlothin":  "(435) 899-0172",
};
const ADVISOR_EMAILS: Record<string, string> = {
  "Stephen Mongie":  "smongie@vcgllc.com",
  "Samuel Noel":     "snoel@vcgllc.com",
  "Zach McGlothin":  "zmcglothin@vcgllc.com",
};

function currentQuarter() {
  const d = new Date();
  return `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
}

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const resendKey    = process.env.RESEND_API_KEY;
  if (!anthropicKey) return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { quarter: reqQuarter } = await req.json() as { quarter?: string };
  const targetQuarter = reqQuarter || currentQuarter();

  // Fetch all illustrations that have a carrier service email
  const { data: illustrations, error: illusErr } = await supabase
    .from("illustrations")
    .select("*, clients(name, advisor)")
    .not("carrier_service_email", "is", null);

  if (illusErr || !illustrations?.length) {
    return Response.json({ error: "No illustrations with carrier emails found" }, { status: 400 });
  }

  // Fetch requests already sent this quarter so we can skip them
  const { data: existing } = await supabase
    .from("illustration_requests")
    .select("illustration_id")
    .eq("quarter", targetQuarter);

  const alreadySent = new Set((existing ?? []).map(r => r.illustration_id));

  const claude  = new Anthropic({ apiKey: anthropicKey });
  const resend  = resendKey ? new Resend(resendKey) : null;

  const results: {
    client: string;
    carrier: string;
    status: "sent" | "draft" | "skipped" | "error";
    reason?: string;
  }[] = [];

  for (const illus of illustrations) {
    const clientName   = (illus.clients as { name: string } | null)?.name ?? illus.prospect_name ?? "Client";
    const advisorName  = (illus.clients as { advisor: string } | null)?.advisor ?? illus.advisor_name ?? "";
    const advisorEmail = ADVISOR_EMAILS[advisorName] ?? "team@vcgllc.com";
    const advisorPhone = ADVISOR_PHONES[advisorName] ?? "(435) 899-0172";
    const policyNumber = illus.policy_number ?? "[POLICY NUMBER]";
    const carrierEmail = illus.carrier_service_email as string;
    const faceFormatted = illus.face_amount ? `$${Number(illus.face_amount).toLocaleString()}` : "N/A";

    // Skip if already sent this quarter
    if (alreadySent.has(illus.id)) {
      results.push({ client: clientName, carrier: illus.carrier, status: "skipped", reason: "Already sent this quarter" });
      continue;
    }

    try {
      // Generate email with Claude
      const msg = await claude.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        messages: [{
          role: "user",
          content: `Draft a professional inforce illustration request email for a life insurance advisor at Vision Consulting Group.

Policy Owner: ${clientName}
Policy Number: ${policyNumber}
Carrier: ${illus.carrier}
Product: ${illus.product_name}
Face Amount: ${faceFormatted}
Annual Premium: $${Number(illus.annual_prem).toLocaleString()}
Advisor: ${advisorName} | ${advisorEmail} | ${advisorPhone}
Quarter: ${targetQuarter}
Date: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}

Request an updated inforce illustration with current values, non-guaranteed projections at current rate, and an alternate at 7.00%. Ask them to email results to ${advisorEmail}. Return ONLY the plain-text email body.`,
        }],
      });

      const emailBody = msg.content[0].type === "text" ? msg.content[0].text : "";
      const subject   = `Inforce Illustration Request — ${clientName} — Policy #${policyNumber} — ${targetQuarter}`;

      // Send via Resend
      let status: "sent" | "draft" = "draft";
      let sentAt: string | null = null;

      if (resend) {
        const { error: sendErr } = await resend.emails.send({
          from:    "Vision Consulting Group <onboarding@resend.dev>",
          to:      [carrierEmail],
          replyTo: advisorEmail,
          subject,
          text:    emailBody,
        });
        if (!sendErr) { status = "sent"; sentAt = new Date().toISOString(); }
      }

      // Save to DB
      await supabase.from("illustration_requests").insert({
        client_id:      illus.client_id,
        illustration_id: illus.id,
        quarter:        targetQuarter,
        carrier:        illus.carrier,
        carrier_email:  carrierEmail,
        policy_number:  policyNumber,
        policy_owner:   clientName,
        requested_by:   advisorEmail,
        email_subject:  subject,
        email_body:     emailBody,
        status,
        sent_at:        sentAt,
      });

      results.push({ client: clientName, carrier: illus.carrier, status });

    } catch (e) {
      results.push({ client: clientName, carrier: illus.carrier, status: "error", reason: String(e).slice(0, 100) });
    }

    // Throttle — avoid Claude rate limits
    await new Promise(r => setTimeout(r, 800));
  }

  const sent    = results.filter(r => r.status === "sent").length;
  const drafted = results.filter(r => r.status === "draft").length;
  const skipped = results.filter(r => r.status === "skipped").length;
  const errors  = results.filter(r => r.status === "error").length;

  return Response.json({ quarter: targetQuarter, sent, drafted, skipped, errors, results });
}
