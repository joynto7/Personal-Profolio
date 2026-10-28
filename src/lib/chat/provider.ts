import type { ChatErrorCode, ChatMessage } from "@/lib/chat-schema";

/**
 * The AI service behind the assistant, picked from whichever API key is set. Claude wins
 * when both are; with neither, the assistant is switched off and its button hidden.
 * This module only reads environment variables, so the layout can use it without
 * pulling in either SDK.
 */
export type ChatProviderName = "claude" | "gemini";

export function configuredChatProvider(): ChatProviderName | null {
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export type ChatTurn = {
  /** The cached instructions and portfolio document. */
  system: string;
  /** Per-request facts from the site: date, interface language, current page. */
  context: string;
  messages: ChatMessage[];
  signal: AbortSignal;
};

/** How an answer ended: in full, cut off at the length cap, or declined on policy grounds. */
export type ChatOutcome = "done" | "truncated" | "refused";

export type ChatProvider = {
  /** What visitors are told powers the assistant, if they ask. */
  label: string;
  /** Yields the answer's text as it streams in, then returns how it ended. */
  answer: (turn: ChatTurn) => AsyncGenerator<string, ChatOutcome>;
  /** What the visitor is told when a call fails; logs the failures the owner needs to see. */
  classify: (error: unknown) => { code: ChatErrorCode; status: number };
};

/** Room for the model's brief thinking plus a detailed answer — Bangla takes more tokens per word. */
export const MAX_ANSWER_TOKENS = 4096;
