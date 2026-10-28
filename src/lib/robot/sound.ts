import { useSyncExternalStore } from "react";

/**
 * The robot's sound effects, synthesized with the Web Audio API — there are no audio files.
 * They stay off until the visitor turns them on, and that click is also the user gesture
 * browsers require before any audio can play. Every cue is short and quiet, and nothing in
 * the interface ever waits for one.
 */

export type Cue = "hover" | "activate" | "close" | "acknowledge" | "success" | "error" | "tick";

export type SoundPrefs = {
  /** Sound effects on or off. */
  effects: boolean;
  /** 0–1, for the effects and the voice alike. */
  volume: number;
  /** Read the assistant's answers aloud. */
  voice: boolean;
};

const PREFS_KEY = "portfolio-chat:sound";
const DEFAULT_PREFS: SoundPrefs = { effects: false, volume: 0.6, voice: false };

// Like the chat's language: localStorage read through useSyncExternalStore. The parsed value is
// cached so the snapshot stays the same object until it changes.
let prefs: SoundPrefs | null = null;
const prefListeners = new Set<() => void>();

function readPrefs(): SoundPrefs {
  if (prefs) return prefs;
  prefs = DEFAULT_PREFS;
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<SoundPrefs> | null;
    prefs = {
      effects: stored?.effects === true,
      voice: stored?.voice === true,
      volume: typeof stored?.volume === "number" ? Math.min(1, Math.max(0, stored.volume)) : DEFAULT_PREFS.volume,
    };
  } catch {
    // Storage blocked or unreadable: the defaults, with everything off.
  }
  return prefs;
}

function subscribePrefs(listener: () => void) {
  prefListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== PREFS_KEY) return;
    prefs = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    prefListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSoundPrefs() {
  return useSyncExternalStore(subscribePrefs, readPrefs, () => DEFAULT_PREFS);
}

export const getSoundPrefs = readPrefs;

export function updateSoundPrefs(change: Partial<SoundPrefs>) {
  prefs = { ...readPrefs(), ...change };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked: the choice lasts for this page view.
  }
  if (context && master && change.volume !== undefined) {
    master.gain.setTargetAtTime(gainFor(prefs.volume), context.currentTime, 0.02);
  }
  prefListeners.forEach((listener) => listener());
}

let context: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

/** Loudness is heard on a log scale, so the slider's square sounds even across its range. */
const gainFor = (volume: number) => volume * volume;

/**
 * Creates the audio context, or wakes it. Browsers only allow this during a click or key
 * press, so it's called from the sound toggle and from the next gesture after a reload.
 */
export function unlockAudio() {
  if (typeof AudioContext === "undefined") return;
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = gainFor(readPrefs().volume);
    // Keeps overlapping cues from clipping.
    master.connect(context.createDynamicsCompressor()).connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
}

/** With sound already on from an earlier visit, wakes the audio on the visitor's first gesture. */
export function unlockAudioOnGesture() {
  const events = ["pointerdown", "pointerup", "keydown"] as const;
  const unlock = () => {
    unlockAudio();
    if (context?.state === "running") release();
  };
  const release = () => events.forEach((type) => window.removeEventListener(type, unlock, true));
  events.forEach((type) => window.addEventListener(type, unlock, { capture: true, passive: true }));
  return release;
}

/** The least time between two plays of a cue, in ms: hover sounds must never chatter. */
const MIN_GAP: Partial<Record<Cue, number>> = { hover: 300 };
const playedAt: Partial<Record<Cue, number>> = {};

/** Plays a cue if sound is on. Never throws and never blocks. */
export function playCue(cue: Cue) {
  if (!context || !master || context.state !== "running" || !readPrefs().effects || document.hidden) return;
  const now = performance.now();
  if (now - (playedAt[cue] ?? Number.NEGATIVE_INFINITY) < (MIN_GAP[cue] ?? 80)) return;
  playedAt[cue] = now;
  try {
    CUES[cue](context, master, context.currentTime + 0.005);
  } catch {
    // A cue is never worth an error.
  }
}

/** Soft ticks while the assistant works on an answer. Stops on its own after a few. */
export function startThinkingTicks() {
  let count = 0;
  const timer = window.setInterval(() => {
    playCue("tick");
    if (++count >= 8) window.clearInterval(timer);
  }, 700);
  return () => window.clearInterval(timer);
}

type ToneOptions = {
  type?: OscillatorType;
  from: number;
  /** Glides to this pitch over the tone. */
  to?: number;
  /** Seconds after the cue starts. */
  at?: number;
  length: number;
  peak: number;
};

