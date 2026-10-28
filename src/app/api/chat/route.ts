import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { chatRequestSchema, type ChatErrorCode, type ChatStreamEvent } from "@/lib/chat-schema";
import { getPortfolioKnowledge, type PortfolioKnowledge } from "@/lib/chat/knowledge";
import { buildSystemPrompt, buildVisitorContext } from "@/lib/chat/prompt";
import { checkRateLimit, visitorKey } from "@/lib/chat/rate-limit";

/** Seconds Vercel lets this function run; a long, detailed answer finishes well inside it. */
export const maxDuration = 60;

const MODEL = process.env.CHAT_MODEL || "claude-opus-5-5";
/** Room for the model's brief thinking plus a detailed answer — Bangla takes more tokens per word. */
const MAX_TOKENS = 4096;

let anthropic: Anthropic | undefined;

function errorResponse(error: ChatErrorCode, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers });
}

/** What the visitor is told when a call to Claude fails; logs the failures the owner needs to see. */
function classify(error: unknown): { code: ChatErrorCode; status: number } {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error("Chat: Anthropic rejected the API key:", error.message);
    return { code: "unavailable", status: 503 };
  }
  if (
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.InternalServerError ||
    error instanceof Anthropic.APIConnectionError
  ) {
    console.warn("Chat: Anthropic is busy or unreachable:", error.message);
    return { code: "busy", status: 503 };
  }
  console.error("Chat: request to Anthropic failed:", error);
  return { code: "unknown", status: 500 };
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

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Chat: ANTHROPIC_API_KEY is not set, so the assistant is offline.");
    return errorResponse("unavailable", 503);
  }

  let knowledge: PortfolioKnowledge;
  try {
    knowledge = await getPortfolioKnowledge();
  } catch (error) {
    console.error("Chat: could not load the portfolio content:", error);
    return errorResponse("unavailable", 503);
  }

  const { messages, locale, page } = parsed.data;
  anthropic ??= new Anthropic();
  const stream = anthropic.beta.messages.stream(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Thinking is always on for this model; low effort keeps it short so answers start fast.
      output_config: { effort: "low" },
      // If a safety classifier declines a question, the API retries it on the fallback model
      // Anthropic recommends for that case, within the same stream.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: buildSystemPrompt(knowledge), cache_control: { type: "ephemeral" } }],
      messages: [...messages, { role: "system", content: buildVisitorContext({ knowledge, locale, page }) }],
    },
    { signal: request.signal }
  );

  // Wait for the first event, so a failure before any text (bad key, overload) gets a real status code.
  const events = stream[Symbol.asyncIterator]();
  let first: Awaited<ReturnType<typeof events.next>>;
  try {
    first = await events.next();
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const { code, status } = classify(error);
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
        for (let result = first; !result.done; result = await events.next()) {
          const event = result.value;
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ type: "text", text: event.delta.text });
          }
        }
        const message = await stream.finalMessage();
        const { usage } = message;
        console.info(
          `Chat: ${message.model} stop=${message.stop_reason} in=${usage.input_tokens} cache_read=${usage.cache_read_input_tokens ?? 0} cache_write=${usage.cache_creation_input_tokens ?? 0} out=${usage.output_tokens}`
        );
        // A refusal can arrive after some text has streamed; the client replaces it with a notice.
        send(
          message.stop_reason === "refusal"
            ? { type: "refusal" }
            : { type: "done", truncated: message.stop_reason === "max_tokens" }
        );
      } catch (error) {
        if (!request.signal.aborted && !cancelled) send({ type: "error", error: classify(error).code });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
      stream.abort();
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
