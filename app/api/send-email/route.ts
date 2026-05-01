import { Resend } from "resend";

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const { to, subject, body, fromName } = await req.json();

  const resend = new Resend(apiKey);
  const from = `${fromName || "Vision Consulting Group"} <onboarding@resend.dev>`;

  const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1a1a2e;padding:40px 20px;">
    ${body.split("\n").map((line: string) => line.trim() ? `<p style="margin:0 0 16px;line-height:1.7;">${line}</p>` : "<br/>").join("")}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;"/>
    <p style="color:#9ca3af;font-size:12px;margin:0;">Vision Consulting Group · team@vcgllc.com · (435) 899-0172</p>
  </div>`;

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) return Response.json({ error }, { status: 400 });
  return Response.json({ success: true, id: data?.id });
}
