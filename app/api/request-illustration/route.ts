import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const ADVISOR_PHONES: Record<string, string> = {
  "Stephen Mongie": "(435) 899-0172",
  "Samuel Noel":    "(435) 899-0172",
  "Zach McGlothin": "(435) 899-0172",
};

const ADVISOR_EMAILS: Record<string, string> = {
  "Stephen Mongie": "smongie@vcgclient.com",
  "Samuel Noel":    "snoel@vcgclient.com",
  "Zach McGlothin": "zmcglothin@vcgclient.com",
};

function currentQuarter() {
  const d = new Date();
  return `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
}

export async function POST(req: Request) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const resendKey    = process.env.RESEND_API_KEY;
  if (!anthropicKey) return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const body = await req.json();
  const {
    // Direct policy fields (from policies table)
    policy_id,
    policy_number: directPolicyNumber,
    carrier: directCarrier,
    product_name: directProduct,
    face_amount: directFaceAmount,
    annual_prem: directAnnualPrem,
    client_name: directClientName,
    client_id: directClientId,
    advisor_name: directAdvisorName,
    // Legacy illustration_id path
    illustration_id,
    carrier_email,
    quarter,
    email_body: providedBody,
    action,
  } = body;

  let clientName: string, advisorName: string, policyNumber: string, faceFormatted: string, annualPrem: number, carrier: string, productName: string, clientId: string | undefined;

  if (directClientName) {
    // Direct policy path
    clientName   = directClientName;
    advisorName  = directAdvisorName ?? "";
    policyNumber = directPolicyNumber ?? "[POLICY NUMBER]";
    faceFormatted = directFaceAmount ? `$${Number(directFaceAmount).toLocaleString()}` : "N/A";
    annualPrem   = Number(directAnnualPrem ?? 0);
    carrier      = directCarrier ?? "";
    productName  = directProduct ?? "";
    clientId     = directClientId;
  } else {
    // Legacy illustration path
    const { data: illus, error: illusErr } = await supabase
      .from("illustrations")
      .select("*, clients(name, advisor)")
      .eq("id", illustration_id)
      .single();
    if (illusErr || !illus) return Response.json({ error: "Illustration not found" }, { status: 404 });
    clientName   = (illus.clients as { name: string } | null)?.name ?? illus.prospect_name;
    advisorName  = (illus.clients as { advisor: string } | null)?.advisor ?? illus.advisor_name;
    policyNumber = illus.policy_number ?? "[POLICY NUMBER]";
    faceFormatted = illus.face_amount ? `$${Number(illus.face_amount).toLocaleString()}` : "N/A";
    annualPrem   = Number(illus.annual_prem ?? 0);
    carrier      = illus.carrier;
    productName  = illus.product_name;
    clientId     = illus.client_id;
  }

  const advisorEmail  = ADVISOR_EMAILS[advisorName] ?? "team@vcgllc.com";
  const advisorPhone  = ADVISOR_PHONES[advisorName] ?? "(435) 899-0172";
  const targetQuarter = quarter || currentQuarter();

  // Generate email draft with Claude (unless one was already provided)
  let emailBody = providedBody ?? "";

  if (!emailBody) {
    const claude = new Anthropic({ apiKey: anthropicKey });
    const msg = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      messages: [{
        role: "user",
        content: `You are drafting a professional inforce illustration request email on behalf of a life insurance advisor at Vision Consulting Group (VCG).

Policy details:
- Policy Owner: ${clientName}
- Policy Number: ${policyNumber}
- Carrier: ${carrier}
- Product: ${productName}
- Face Amount: ${faceFormatted}
- Annual Premium: $${annualPrem.toLocaleString()}
- Advisor: ${advisorName}
- Advisor Email: ${advisorEmail}
- Advisor Phone: ${advisorPhone}
- Quarter Requested: ${targetQuarter}
- Today's Date: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}

Write a concise, professional email to the carrier's service center requesting an updated inforce illustration. The email should:
1. Reference the policy owner name and policy number clearly
2. Request an updated inforce illustration reflecting current policy values as of today
3. Request non-guaranteed projections at the current illustrated rate
4. Request an alternate projection at 7.00% illustrated rate (if different from current rate)
5. Ask them to email the completed illustration to ${advisorEmail}
6. Include a professional closing with the advisor's contact info

Return ONLY the plain-text email body. No subject line, no markdown, no extra commentary.`,
      }],
    });
    emailBody = msg.content[0].type === "text" ? msg.content[0].text : "";
  }

  const subject = `Inforce Illustration Request — ${clientName} — Policy #${policyNumber} — ${targetQuarter}`;

  // If action is "draft", return without sending or saving
  if (action === "draft") {
    return Response.json({ emailBody, subject });
  }

  // Send via Resend
  let status = "sent";
  let sentAt: string | null = new Date().toISOString();

  if (resendKey) {
    const resend = new Resend(resendKey);
    const { error: sendErr } = await resend.emails.send({
      from: "Vision Consulting Group <onboarding@resend.dev>",
      to: [carrier_email],
      replyTo: advisorEmail,
      subject,
      text: emailBody,
    });
    if (sendErr) {
      status = "draft";
      sentAt = null;
    }
  } else {
    // No Resend key — save as draft
    status = "draft";
    sentAt = null;
  }

  // Record in DB
  const { data: record, error: dbErr } = await supabase
    .from("illustration_requests")
    .insert({
      client_id:      clientId,
      illustration_id: illustration_id ?? null,
      policy_id:      policy_id ?? null,
      quarter:        targetQuarter,
      carrier,
      carrier_email,
      policy_number:  policyNumber,
      policy_owner:   clientName,
      requested_by:   advisorEmail,
      email_subject:  subject,
      email_body:     emailBody,
      status,
      sent_at:        sentAt,
    })
    .select()
    .single();

  if (dbErr) return Response.json({ error: dbErr.message }, { status: 500 });

  return Response.json({ emailBody, subject, request: record, status });
}
