import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel, type GenerateContentResponseUsageMetadata } from "@google/genai";
import { MAX_ANSWER_TOKENS, type ChatProvider } from "@/lib/chat/provider";

/** Gemini 3 models only: older ones take a thinking budget instead of the level set below. */
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

/** Finish reasons where Gemini stopped on policy grounds rather than finishing the answer. */
const DECLINED = new Set<FinishReason>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

let client: GoogleGenAI | undefined;

export const gemini: ChatProvider = {
  label: "Gemini, by Google",

  async *answer({ system, context, messages, signal }) {
    client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const chunks = await client.models.generateContentStream({
      model: MODEL,
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      config: {
        // Gemini has no system messages mid-conversation; the context goes after the stable
        // instructions, so their prefix still matches between requests for implicit caching.
        systemInstruction: `${system}\n\n${context}`,
        maxOutputTokens: MAX_ANSWER_TOKENS,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: signal,
        // One retry for a passing overload; a used-up free-tier quota won't clear in seconds.
        httpOptions: { retryOptions: { attempts: 2 } },
      },
    });

    let finishReason: FinishReason | undefined;
    let blocked = false;
    let usage: GenerateContentResponseUsageMetadata | undefined;
    for await (const chunk of chunks) {
      if (chunk.promptFeedback?.blockReason) blocked = true;
      finishReason = chunk.candidates?.[0]?.finishReason ?? finishReason;
      usage = chunk.usageMetadata ?? usage;
      const text = chunk.text; // excludes thought parts
      if (text) yield text;
    }

    console.info(
      `Chat: ${MODEL} finish=${finishReason} in=${usage?.promptTokenCount ?? 0} cached=${usage?.cachedContentTokenCount ?? 0} thoughts=${usage?.thoughtsTokenCount ?? 0} out=${usage?.candidatesTokenCount ?? 0}`
    );
    if (blocked || (finishReason && DECLINED.has(finishReason))) return "refused";
    return finishReason === FinishReason.MAX_TOKENS ? "truncated" : "done";
  },

  classify(error) {
    if (error instanceof ApiError) {
      // Gemini answers a bad key with 400 "API key not valid", not 401.
      if (error.status === 401 || error.status === 403 || (error.status === 400 && /api key/i.test(error.message))) {
        console.error("Chat: Gemini rejected the API key:", error.message);
        return { code: "unavailable", status: 503 };
      }
      if (error.status === 429 || error.status >= 500) {
        console.warn("Chat: Gemini is busy or the free-tier quota is used up:", error.message);
        return { code: "busy", status: 503 };
      }
    }
    console.error("Chat: request to Gemini failed:", error);
    return { code: "unknown", status: 500 };
  },
};
