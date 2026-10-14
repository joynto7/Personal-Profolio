/**
 * Sci-fi UI sounds and the AI guide's voice, made in the browser: Web Audio synthesizes the
 * blips (nothing to download) and the Web Speech API reads the guide's lines aloud.
 * Browsers only allow audio after a user gesture, so call these from click handlers.
 */

export type BlipKind = "select" | "nav";

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (!context) {
    const AudioCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    context = new AudioCtor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

export function playBlip(kind: BlipKind) {
  const ac = audioContext();
  if (!ac) return;
  const now = ac.currentTime;
  const master = ac.createGain();
  master.gain.value = 0.16;
  master.connect(ac.destination);

  const tone = (type: OscillatorType, from: number, to: number, start: number, duration: number, level: number) => {
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now + start);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + start + duration);
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(level, now + start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(now + start);
    oscillator.stop(now + start + duration + 0.02);
  };

  if (kind === "select") {
    // Rising two-step chirp with a burst of filtered static, like a hologram switching on.
    tone("square", 660, 1320, 0, 0.09, 0.45);
    tone("sine", 1320, 1980, 0.07, 0.16, 0.6);
    tone("triangle", 2640, 1760, 0.12, 0.22, 0.25);
    const length = Math.floor(ac.sampleRate * 0.14);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const noise = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 3200;
    filter.Q.value = 1.4;
    gain.gain.value = 0.18;
    noise.connect(filter).connect(gain).connect(master);
    noise.start(now);
  } else {
    // Short falling blip for moving between sections.
    tone("sine", 1480, 740, 0, 0.12, 0.6);
    tone("square", 370, 370, 0, 0.05, 0.15);
  }
}

/** Female English voices across macOS, Windows, Chrome and Android, best first. */
const PREFERRED_VOICES = [
  "Samantha", "Ava", "Allison", "Zoe", "Serena", "Microsoft Aria", "Microsoft Jenny", "Google UK English Female",
  "Google US English", "Karen", "Moira", "Tessa", "Victoria", "Susan", "Microsoft Zira", "Female",
];

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  for (const name of PREFERRED_VOICES) {
    const match = voices.find((voice) => voice.name.includes(name));
    if (match) return match;
  }
  return voices[0];
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Reads `line` aloud, cutting off anything already playing. Returns false when speech is unavailable. */
export function speak(line: string, { onStart, onEnd }: { onStart?: () => void; onEnd?: () => void } = {}) {
  if (!canSpeak()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(line);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.pitch = 1.15;
  utterance.rate = 1.03;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  synth.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
