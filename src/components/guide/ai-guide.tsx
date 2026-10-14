"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { playBlip, speak, stopSpeaking } from "@/lib/sci-fi-audio";

/**
 * Nova, the site's AI guide. Any element with a `data-guide` attribute becomes clickable
 * narration: clicking it plays a sci-fi blip and Nova reads the attribute's text aloud
 * (`data-guide-sound="nav"` picks the section blip). Captions show even when muted.
 */

const INTRO = "Hi, I'm Nova, the AI guide for this portfolio. Click any project or section and I'll tell you about it.";
const MUTE_KEY = "nova-muted";
const INTRO_KEY = "nova-intro-seen";

const muteListeners = new Set<() => void>();

function subscribeMuted(listener: () => void) {
  muteListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    muteListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Storage blocked (private mode): the toggle still works for this page view.
  }
  muteListeners.forEach((listener) => listener());
}

export function AIGuide() {
  const muted = useSyncExternalStore(subscribeMuted, readMuted, () => false);
  const [caption, setCaption] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [open, setOpen] = useState(false);

  // Introduce Nova once per session, without sound: browsers block audio before a click.
  // The "seen" flag is only written once the intro shows, so a re-run effect doesn't skip it.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(INTRO_KEY) === "1") return;
    } catch {
      // Storage blocked: show the intro every visit.
    }
    const show = window.setTimeout(() => {
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {
        // Ignored, as above.
      }
      setCaption(INTRO);
      setOpen(true);
    }, 1500);
    // Only tuck the intro away; a project caption the visitor asked for stays up.
    const hide = window.setTimeout(() => setCaption((current) => (current === INTRO ? null : current)), 11000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-guide]") : null;
      const line = target?.dataset.guide;
      if (!line) return;
      setCaption(line);
      setOpen(true);
      if (muted) return;
      playBlip(target.dataset.guideSound === "nav" ? "nav" : "select");
      speak(line, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
    };
    // Capture phase, so cards and links that stop propagation still reach Nova.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [muted]);

  const toggleMuted = () => {
    if (!muted) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      playBlip("nav");
    }
    writeMuted(!muted);
  };

  const close = () => {
    stopSpeaking();
    setSpeaking(false);
    setOpen(false);
  };

  const status = speaking ? "Speaking…" : muted ? "Sound off" : "Click a project";

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-start gap-2">
      {open && caption && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto relative w-80 max-w-full overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#070b18]/92 p-4 text-sm text-slate-200 shadow-[0_0_32px_rgba(34,211,238,0.2)] backdrop-blur-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-300/70 to-transparent" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-cyan-300 uppercase">Nova · AI guide</span>
            <button
              type="button"
              onClick={close}
              aria-label="Close the guide"
              className="-mr-1 flex size-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <p className="mt-2 leading-relaxed">{caption}</p>
          {speaking && (
            <div aria-hidden className="mt-3 flex h-4 items-end gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                <span
                  key={bar}
                  className="w-1 origin-bottom rounded-full bg-linear-to-t from-cyan-400 to-violet-400 motion-safe:animate-[guide-wave_0.9s_ease-in-out_infinite]"
                  style={{ height: "100%", animationDelay: `${bar * 0.11}s` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-cyan-400/30 bg-[#070b18]/92 py-1.5 pr-1.5 pl-1.5 shadow-[0_0_24px_rgba(34,211,238,0.16)] backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            setCaption((current) => current ?? INTRO);
            setOpen((value) => !value);
          }}
          aria-label="Show Nova's message"
          className="rounded-full"
        >
          <NovaAvatar speaking={speaking} />
        </button>
        <div className="pr-1 leading-tight">
          <p className="text-xs font-semibold text-white">Nova</p>
          <p className="text-[11px] text-cyan-300/85">{status}</p>
        </div>
        <button
          type="button"
          onClick={toggleMuted}
          aria-label={muted ? "Turn Nova's sound on" : "Turn Nova's sound off"}
          aria-pressed={!muted}
          className="flex size-8 items-center justify-center rounded-full text-cyan-200 transition-colors hover:bg-white/10"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>
    </div>
  );
}

/** Holographic portrait: a short-haired silhouette in cyan, with scan lines sweeping down. */
function NovaAvatar({ speaking }: { speaking: boolean }) {
  return (
    <span
      className={`relative block size-10 overflow-hidden rounded-full border border-cyan-300/50 bg-[#0a1024] ${
        speaking ? "shadow-[0_0_18px_rgba(34,211,238,0.65)]" : "shadow-[0_0_10px_rgba(34,211,238,0.3)]"
      }`}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <radialGradient id="nova-bg" cx="0.5" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" />
            <stop offset="1" stopColor="#7c3aed" stopOpacity="0.15" />
          </radialGradient>
        </defs>
        <rect width="48" height="48" fill="url(#nova-bg)" />
        <path d="M8 48 C 10 37, 18 34, 24 34 C 30 34, 38 37, 40 48 Z" fill="#0b1226" stroke="#67e8f9" strokeOpacity="0.8" />
        <rect x="21" y="27" width="6" height="8" rx="2" fill="#0b1226" stroke="#67e8f9" strokeOpacity="0.6" />
        <ellipse cx="24" cy="21" rx="7.5" ry="9" fill="#0b1226" stroke="#67e8f9" strokeOpacity="0.9" />
        <path
          d="M15 22 C 13 12, 18 7, 25 7 C 32 7, 36 12, 34 22 C 34 27, 32 31, 30 33 C 31 26, 31 19, 27 15 C 24 19, 19 21, 16 21 C 16 25, 16 29, 18 33 C 16 30, 15 26, 15 22 Z"
          fill="#22d3ee"
          fillOpacity="0.35"
          stroke="#a5f3fc"
          strokeOpacity="0.9"
        />
        <path d="M20.5 22 H22.5 M25.5 22 H27.5" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M22 27 Q24 28.4 26 27" fill="none" stroke="#a5f3fc" strokeOpacity={speaking ? 1 : 0.6} strokeLinecap="round" />
      </svg>
      <span
        aria-hidden
        className="absolute inset-x-0 h-1/2 bg-linear-to-b from-transparent via-cyan-200/25 to-transparent motion-safe:animate-[guide-scan_2.6s_linear_infinite]"
      />
    </span>
  );
}
