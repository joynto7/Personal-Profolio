"use client";

import { useEffect, useState, type RefObject } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { Robot, type RobotMood } from "@/components/chat/robot";

/** Strolls only where there's room and a mouse — never on phones, where it would cover taps. */
const ROAM_QUERY = "(min-width: 768px) and (pointer: fine)";
/** Walking speed, in pixels per second. */
const SPEED = 90;
const FIRST_STROLL_MS = 9000;

/**
 * The robot in the bottom-right corner that opens the chat. On desktop it now and then walks
 * along the bottom of the screen and back; hovering stops it to smile and wave, with a speech
 * bubble. Opening the chat calls it home. Reduced motion keeps it docked.
 */
export function RobotLauncher({
  open,
  mood,
  label,
  panelId,
  hint,
  teaser,
  dismissLabel,
  lang,
  onToggle,
  onDismissTeaser,
  buttonRef,
}: {
  open: boolean;
  mood: RobotMood;
  /** The button's accessible name: open or close the chat. */
  label: string;
  panelId: string;
  /** Speech bubble shown while the robot is hovered or focused. */
  hint: string;
  /** One-time greeting bubble, or null. */
  teaser: string | null;
  dismissLabel: string;
  lang: string;
  onToggle: () => void;
  onDismissTeaser: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  const x = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const [walking, setWalking] = useState(false);
  const [heading, setHeading] = useState(0);
  const [hovered, setHovered] = useState(false);

  // Opening the chat calls the robot back to its corner.
  useEffect(() => {
    if (!open) return;
    const controls = animate(x, 0, { type: "spring", stiffness: 260, damping: 28 });
    return () => controls.stop();
  }, [open, x]);

  // Now and then, take a stroll along the bottom of the screen and come back.
  useEffect(() => {
    if (open || hovered || reduceMotion || !window.matchMedia(ROAM_QUERY).matches) return;
    let cancelled = false;
    let timer = 0;
    let controls: ReturnType<typeof animate> | undefined;
    /** Ends whatever the stroll is waiting on, so cleanup never leaves it hanging. */
    let release: (() => void) | undefined;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        release = resolve;
        timer = window.setTimeout(resolve, ms);
      });
    const walkTo = (target: number) =>
      new Promise<void>((resolve) => {
        const distance = Math.abs(target - x.get());
        if (distance < 2) return resolve();
        const arrive = () => {
          setWalking(false);
          setHeading(0);
          resolve();
        };
        release = arrive;
        setHeading(Math.sign(target - x.get()));
        setWalking(true);
        controls = animate(x, target, { duration: distance / SPEED, ease: "linear", onComplete: arrive });
      });

    void (async () => {
      // After a hover interrupted a stroll, head home soon; otherwise give visitors a moment first.
      await wait(x.get() === 0 ? FIRST_STROLL_MS : 1200);
      while (!cancelled) {
        if (x.get() === 0 && document.visibilityState === "visible") {
          const room = Math.min(window.innerWidth * 0.6, 600);
          await walkTo(-(120 + Math.random() * Math.max(0, room - 120)));
          if (cancelled) break;
          await wait(1500 + Math.random() * 2000); // stop and look around
          if (cancelled) break;
        }
        await walkTo(0);
        if (cancelled) break;
        await wait(20000 + Math.random() * 15000);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controls?.stop();
      release?.();
    };
  }, [open, hovered, reduceMotion, x]);

  const bubble = open ? null : (teaser ?? (hovered ? hint : null));

  return (
    <motion.div
      style={{ x }}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] sm:right-6 sm:bottom-6"
    >
      <AnimatePresence>
        {bubble && (
          <motion.div
            key={teaser ? "teaser" : "hint"}
            lang={lang}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 bottom-full mb-2 w-max max-w-64 origin-bottom-right rounded-2xl rounded-br-md border border-border bg-card px-3 py-2 text-sm leading-snug text-card-foreground shadow-lg"
          >
            {teaser ? (
              <div className="flex items-start gap-2">
                <button type="button" onClick={onToggle} className="text-left">
                  {teaser}
                </button>
                <button
                  type="button"
                  onClick={onDismissTeaser}
                  aria-label={dismissLabel}
                  className="-mr-1 flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <span aria-hidden>{bubble}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        // Keyboard focus counts as hovering; the focus a mouse click leaves behind doesn't.
        onFocus={(event) => event.currentTarget.matches(":focus-visible") && setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        animate={{ rotate: walking ? heading * 5 : 0 }}
        whileTap={{ scale: 0.92 }}
        className="relative block h-[72px] w-[60px] rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/60 sm:h-[88px] sm:w-[73px]"
      >
        <Robot mood={hovered && !open ? "happy" : mood} walking={walking} waving={hovered && !open} className="size-full" />
        {open && (
          <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <X className="size-3.5" />
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}
