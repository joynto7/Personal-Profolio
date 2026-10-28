"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, RotateCcw, Square, X } from "lucide-react";
import { assistantProfile } from "@/data/chatbot";
import {
  CHAT_ERROR_CODES,
  CHAT_LIMITS,
  type ChatErrorCode,
  type ChatLocale,
  type ChatMessage,
  type ChatStreamEvent,
} from "@/lib/chat-schema";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { Robot } from "@/components/chat/robot";
import { RobotLauncher } from "@/components/chat/robot-launcher";
import { RobotSoundControls } from "@/components/chat/robot-sound-controls";
import type { RobotBase } from "@/lib/robot/brain";
import { pulseRobotMouth, setRobotAnchor, setRobotBase, setRobotOpen, signalRobot } from "@/lib/robot/bus";
import { getSoundPrefs, startThinkingTicks, unlockAudioOnGesture, useSoundPrefs } from "@/lib/robot/sound";
import { readAloud, stopReading, unlockVoice, useVoiceSpeaking } from "@/lib/robot/voice";
import { cn } from "@/lib/utils";

/**
 * The AI assistant: a launcher in the bottom-right corner that opens a chat panel, where
 * visitors ask about Joynto in English or Bangla. Answers stream from /api/chat. The
 * conversation lasts for the browser tab's session; the interface language is remembered.
 */

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Set on assistant replies only. */
  status?: "streaming" | "done" | "stopped" | "error" | "refused";
  error?: ChatErrorCode;
  truncated?: boolean;
};

const LOCALE_KEY = "portfolio-chat:locale";
const MESSAGES_KEY = "portfolio-chat:messages";
const TEASER_KEY = "portfolio-chat:teaser-seen";
/** Matches Tailwind's `sm` breakpoint: below it the panel fills the screen. */
const MOBILE_QUERY = "(max-width: 639px)";
/** The robot's head, relative to the desktop panel (right-6 bottom-32, over the launcher), so the panel grows out of it. */
const ROBOT_HEAD_ORIGIN = "calc(100% - 36px) calc(100% + 43px)";
/** How long the visitor counts as typing after a keystroke, for the robot's listening face. */
const TYPING_MS = 1500;

