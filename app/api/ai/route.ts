import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  const { messages, systemContext } = await req.json();

  const client = new Anthropic();

  const stream = client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 2048,
    system: systemContext,
    messages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
      } catch (e) {
        controller.enqueue(
          new TextEncoder().encode("\n\n[Error generating response]")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
