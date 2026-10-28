import Anthropic from "@anthropic-ai/sdk";
import { MAX_ANSWER_TOKENS, type ChatProvider } from "@/lib/chat/provider";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

let client: Anthropic | undefined;

export const claude: ChatProvider = {
  label: "Claude, by Anthropic",

  async *answer({ system, context, messages, signal }) {
    client ??= new Anthropic();
    const stream = client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: MAX_ANSWER_TOKENS,
        // Thinking is always on for this model; low effort keeps it short so answers start fast.
        output_config: { effort: "low" },
        // If a safety classifier declines a question, the API retries it on the fallback model
        // Anthropic recommends for that case, within the same stream.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        // The context goes after the question as a system message, so the cached prefix
        // above stays byte-identical between requests.
        messages: [...messages, { role: "system", content: context }],
      },
      { signal }
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
    }

    const message = await stream.finalMessage();
    const { usage } = message;
    console.info(
      `Chat: ${message.model} stop=${message.stop_reason} in=${usage.input_tokens} cache_read=${usage.cache_read_input_tokens ?? 0} cache_write=${usage.cache_creation_input_tokens ?? 0} out=${usage.output_tokens}`
    );
    // A refusal can arrive after some text has streamed; the client replaces it with a notice.
    if (message.stop_reason === "refusal") return "refused";
    return message.stop_reason === "max_tokens" ? "truncated" : "done";
  },

  classify(error) {
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
  },
};