function subscribeMobile(listener: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

function copyFor(locale: ChatLocale, firstName: string, email: string) {
  if (locale === "bn") {
    const name = assistantProfile.firstNameBn;
    const possessive = assistantProfile.firstNamePossessiveBn;
    return {
      launcher: "আমার AI সহকারীকে জিজ্ঞেস করুন",
      open: `${possessive} AI সহকারীর সাথে চ্যাট খুলুন`,
      title: `${possessive} AI সহকারী`,
      greeting: `হ্যালো! আমি ${possessive} AI সহকারী। ওনার দক্ষতা, প্রজেক্ট, অভিজ্ঞতা বা যোগাযোগের উপায় — যা জানতে চান, বাংলা বা English-এ জিজ্ঞেস করুন।`,
      teaser: `হ্যালো! ${name} সম্পর্কে যা জানতে চান, আমাকে জিজ্ঞেস করুন — বাংলা বা English-এ।`,
      suggestions: [
        `${name} সম্পর্কে সংক্ষেপে বলুন`,
        "ওনার উল্লেখযোগ্য প্রজেক্টগুলো কী কী?",
        "উনি কোন কোন টেকনোলজি নিয়ে কাজ করেন?",
        "ওনার সাথে কীভাবে যোগাযোগ করা যায়?",
      ],
      thisProject: "এই প্রজেক্টটা কীভাবে বানানো হয়েছে?",
      placeholder: `${name} সম্পর্কে জিজ্ঞেস করুন…`,
      inputLabel: "আপনার প্রশ্ন",
      send: "মেসেজ পাঠান",
      stop: "উত্তর থামান",
      newChat: "নতুন চ্যাট শুরু করুন",
      close: "চ্যাট বন্ধ করুন",
      dismiss: "বন্ধ করুন",
      language: "ভাষা",
      disclaimer: "AI-এর উত্তরে ভুল থাকতে পারে — জরুরি বিষয়ে সরাসরি ইমেইল করুন।",
      refusal: `এ প্রশ্নের উত্তর দিতে পারছি না — তবে ${email} ঠিকানায় ইমেইল করে বা [যোগাযোগ ফর্ম](/#contact) থেকে সরাসরি যোগাযোগ করতে পারেন।`,
      truncated: "উত্তরটি মাঝপথে থেমে গেছে — বাকিটা জানতে \"আরও বলুন\" লিখুন।",
      stopped: "থামানো হয়েছে।",
      retry: "আবার চেষ্টা করুন",
      sound: "শব্দের সেটিংস",
      effects: "সাউন্ড ইফেক্ট",
      volume: "ভলিউম",
      voice: "উত্তর পড়ে শোনান",
      voiceUnsupported: "এই ব্রাউজারে সমর্থিত নয়",
      noVoice: "এই ডিভাইসে বাংলা ভয়েস নেই, তাই উত্তরটি পড়ে শোনানো যায়নি।",
      errors: {
        rate_limited: "খুব দ্রুত মেসেজ পাঠানো হচ্ছে — একটু অপেক্ষা করে আবার চেষ্টা করুন।",
        busy: "সহকারী এই মুহূর্তে ব্যস্ত — কিছুক্ষণ পর আবার চেষ্টা করুন।",
        unavailable: `সহকারী এখন অফলাইনে আছে। ${email} ঠিকানায় সরাসরি যোগাযোগ করতে পারেন।`,
        invalid: "মেসেজটি পাঠানো যায়নি — একটু ছোট করে আবার চেষ্টা করুন।",
        unknown: "কিছু একটা সমস্যা হয়েছে — আবার চেষ্টা করুন।",
      } satisfies Record<ChatErrorCode, string>,
    };
  }
  return {
    launcher: "Ask my AI assistant",
    open: `Open a chat with ${firstName}'s AI assistant`,
    title: `${firstName}'s AI assistant`,
    greeting: `Hi! I'm ${firstName}'s AI assistant. Ask me anything about ${firstName}'s skills, projects and experience, or how to get in touch — in English or বাংলা.`,
    teaser: `Hi there! Ask me anything about ${firstName} — in English or বাংলা.`,
    suggestions: [
      `Give me a quick intro to ${firstName}`,
      `What are ${firstName}'s best projects?`,
      `What's ${firstName}'s tech stack?`,
      `How can I get in touch with ${firstName}?`,
    ],
    thisProject: "How was this project built?",
    placeholder: `Ask about ${firstName}…`,
    inputLabel: "Your question",
    send: "Send message",
    stop: "Stop the answer",
    newChat: "Start a new chat",
    close: "Close the chat",
    dismiss: "Dismiss",
    language: "Language",
    disclaimer: `AI answers can be wrong — for anything important, email ${firstName}.`,
    refusal: `I can't answer that one — but you can reach ${firstName} directly at ${email} or through the [contact form](/#contact).`,
    truncated: "The answer was cut short — ask me to continue.",
    stopped: "Stopped.",
    retry: "Try again",
    sound: "Sound settings",
    effects: "Sound effects",
    volume: "Volume",
    voice: "Read answers aloud",
    voiceUnsupported: "Not supported in this browser",
    noVoice: "This device has no Bangla voice, so the answer wasn't read aloud.",
    errors: {
      rate_limited: "You're sending messages quickly — please wait a moment and try again.",
      busy: "The assistant is busy right now — please try again in a moment.",
      unavailable: `The assistant is offline right now. You can reach ${firstName} directly at ${email}.`,
      invalid: "That message couldn't be sent — try making it a little shorter.",
      unknown: "Something went wrong — please try again.",
    } satisfies Record<ChatErrorCode, string>,
  };
}

// The interface language lives in localStorage, read through useSyncExternalStore so the
// server-rendered English launcher hydrates cleanly before switching to a saved Bangla.
const localeListeners = new Set<() => void>();
/** Fallback for when storage is blocked, so the toggle still works for this page view. */
let sessionLocale: ChatLocale | null = null;

function subscribeLocale(listener: () => void) {
  localeListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    localeListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readLocale(): ChatLocale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === "en" || stored === "bn") return stored;
  } catch {
    // Storage blocked (private mode): fall through to this view's choice or the browser language.
  }
  return sessionLocale ?? (navigator.language.toLowerCase().startsWith("bn") ? "bn" : "en");
}

