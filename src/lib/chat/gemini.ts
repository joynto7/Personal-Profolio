import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel, type GenerateContentResponseUsageMetadata } from "@google/genai";
import { MAX_ANSWER_TOKENS, type ChatProvider } from "@/lib/chat/provider";

/**
 * Free-tier quotas are set per model (some keys get none for the newest one), so when a model
 * is out of quota or overloaded, the next one answers. GEMINI_MODEL, if set, goes first.
 * Gemini 3 models only: older ones take a thinking budget instead of the level set below.
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

/** Finish reasons where Gemini stopped on policy grounds rather than finishing the answer. */
const DECLINED = new Set<FinishReason>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

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

    let chunks: Awaited<ReturnType<typeof ai.models.generateContentStream>> | undefined;
    let model = MODELS[preferred];
    for (let attempt = 0; !chunks; attempt++) {
      const index = (preferred + attempt) % MODELS.length;
      model = MODELS[index];
      try {
        chunks = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            // Gemini has no system messages mid-conversation; the context goes after the stable
            // instructions, so their prefix still matches between requests for implicit caching.
            systemInstruction: `${system}\n\n${context}`,
            maxOutputTokens: MAX_ANSWER_TOKENS,
            // Flash-Lite models don't take a thinking level; the others think briefly.
            thinkingConfig: model.includes("lite") ? undefined : { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: signal,
          },
        });
        preferred = index;
      } catch (error) {
        const last = attempt === MODELS.length - 1;
        if (last || !(error instanceof ApiError) || !TRY_NEXT(error.status)) throw error;
        console.warn(`Chat: ${model} unavailable (${error.status}), trying the next model:`, error.message);
      }
    }

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
      `Chat: ${model} finish=${finishReason} in=${usage?.promptTokenCount ?? 0} cached=${usage?.cachedContentTokenCount ?? 0} thoughts=${usage?.thoughtsTokenCount ?? 0} out=${usage?.candidatesTokenCount ?? 0}`
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
