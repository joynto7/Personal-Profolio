import { useSyncExternalStore } from "react";
import { pulseRobotMouth } from "@/lib/robot/bus";
import { getSoundPrefs } from "@/lib/robot/sound";

/**
 * Reads the assistant's answers aloud with the browser's own speech synthesis, once the
 * visitor turns it on. An answer is spoken a sentence at a time as it streams in — Chrome
 * cuts long utterances off — and each spoken word moves the robot's mouth. Bangla is only
 * read where the device has a Bangla voice.
 */

const BANGLA = /[ঀ-৿]/;
/** Where a sentence ends (but not "1." in a numbered list), or a line does. */
const BOUNDARY = /(?<![0-9০-৯])[.!?।]+["')\]*_]*(?=\s)|\n+/g;
/** Longer sentences are split at a comma or a space, well inside Chrome's cut-off. */
const MAX_UTTERANCE = 220;

export const voiceSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

let speaking = false;
const listeners = new Set<() => void>();

function setSpeaking(value: boolean) {
  if (value === speaking) return;
  speaking = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether an answer is being read aloud right now. */
export function useVoiceSpeaking() {
  return useSyncExternalStore(subscribe, () => speaking, () => false);
}

/** The answer being read: its message id and how much of its text is already queued. */
let reading: { id: string; queued: number } | null = null;
/** Utterances queued and not yet finished. */
let pending = 0;
/** Bumped by every stop, so events from cancelled utterances are ignored. */
let generation = 0;
let mouthTimer = 0;
let wordAt = 0;

/** Call during a click or key press: Safari only lets a page speak after it has spoken inside one. */
export function unlockVoice() {
  if (!voiceSupported()) return;
  speechSynthesis.getVoices(); // Chrome loads its voice list lazily
  const silence = new SpeechSynthesisUtterance(" ");
  silence.volume = 0;
  speechSynthesis.speak(silence);
}

function pickVoice(lang: "en" | "bn") {
  const voices = speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith(lang));
  return voices.find((voice) => voice.localService) ?? voices[0] ?? null;
}

/** The answer as it should sound: no Markdown marks, link targets or code. */
function toSpeech(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*(#{1,6}|[-*•]|[0-9০-৯]+[.)])\s+/gm, "")
    .replace(/\*+|`+|__/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pieces(text: string) {
  const out: string[] = [];
  let rest = text;
  while (rest.length > MAX_UTTERANCE) {
    let cut = rest.lastIndexOf(", ", MAX_UTTERANCE);
    if (cut < 80) cut = rest.lastIndexOf(" ", MAX_UTTERANCE);
    if (cut < 1) cut = MAX_UTTERANCE;
    out.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1);
  }
  if (rest.trim()) out.push(rest.trim());
  return out;
}

function startSpeaking() {
  setSpeaking(true);
  if (mouthTimer) return;
  // Not every voice reports its words, so keep the mouth moving at a talking pace without them.
  mouthTimer = window.setInterval(() => {
    if (performance.now() - wordAt > 400) pulseRobotMouth();
  }, 190);
}

function quiet() {
  window.clearInterval(mouthTimer);
  mouthTimer = 0;
  setSpeaking(false);
}

/** Queues one sentence. False when it's Bangla and the device has no Bangla voice. */
function say(text: string) {
  const lang = BANGLA.test(text) ? "bn" : "en";
  const voice = pickVoice(lang);
  if (lang === "bn" && !voice) return false;
  const current = generation;
  for (const piece of pieces(text)) {
    const utterance = new SpeechSynthesisUtterance(piece);
    utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-US";
    utterance.pitch = 1.1; // a touch higher, for a small robot
    utterance.volume = getSoundPrefs().volume;
    utterance.onstart = () => current === generation && startSpeaking();
    utterance.onboundary = () => {
      if (current !== generation) return;
      wordAt = performance.now();
      pulseRobotMouth();
    };
    utterance.onend = utterance.onerror = () => {
      if (current !== generation) return;
      pending = Math.max(0, pending - 1);
      if (!pending) quiet();
    };
    pending++;
    speechSynthesis.speak(utterance);
  }
  return true;
}

/**
 * Queues the sentences of a streaming answer that have finished since the last call; `final`
 * reads the rest too. Returns false if part of it couldn't be read: Bangla with no Bangla voice.
 */
export function readAloud(id: string, text: string, final: boolean) {
  if (!voiceSupported()) return true;
  if (reading?.id !== id) {
    stopReading();
    reading = { id, queued: 0 };
  }
  const fresh = text.slice(reading.queued);
  const ends = [...fresh.matchAll(BOUNDARY)].map((match) => match.index + match[0].length);
  if (final && ends.at(-1) !== fresh.length) ends.push(fresh.length);
  if (final) reading = null;
  else reading.queued += ends.at(-1) ?? 0;

  let spoken = true;
  let from = 0;
  for (const to of ends) {
    const sentence = toSpeech(fresh.slice(from, to));
    from = to;
    if (sentence && !say(sentence)) spoken = false;
  }
  return spoken;
}

/** Stops reading at once: on Stop, a new chat, closing the chat or leaving the page. */
export function stopReading() {
  reading = null;
  pending = 0;
  generation++;
  if (voiceSupported()) speechSynthesis.cancel();
  quiet();
}