function writeLocale(locale: ChatLocale) {
  sessionLocale = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Ignored, as above.
  }
  localeListeners.forEach((listener) => listener());
}

function isStoredMessage(value: unknown): value is UiMessage {
  const message = value as Partial<UiMessage> | null;
  return (
    typeof message?.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

function loadMessages(): UiMessage[] {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(MESSAGES_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter(isStoredMessage) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: UiMessage[]) {
  try {
    sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-40)));
  } catch {
    // Storage blocked: the conversation just won't survive a reload.
  }
}

let idCounter = 0;
const newId = () => `m${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/** Answered exchanges only, so the history always alternates visitor → assistant. */
function toHistory(messages: UiMessage[]): ChatMessage[] {
  const history: ChatMessage[] = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const [question, answer] = [messages[i], messages[i + 1]];
    if (
      question.role === "user" &&
      answer.role === "assistant" &&
      answer.content.trim() &&
      (answer.status === "done" || answer.status === "stopped")
    ) {
      history.push(
        { role: "user", content: question.content },
        { role: "assistant", content: answer.content.slice(0, CHAT_LIMITS.assistantMessageChars) }
      );
      i++;
    }
  }
  return history;
}

const hasBangla = (text: string) => /[\u0980-\u09FF]/.test(text);

const isErrorCode = (value: unknown): value is ChatErrorCode =>
  CHAT_ERROR_CODES.includes(value as ChatErrorCode);

export function ChatWidget({ name, email }: { name: string; email: string }) {
  const firstName = name.split(/\s+/)[0];
  const locale = useSyncExternalStore(subscribeLocale, readLocale, () => "en" as const);
  const copy = copyFor(locale, firstName, email);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const fullScreen = useSyncExternalStore(subscribeMobile, isMobile, () => false);
  const soundEffects = useSoundPrefs().effects;
  const voiceSpeaking = useVoiceSpeaking();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [voiceNote, setVoiceNote] = useState(false);

  const restoredRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const typingTimerRef = useRef(0);
  const panelId = useId();
  const titleId = useId();

  // The robot thinks while waiting for an answer, speaks while it streams or is read aloud,
  // and listens while the visitor types. Errors and other reactions are gestures, played on top.
  const last = messages.at(-1);
  const listening = open && inputFocused && !pending && (typing || input.trim().length > 0);
  const robotBase: RobotBase = pending
    ? last?.content
      ? "speaking"
      : "thinking"
    : voiceSpeaking
      ? "speaking"
      : listening
        ? "listening"
        : "idle";

  useEffect(() => setRobotBase(robotBase), [robotBase]);
  useEffect(() => setRobotOpen(open), [open]);
  // While the visitor types, the robots look at what they're writing.
  useEffect(() => setRobotAnchor(listening ? inputRef.current : null), [listening]);
  useEffect(() => (robotBase === "thinking" ? startThinkingTicks() : undefined), [robotBase]);
  // With sound on from an earlier visit, the first click or key press wakes the audio.
  useEffect(() => (soundEffects ? unlockAudioOnGesture() : undefined), [soundEffects]);
  // Reading aloud stops when the chat closes, on another page, and when the page goes away.
  useEffect(() => {
    if (!open) stopReading();
  }, [open]);
  useEffect(() => stopReading, [pathname]);
  useEffect(() => {
    window.addEventListener("pagehide", stopReading);
    return () => window.removeEventListener("pagehide", stopReading);
  }, []);
  useEffect(() => {
    if (!voiceNote) return;
    const timer = window.setTimeout(() => setVoiceNote(false), 8000);
    return () => window.clearTimeout(timer);
  }, [voiceNote]);

  // A one-time nudge per session, so visitors notice the assistant exists.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(TEASER_KEY) === "1") return;
    } catch {
      // Storage blocked: show the nudge every visit.
    }
    const show = window.setTimeout(() => {
      try {
        sessionStorage.setItem(TEASER_KEY, "1");
      } catch {
        // Ignored, as above.
      }
      setTeaser(true);
    }, 4000);
    const hide = window.setTimeout(() => setTeaser(false), 16000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  // Keep the conversation for this tab's session once it has been restored.
  useEffect(() => {
    if (restoredRef.current && !pending) saveMessages(messages);
  }, [messages, pending]);

  // Follow new text down the log unless the visitor has scrolled up to read.
  useEffect(() => {
    const log = logRef.current;
    if (log && followRef.current) log.scrollTop = log.scrollHeight;
  }, [messages, open]);

  // On phones the panel covers the page, so the page behind it shouldn't scroll.
  useEffect(() => {
    if (!open || !window.matchMedia(MOBILE_QUERY).matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes the panel wherever focus is — it can land on the page when a button
  // inside the panel (Send, Stop) swaps out from under it.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      setOpen(false);
      launcherRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Focus the input on desktop; on phones that would cover the panel with the keyboard.
  useEffect(() => {
    if (open && !window.matchMedia(MOBILE_QUERY).matches) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  const openChat = () => {
    if (!restoredRef.current) {
      restoredRef.current = true;
      setMessages(loadMessages());
    }
    followRef.current = true;
    setTeaser(false);
    setOpen(true);
  };

  const closeChat = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  /** Internal links in answers navigate the page; on phones, get the panel out of the way. */
  const closeIfFullScreen = () => {
    if (window.matchMedia(MOBILE_QUERY).matches) setOpen(false);
  };

  const resizeInput = () => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 128)}px`;
  };

  async function ask(text: string, base: UiMessage[] = messages) {
    const question = text.trim();
    if (!question || pending) return;

    const replyId = newId();
    // An odd count that starts and ends with the visitor, within the API's history limit.
    const history = [...toHistory(base), { role: "user" as const, content: question }].slice(
      -(CHAT_LIMITS.historyMessages - 1)
    );
    setMessages([
      ...base,
      { id: newId(), role: "user", content: question },
      { id: replyId, role: "assistant", content: "", status: "streaming" },
    ]);
    setInput("");
    requestAnimationFrame(resizeInput);
    setPending(true);
    followRef.current = true;
    signalRobot("acknowledge");
    // A new question cuts off the last answer being read; this click or key press also lets Safari speak.
    stopReading();
    if (getSoundPrefs().voice) unlockVoice();

    const controller = new AbortController();
    abortRef.current = controller;
    const patch = (change: Partial<UiMessage> | ((message: UiMessage) => Partial<UiMessage>)) =>
      setMessages((current) =>
        current.map((message) =>
          message.id === replyId ? { ...message, ...(typeof change === "function" ? change(message) : change) } : message
        )
      );
    const fail = (error: ChatErrorCode) => {
      patch({ status: "error", error });
      signalRobot("error");
      stopReading();
    };
    let answer = "";
    /** Reads the answer aloud as it arrives, if the visitor turned that on. */
    const speak = (final: boolean) => {
      if (getSoundPrefs().voice && !readAloud(replyId, answer, final)) setVoiceNote(true);
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, locale, page: pathname }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const data: { error?: unknown } | null = await response.json().catch(() => null);
        fail(isErrorCode(data?.error) ? data.error : "unknown");
        return;
      }

      // The body is newline-delimited JSON events; a chunk can end mid-line.
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffered = "";
      let settled = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = (buffered + value).split("\n");
        buffered = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ChatStreamEvent;
          if (event.type === "text") {
            answer += event.text;
            patch((message) => ({ content: message.content + event.text }));
            pulseRobotMouth();
            speak(false);
          } else {
            settled = true;
            if (event.type === "done") {
              patch({ status: "done", truncated: event.truncated });
              speak(true);
            } else if (event.type === "refusal") {
              patch({ status: "refused", content: "" });
              stopReading();
            } else {
              fail(event.error);
            }
          }
        }
      }
      if (!settled) fail("unknown");
    } catch {
      if (controller.signal.aborted) {
        patch({ status: "stopped" });
        stopReading();
      } else {
        fail("unknown");
      }
    } finally {
      abortRef.current = null;
      setPending(false);
    }
  }

  const retry = (replyId: string) => {
    const index = messages.findIndex((message) => message.id === replyId);
    const question = messages[index - 1];
    if (index < 1 || question.role !== "user") return;
    void ask(question.content, messages.slice(0, index - 1));
  };

  const startOver = () => {
    abortRef.current?.abort();
    stopReading();
    restoredRef.current = true;
    setMessages([]);
    setInput("");
    requestAnimationFrame(resizeInput);
    inputRef.current?.focus();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    inputRef.current?.focus(); // the Send button is about to become Stop
    void ask(input);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends and Shift+Enter adds a line — except mid-composition, which Bangla input
    // methods use (Safari reports the composition's closing Enter as key code 229).
    const composing = event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;
    if (event.key === "Enter" && !event.shiftKey && !composing) {
      event.preventDefault();
      void ask(input);
    }
  };

  const onProjectPage = /^\/(case-studies|projects)\/[^/]+/.test(pathname);
  const suggestions = onProjectPage ? [copy.thisProject, ...copy.suggestions.slice(0, 3)] : copy.suggestions;
  const nearLimit = input.length > CHAT_LIMITS.userMessageChars * 0.8;
  // On desktop the panel grows out of the robot's head and folds back into it; on phones it
  // slides up over the page. Reduced motion only fades it.
  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }
    : fullScreen
      ? {
          initial: { opacity: 0, y: 32 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 32, transition: { duration: 0.2, ease: "easeIn" as const } },
          transition: { type: "spring" as const, visualDuration: 0.3, bounce: 0.1 },
        }
      : {
          initial: { opacity: 0, scale: 0.6, y: 24 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.6, y: 24, transition: { duration: 0.2, ease: "easeIn" as const } },
          transition: { type: "spring" as const, visualDuration: 0.35, bounce: 0.18 },
          style: { transformOrigin: ROBOT_HEAD_ORIGIN },
        };

  return (
    <div className="font-bilingual">
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-labelledby={titleId}
            lang={locale}
            {...panelMotion}
            className="fixed inset-0 z-[70] flex origin-bottom-right flex-col overflow-hidden bg-background text-foreground sm:inset-auto sm:right-6 sm:bottom-32 sm:h-[min(40rem,calc(100dvh-10rem))] sm:w-[25rem] sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl"
          >
            <header className="flex items-center gap-3 bg-espresso px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-warm-white sm:pt-3">
              <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-warm-white/10 ring-1 ring-caramel/50">
                <Robot variant="head" className="w-9" />
                <span aria-hidden className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-espresso" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="truncate font-heading text-base leading-tight font-medium">
                  {copy.title}
                </h2>
                <div
                  role="group"
                  aria-label={copy.language}
                  className="mt-1.5 inline-flex rounded-full bg-warm-white/10 p-0.5 text-[11px] leading-none font-medium"
                >
                  {(["en", "bn"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      lang={value}
                      aria-pressed={locale === value}
                      onClick={() => writeLocale(value)}
                      className={cn(
                        "rounded-full px-2.5 py-1 transition-colors",
                        locale === value ? "bg-caramel text-espresso" : "text-warm-white/75 hover:text-warm-white"
                      )}
                    >
                      {value === "en" ? "English" : "বাংলা"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <RobotSoundControls copy={copy} />
                <button
                  type="button"
                  onClick={startOver}
                  aria-label={copy.newChat}
                  title={copy.newChat}
                  className="flex size-8 items-center justify-center rounded-full text-warm-white/80 transition-colors hover:bg-warm-white/10 hover:text-warm-white"
                >
                  <RotateCcw className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={closeChat}
                  aria-label={copy.close}
                  title={copy.close}
                  className="flex size-8 items-center justify-center rounded-full text-warm-white/80 transition-colors hover:bg-warm-white/10 hover:text-warm-white"
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>

            <div
              ref={logRef}
              role="log"
              aria-live="polite"
              aria-busy={pending}
              onScroll={(event) => {
                const log = event.currentTarget;
                followRef.current = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
              }}
              className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-5"
            >
              <AssistantBubble lang={locale}>
                <p>{copy.greeting}</p>
              </AssistantBubble>

              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void ask(suggestion)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs font-medium text-foreground/85 shadow-xs transition-colors hover:border-caramel hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((message) =>
                message.role === "user" ? (
                  <p
                    key={message.id}
                    lang={hasBangla(message.content) ? "bn" : "en"}
                    className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-primary-foreground"
                  >
                    {message.content}
                  </p>
                ) : (
                  <AssistantBubble key={message.id} lang={hasBangla(message.content) ? "bn" : "en"}>
                    {message.status === "streaming" && !message.content ? (
                      <TypingDots />
                    ) : message.status === "refused" ? (
                      <div className="text-muted-foreground">
                        <ChatMarkdown text={copy.refusal} onNavigate={closeIfFullScreen} />
                      </div>
                    ) : (
                      message.content && (
                        <ChatMarkdown
                          text={message.content}
                          streaming={message.status === "streaming"}
                          onNavigate={closeIfFullScreen}
                        />
                      )
                    )}
                    {message.status === "error" && (
                      <div className={cn("flex flex-col items-start gap-2", message.content && "mt-3 border-t border-border pt-3")}>
                        <ChatMarkdown text={copy.errors[message.error ?? "unknown"]} />
                        {message.error !== "unavailable" && message.error !== "invalid" && (
                          <button
                            type="button"
                            onClick={() => retry(message.id)}
                            disabled={pending}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-caramel disabled:opacity-50"
                          >
                            <RotateCcw className="size-3" />
                            {copy.retry}
                          </button>
                        )}
                      </div>
                    )}
                    {message.status === "stopped" && !message.content && (
                      <p className="text-muted-foreground">{copy.stopped}</p>
                    )}
                    {message.truncated && <p className="mt-2 text-xs text-muted-foreground">{copy.truncated}</p>}
                  </AssistantBubble>
                )
              )}
            </div>

            <form
              onSubmit={onSubmit}
              className="border-t border-border bg-card px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3"
            >
              <div className="flex items-end gap-2 rounded-xl border border-border bg-background py-1.5 pr-1.5 pl-3 transition-colors focus-within:border-caramel focus-within:ring-3 focus-within:ring-ring/30">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  maxLength={CHAT_LIMITS.userMessageChars}
                  onChange={(event) => {
                    setInput(event.target.value);
                    resizeInput();
                    setTyping(true);
                    window.clearTimeout(typingTimerRef.current);
                    typingTimerRef.current = window.setTimeout(() => setTyping(false), TYPING_MS);
                  }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={onInputKeyDown}
                  placeholder={copy.placeholder}
                  aria-label={copy.inputLabel}
                  // 16px on phones: iOS zooms into anything smaller when it gets focus.
                  className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1 text-base leading-6 outline-none placeholder:text-muted-foreground sm:text-sm"
                />
                {pending ? (
                  <button
                    type="button"
                    onClick={() => {
                      abortRef.current?.abort();
                      stopReading();
                      inputRef.current?.focus();
                    }}
                    aria-label={copy.stop}
                    title={copy.stop}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-85"
                  >
                    <Square className="size-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label={copy.send}
                    title={copy.send}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-40"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 px-1 text-center text-[11px] leading-snug text-muted-foreground">
                {voiceNote
                  ? copy.noVoice
                  : nearLimit
                    ? `${input.length} / ${CHAT_LIMITS.userMessageChars}`
                    : copy.disclaimer}
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <RobotLauncher
        open={open}
        label={open ? copy.close : copy.open}
        panelId={panelId}
        hint={copy.launcher}
        teaser={teaser ? copy.teaser : null}
        dismissLabel={copy.dismiss}
        lang={locale}
        onToggle={open ? closeChat : openChat}
        onDismissTeaser={() => setTeaser(false)}
        buttonRef={launcherRef}
      />
    </div>
  );
}

function AssistantBubble({ children, lang }: { children: ReactNode; lang?: string }) {
  return (
    <div
      lang={lang}
      className="mr-auto max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed break-words text-card-foreground shadow-xs"
    >
      {children}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex h-5 items-center gap-1" aria-hidden>
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="size-1.5 rounded-full bg-caramel motion-safe:animate-bounce"
          style={{ animationDelay: `${dot * 0.15}s` }}
        />
      ))}
    </span>
  );
}
