import { z } from "zod";

export const CHAT_LOCALES = ["en", "bn"] as const;
export type ChatLocale = (typeof CHAT_LOCALES)[number];

export const CHAT_LIMITS = {
  /** Longest question a visitor can type. */
  userMessageChars: 1500,
  /** Earlier answers are sent back as context; Bangla answers run long, so this is generous. */
  assistantMessageChars: 12000,
  /** Most messages the client sends per request — older turns are dropped first. */
  historyMessages: 12,
} as const;

const userMessageSchema = z.object({
  role: z.literal("user"),
  content: z.string().trim().min(1).max(CHAT_LIMITS.userMessageChars),
});

const assistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().trim().min(1).max(CHAT_LIMITS.assistantMessageChars),
});

export const chatRequestSchema = z.object({
  messages: z
    .array(z.discriminatedUnion("role", [userMessageSchema, assistantMessageSchema]))
    .min(1)
    .max(CHAT_LIMITS.historyMessages)
    .refine(
      (messages) => messages.every((message, i) => message.role === (i % 2 === 0 ? "user" : "assistant")),
      "Messages must alternate, starting with the visitor"
    )
    .refine((messages) => messages.at(-1)?.role === "user", "The last message must be from the visitor"),
  locale: z.enum(CHAT_LOCALES).default("en"),
  /** The page the visitor is chatting from, so "this project" can be resolved. */
  page: z.string().max(200).startsWith("/").optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatMessage = ChatRequest["messages"][number];

/** Errors the chat API returns, as `{ error }` before streaming or as a stream event after. */
export const CHAT_ERROR_CODES = ["invalid", "rate_limited", "busy", "unavailable", "unknown"] as const;
export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number];

/** One line of the newline-delimited JSON stream returned by POST /api/chat. */
export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "done"; truncated: boolean }
  | { type: "refusal" }
  | { type: "error"; error: ChatErrorCode };
