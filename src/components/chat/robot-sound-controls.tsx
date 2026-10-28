"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { playCue, unlockAudio, updateSoundPrefs, useSoundPrefs } from "@/lib/robot/sound";
import { stopReading, unlockVoice, voiceSupported } from "@/lib/robot/voice";
import { cn } from "@/lib/utils";

const noSubscription = () => () => {};

/**
 * The speaker button in the chat header, with the robot's sound settings: effects on or off,
 * their volume, and reading answers aloud. Everything starts off, and the choice is remembered.
 */
export function RobotSoundControls({
  copy,
}: {
  copy: { sound: string; effects: string; volume: string; voice: string; voiceUnsupported: string };
}) {
  const prefs = useSoundPrefs();
  const canSpeak = useSyncExternalStore(noSubscription, voiceSupported, () => true);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const volumeId = useId();

  // A click anywhere else closes the settings.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Escape closes the settings first, not the whole chat.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={copy.sound}
        title={copy.sound}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="flex size-8 items-center justify-center rounded-full text-warm-white/80 transition-colors hover:bg-warm-white/10 hover:text-warm-white"
      >
        {prefs.effects || prefs.voice ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={copy.sound}
          className="absolute top-full right-0 z-10 mt-2 flex w-60 flex-col gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-lg"
        >
          <Switch
            label={copy.effects}
            checked={prefs.effects}
            onChange={(on) => {
              // The click is the user gesture browsers require before audio can start.
              if (on) unlockAudio();
              updateSoundPrefs({ effects: on });
              if (on) playCue("acknowledge");
            }}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={volumeId} className="text-xs font-medium text-muted-foreground">
              {copy.volume}
            </label>
            <input
              id={volumeId}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs.volume}
              disabled={!prefs.effects && !prefs.voice}
              onChange={(event) => {
                updateSoundPrefs({ volume: Number(event.target.value) });
                playCue("hover");
              }}
              className="w-full accent-caramel disabled:opacity-50"
            />
          </div>
          <Switch
            label={copy.voice}
            hint={canSpeak ? undefined : copy.voiceUnsupported}
            checked={prefs.voice && canSpeak}
            disabled={!canSpeak}
            onChange={(on) => {
              if (on) unlockVoice();
              else stopReading();
              updateSoundPrefs({ voice: on });
            }}
          />
        </div>
      )}
    </div>
  );
}

function Switch({
  label,
  hint,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 text-left text-sm disabled:opacity-50"
    >
      <span>
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-caramel" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-4"
          )}
        />
      </span>
    </button>
  );
}
