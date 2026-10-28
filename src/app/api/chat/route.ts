import { NextResponse } from "next/server";
import { chatRequestSchema, type ChatErrorCode, type ChatStreamEvent } from "@/lib/chat-schema";
import { claude } from "@/lib/chat/claude";
import { gemini } from "@/lib/chat/gemini";
import { getPortfolioKnowledge, type PortfolioKnowledge } from "@/lib/chat/knowledge";
import { buildSystemPrompt, buildVisitorContext } from "@/lib/chat/prompt";
import { configuredChatProvider } from "@/lib/chat/provider";
import { checkRateLimit, visitorKey } from "@/lib/chat/rate-limit";

/** Seconds Vercel lets this function run; a long, detailed answer finishes well inside it. */
export const maxDuration = 60;

const providers = { claude, gemini };

function errorResponse(error: ChatErrorCode, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return errorResponse("invalid", 400);
  }

  const parsed = chatRequestSchema.safeParse(json);
  if (!parsed.success) return errorResponse("invalid", 400);

  const limit = checkRateLimit(visitorKey(request));
  if (!limit.ok) return errorResponse("rate_limited", 429, { "Retry-After": String(limit.retryAfter) });

  const providerName = configuredChatProvider();
  if (!providerName) {
    console.error("Chat: neither ANTHROPIC_API_KEY nor GEMINI_API_KEY is set, so the assistant is offline.");
    return errorResponse("unavailable", 503);
  }
  const provider = providers[providerName];

  let knowledge: PortfolioKnowledge;
  try {
    knowledge = await getPortfolioKnowledge();
  } catch (error) {
    console.error("Chat: could not load the portfolio content:", error);
    return errorResponse("unavailable", 503);
  }

  // Stops the model when the visitor leaves or presses Stop, so no tokens go to waste.
  const stop = new AbortController();
  const { messages, locale, page } = parsed.data;
  const answer = provider.answer({
    system: buildSystemPrompt(knowledge, provider.label),
    context: buildVisitorContext({ knowledge, locale, page }),
    messages,
    signal: AbortSignal.any([request.signal, stop.signal]),
  });

  // Wait for the first text, so a failure before any (bad key, overload) gets a real status code.
  let first: IteratorResult<string>;
  try {
    first = await answer.next();
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const { code, status } = provider.classify(error);
    return errorResponse(code, status);
  }

  const encoder = new TextEncoder();
  let cancelled = false;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        if (!cancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        let result = first;
        while (!result.done) {
          send({ type: "text", text: result.value });
          result = await answer.next();
        }
        // A refusal can arrive after some text has streamed; the client replaces it with a notice.
        send(result.value === "refused" ? { type: "refusal" } : { type: "done", truncated: result.value === "truncated" });
      } catch (error) {
        if (!request.signal.aborted && !cancelled) send({ type: "error", error: provider.classify(error).code });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
      stop.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
