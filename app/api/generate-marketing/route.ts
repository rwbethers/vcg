import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `You are a marketing copywriter for Vision Consulting Group (VCG), a boutique wealth management firm in Utah. VCG specializes in whole life insurance, premium finance, indexed universal life (IUL), and private market investments (real estate, private equity, private credit).

Advisors: Stephen Mongie (Principal), Samuel Noel (Principal), Zach McGlothin (COO)
Contact: team@vcgllc.com | (435) 899-0172 | vcgllc.com

Tone guidance:
- Professional but warm — this is a relationship-driven firm, not a cold institution
- Never use hype or pushy sales language
- Focus on education, trust, and long-term thinking
- Speak to accredited investors and high-net-worth individuals

Always respond in this exact JSON format:
{
  "subject": "Email subject line here",
  "email": "Full email body here (use \\n for line breaks)",
  "sms": "SMS version under 160 characters"
}`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { campaignType, audience, tone, advisor, customNotes } = await req.json();

  const prompt = `Generate marketing copy for VCG with these parameters:

Campaign Type: ${campaignType}
Target Audience: ${audience}
Tone: ${tone}
Signing Advisor: ${advisor || "The VCG Team"}
Additional Context: ${customNotes || "None"}

Return the JSON format exactly as specified.`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? text);
    return Response.json(parsed);
  } catch {
    return Response.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
  }
}
