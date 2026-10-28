import {
  ApiError,
  FinishReason,
  GoogleGenAI,
  ThinkingLevel,
  type GenerateContentResponse,
  type GenerateContentResponseUsageMetadata,
} from "@google/genai";
import { MAX_ANSWER_TOKENS, type ChatProvider } from "@/lib/chat/provider";

/**
 * Free-tier quotas are set per model (some keys get none for the newest one), so when a model
 * is out of quota, overloaded, stalled or declines, the next one answers. GEMINI_MODEL, if
 * set, goes first. Gemini 3 models only: older ones take a thinking budget instead of a level.
 */
const MODELS = [
  ...new Set(
    [process.env.GEMINI_MODEL, "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"].filter(
      (model): model is string => Boolean(model)
    )
  ),
];
/** Unavailable now, but another model may not be: quota used up (429), missing (404) or overloaded (5xx). */
const TRY_NEXT = (status: number) => status === 404 || status === 429 || status >= 500;
/**
 * A model that sends nothing for this long is dropped for the next one. Answers normally start
 * within a few seconds, and the four tries together stay inside the function's 60-second limit.
 */
const FIRST_CHUNK_TIMEOUT_MS = 10_000;

/** Finish reasons where Gemini stopped on policy grounds rather than finishing the answer. */
const DECLINED = new Set<FinishReason>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

class GeminiStalled extends Error {
  constructor(model: string) {
    super(`${model} sent nothing for ${FIRST_CHUNK_TIMEOUT_MS / 1000}s`);
    this.name = "GeminiStalled";
  }
}

let client: GoogleGenAI | undefined;
/** The model that answered last, tried first next time so a dead one doesn't cost every request a round trip. */
let preferred = 0;

export const gemini: ChatProvider = {
  label: "Gemini, by Google",

  async *answer({ system, context, messages, signal }) {
    const ai = (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
    const contents = messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    const start = preferred;
    let declinesRetried = 0;
    for (let attempt = 0; attempt < MODELS.length; attempt++) {
      const index = (start + attempt) % MODELS.length;
      const model = MODELS[index];
      const last = attempt === MODELS.length - 1;

      // Each try can be dropped on its own if it stalls, without ending the visitor's request.
      const stall = new AbortController();
      const timer = setTimeout(() => stall.abort(), FIRST_CHUNK_TIMEOUT_MS);
      let chunks: AsyncIterator<GenerateContentResponse>;
      let first: IteratorResult<GenerateContentResponse>;
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            // Gemini has no system messages mid-conversation; the context goes after the stable
            // instructions, so their prefix still matches between requests for implicit caching.
            systemInstruction: `${system}\n\n${context}`,
            maxOutputTokens: MAX_ANSWER_TOKENS,
            // Flash-Lite models don't take a thinking level; the others think briefly.
            thinkingConfig: model.includes("lite") ? undefined : { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: AbortSignal.any([signal, stall.signal]),
          },
        });
        chunks = stream[Symbol.asyncIterator]();
        first = await chunks.next();
      } catch (error) {
        if (signal.aborted) throw error;
        const reason = stall.signal.aborted ? new GeminiStalled(model) : error;
        const retryable = reason instanceof GeminiStalled || (reason instanceof ApiError && TRY_NEXT(reason.status));
        if (last || !retryable) throw reason;
        console.warn(`Chat: ${model} unavailable, trying the next model:`, reason instanceof Error ? reason.message : reason);
        continue;
      } finally {
        clearTimeout(timer);
      }
      preferred = index;

      let finishReason: FinishReason | undefined;
      let blocked = false;
      let wroteText = false;
      let usage: GenerateContentResponseUsageMetadata | undefined;
      for (let step = first; !step.done; step = await chunks.next()) {
        const chunk = step.value;
        if (chunk.promptFeedback?.blockReason) blocked = true;
        finishReason = chunk.candidates?.[0]?.finishReason ?? finishReason;
        usage = chunk.usageMetadata ?? usage;
        const text = chunk.text; // excludes thought parts
        if (text) {
          wroteText = true;
          yield text;
        }
      }

      console.info(
        `Chat: ${model} finish=${finishReason} blocked=${blocked} in=${usage?.promptTokenCount ?? 0} cached=${usage?.cachedContentTokenCount ?? 0} thoughts=${usage?.thoughtsTokenCount ?? 0} out=${usage?.candidatesTokenCount ?? 0}`
      );
      const declined = blocked || (finishReason !== undefined && DECLINED.has(finishReason));
      // A filter can decline one model's answer and pass another's, so before anything has been
      // shown, one other model gets a turn. A blocked prompt would be blocked again, and more
      // retries would only burn the free tier's per-minute quota.
      if (declined && !wroteText && !blocked && !last && declinesRetried++ === 0) {
        console.warn(`Chat: ${model} declined (${blocked ? "prompt blocked" : finishReason}), trying the next model`);
        continue;
      }
      if (declined) return "refused";
      return finishReason === FinishReason.MAX_TOKENS ? "truncated" : "done";
    }
    return "refused"; // unreachable: the last try always returns or throws
  },

  classify(error) {
    if (error instanceof ApiError) {
      // Gemini answers a bad key with 400 "API key not valid", not 401.
      if (error.status === 401 || error.status === 403 || (error.status === 400 && /api key/i.test(error.message))) {
        console.error("Chat: Gemini rejected the API key:", error.message);
        return { code: "unavailable", status: 503 };
      }
      if (TRY_NEXT(error.status)) {
        console.warn("Chat: every Gemini model is busy or out of free-tier quota:", error.message);
        return { code: "busy", status: 503 };
      }
    }
    if (error instanceof GeminiStalled) {
      console.warn("Chat: every Gemini model stalled:", error.message);
      return { code: "busy", status: 503 };
    }
    console.error("Chat: request to Gemini failed:", error);
    return { code: "unknown", status: 500 };
  },
};
