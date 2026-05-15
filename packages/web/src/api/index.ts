import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDocsIndex } from "./agent/docs-cache";

const FIREWORKS_API = "https://api.fireworks.ai/inference/v1/chat/completions";
const MODEL = "accounts/fireworks/models/kimi-k2p5";

// Pre-warm docs on first health check
let warmCalled = false;
function warmDocs() {
  if (warmCalled) return;
  warmCalled = true;
  getDocsIndex().catch(() => {});
}

function buildSystem(docsIndex: string) {
  return `You are Hermes Docs AI — the expert assistant for Hermes Agent by Nous Research.

Base your answers on the official Hermes documentation below. Be concise and direct. Use markdown with code blocks for commands. Cite doc URLs when helpful. If you're unsure, point to the relevant doc page.

---
${docsIndex}
---

Answer the user's question using the documentation above.`;
}

const app = new Hono()
  .basePath("api")
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))
  .get("/health", (c) => {
    warmDocs();
    return c.json({ status: "ok" }, 200);
  })
  .post("/agent/messages", async (c) => {
    const { messages } = await c.req.json();

    // Get cached docs (pre-warmed, < 1ms if cached)
    const docsIndex = await getDocsIndex();
    const systemPrompt = buildSystem(docsIndex);

    const normalizedMessages = messages.map((m: any) => ({
      role: m.role as string,
      content:
        m.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n") ??
        m.content ?? "",
    }));

    const response = await fetch(FIREWORKS_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...normalizedMessages],
        temperature: 0.1,
        max_tokens: 2048,
        thinking: { type: "disabled" },
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return c.json({ error: err }, 500);
    }

    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        const msgId = `msg_${Date.now()}`;
        let started = false;

        controller.enqueue(encoder.encode(`data: {"type":"start"}\n\n`));
        controller.enqueue(encoder.encode(`data: {"type":"start-step"}\n\n`));

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const lines = decoder.decode(value, { stream: true }).split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") continue;
              try {
                const parsed = JSON.parse(raw);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  if (!started) {
                    controller.enqueue(encoder.encode(`data: {"type":"text-start","id":"${msgId}"}\n\n`));
                    started = true;
                  }
                  controller.enqueue(
                    encoder.encode(`data: {"type":"text-delta","id":"${msgId}","delta":${JSON.stringify(content)}}\n\n`)
                  );
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (e) {
          console.error("Stream error:", e);
        }

        if (started) controller.enqueue(encoder.encode(`data: {"type":"text-end","id":"${msgId}"}\n\n`));
        controller.enqueue(encoder.encode(`data: {"type":"finish-step"}\n\n`));
        controller.enqueue(encoder.encode(`data: {"type":"finish","finishReason":"stop"}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Vercel-AI-UI-Message-Stream": "v1",
      },
    });
  });

export type AppType = typeof app;
export default app;