/** One oscillator under a fast attack and an exponential fade, so it never clicks. */
function tone(ctx: AudioContext, out: AudioNode, start: number, { type = "sine", from, to, at = 0, length, peak }: ToneOptions) {
  const t = start + at;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, t);
  if (to) oscillator.frequency.exponentialRampToValueAtTime(to, t + length);
  envelope.gain.setValueAtTime(0.0001, t);
  envelope.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.012, length / 4));
  envelope.gain.exponentialRampToValueAtTime(0.0001, t + length);
  oscillator.connect(envelope).connect(out);
  oscillator.start(t);
  oscillator.stop(t + length + 0.02);
  oscillator.onended = () => envelope.disconnect();
  return oscillator;
}

/** A pitch sweep with a frequency-modulated buzz: the robot powering up. */
function sweep(ctx: AudioContext, out: AudioNode, t: number, { from, to, length, peak }: Omit<ToneOptions, "type" | "at"> & { to: number }) {
  const modulator = ctx.createOscillator();
  const depth = ctx.createGain();
  modulator.frequency.setValueAtTime(from * 2, t);
  modulator.frequency.exponentialRampToValueAtTime(to * 2, t + length);
  depth.gain.setValueAtTime(from * 0.35, t);
  depth.gain.exponentialRampToValueAtTime(1, t + length);
  const carrier = tone(ctx, out, t, { from, to, length, peak });
  modulator.connect(depth).connect(carrier.frequency);
  modulator.start(t);
  modulator.stop(t + length + 0.02);
  modulator.onended = () => depth.disconnect();
}

/** A burst of band-passed noise: the click of a small servo. */
function click(ctx: AudioContext, out: AudioNode, t: number, peak: number, pitch = 2400) {
  if (!noise) {
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.03), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length) ** 3;
  }
  const source = ctx.createBufferSource();
  const band = ctx.createBiquadFilter();
  const level = ctx.createGain();
  source.buffer = noise;
  band.type = "bandpass";
  band.frequency.value = pitch;
  band.Q.value = 1.2;
  level.gain.value = peak;
  source.connect(band).connect(level).connect(out);
  source.start(t);
  source.onended = () => level.disconnect();
}

const CUES: Record<Cue, (ctx: AudioContext, out: AudioNode, t: number) => void> = {
  // The robot notices something: two quick, quiet rising notes.
  hover: (ctx, out, t) => {
    tone(ctx, out, t, { from: 1180, to: 1560, length: 0.07, peak: 0.05 });
    tone(ctx, out, t, { at: 0.05, from: 1560, to: 1900, length: 0.06, peak: 0.035 });
  },
  activate: (ctx, out, t) => {
    click(ctx, out, t, 0.05);
    sweep(ctx, out, t + 0.01, { from: 420, to: 920, length: 0.22, peak: 0.11 });
  },
  // Powering down: two falling notes, then the servo settles.
  close: (ctx, out, t) => {
    tone(ctx, out, t, { type: "triangle", from: 880, to: 560, length: 0.12, peak: 0.08 });
    tone(ctx, out, t, { type: "triangle", at: 0.07, from: 660, to: 392, length: 0.13, peak: 0.06 });
    click(ctx, out, t + 0.19, 0.035, 1800);
  },
  acknowledge: (ctx, out, t) => {
    tone(ctx, out, t, { type: "triangle", from: 1046.5, length: 0.05, peak: 0.07 });
    tone(ctx, out, t, { type: "triangle", at: 0.075, from: 1318.5, length: 0.06, peak: 0.07 });
  },
  // A rising C major arpeggio.
  success: (ctx, out, t) => {
    [1046.5, 1318.5, 1568].forEach((from, i) =>
      tone(ctx, out, t, { type: "triangle", at: i * 0.075, from, length: 0.12, peak: 0.075 })
    );
  },
  // Two low, muffled notes a semitone apart: noticeable, not alarming.
  error: (ctx, out, t) => {
    const muffle = ctx.createBiquadFilter();
    muffle.type = "lowpass";
    muffle.frequency.value = 900;
    muffle.connect(out);
    tone(ctx, muffle, t, { type: "square", from: 233.1, to: 220, length: 0.16, peak: 0.05 });
    const last = tone(ctx, muffle, t, { type: "square", at: 0.12, from: 220, to: 207.7, length: 0.2, peak: 0.045 });
    last.addEventListener("ended", () => muffle.disconnect());
  },
  tick: (ctx, out, t) => {
    tone(ctx, out, t, { from: 2100, length: 0.025, peak: 0.018 });
  },
};
