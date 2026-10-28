"use client";

import { useEffect, useState, type RefObject } from "react";
import { AnimatePresence, animate, cancelFrame, frame, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { Robot } from "@/components/chat/robot";
import {
  getRobotActivity,
  getRobotPointer,
  onRobotActivity,
  setRobotProximity,
  subscribeRobotLook,
  watchRobotTargets,
} from "@/lib/robot/bus";
import { cn } from "@/lib/utils";

/** Strolls only where there's room and a mouse — never on phones, where it would cover taps. */
const ROAM_QUERY = "(min-width: 768px) and (pointer: fine)";
/** Only a real hover can come near; touch screens skip the proximity invitation. */
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";
/** Walking speed, in pixels per second. */
const SPEED = 90;
/** It sets off only once the visitor has been idle this long, and heads home as soon as they're back. */
const IDLE_BEFORE_STROLL_MS = 20000;
/** The pointer counts as near inside the first distance from the robot and leaves past the second, so the edge can't flicker. */
const NEAR = { enter: 180, exit: 230 };
/** The invitation peeks out once the pointer has stayed near this long, and lingers this long after it leaves. */
const PEEK_DELAY_MS = 300;
const PEEK_LINGER_MS = 500;

const BUBBLE = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  peek: { opacity: 0.85, y: 3, scale: 0.97 },
  invite: { opacity: 1, y: 0, scale: 1 },
  teaser: { opacity: 1, y: 0, scale: 1 },
};
const STILL_BUBBLE = {
  hidden: { opacity: 0 },
  peek: { opacity: 0.85 },
  invite: { opacity: 1 },
  teaser: { opacity: 1 },
};

/**
 * The robot in the bottom-right corner that opens the chat. It notices the pointer coming
 * near — turning to look, and peeking out its invitation — and greets it on hover. Every
 * page element marked with `data-robot` catches its eye. When the visitor has been idle a
 * while on desktop, it strolls along the bottom of the screen and walks back the moment
 * they return. Opening the chat calls it home. Reduced motion keeps it docked.
 */
export function RobotLauncher({
  open,
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
  /** The button's accessible name: open or close the chat. */
  label: string;
  panelId: string;
  /** The invitation, shown as the pointer comes near or the robot is hovered or focused. */
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
  const [near, setNear] = useState(false);
  const [peek, setPeek] = useState(false);

  // The robot reacts to the page's buttons and links while it's on screen.
  useEffect(() => watchRobotTargets(), []);

  useEffect(() => {
    setRobotProximity(hovered ? "over" : near ? "near" : "far");
  }, [hovered, near]);
  useEffect(() => () => setRobotProximity("far"), []);

  // Notice the pointer coming near. Measured in Motion's frame batches, and only zone changes re-render.
  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !window.matchMedia(HOVER_QUERY).matches) return;
    let box: DOMRect | null = null;
    let inside = false;
    const measure = () => {
      box = button.getBoundingClientRect();
    };
    const apply = () => {
      const pointer = getRobotPointer();
      if (!box || !pointer || pointer.touch) return;
      const distance = Math.hypot(pointer.x - (box.left + box.width / 2), pointer.y - (box.top + box.height / 2));
      const next = distance < (inside ? NEAR.exit : NEAR.enter);
      if (next === inside) return;
      inside = next;
      setNear(next);
    };
    const unsubscribe = subscribeRobotLook(() => {
      frame.read(measure);
      frame.update(apply);
    });
    return () => {
      unsubscribe();
      cancelFrame(measure);
      cancelFrame(apply);
    };
  }, [buttonRef]);

  // Peek out the invitation once the pointer stays near, and keep it a moment after it goes.
  useEffect(() => {
    const show = near && !open && !walking;
    const timer = window.setTimeout(() => setPeek(show), show ? PEEK_DELAY_MS : PEEK_LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [near, open, walking]);

  // Opening the chat calls the robot back to its corner.
  useEffect(() => {
    if (!open) return;
    const controls = animate(x, 0, { type: "spring", stiffness: 260, damping: 28 });
    return () => controls.stop();
  }, [open, x]);

  // When the visitor has been idle a while, take a short stroll; their return sends it home.
  useEffect(() => {
    if (open || hovered || teaser || reduceMotion || !window.matchMedia(ROAM_QUERY).matches) return;
    let cancelled = false;
    let timer = 0;
    let controls: ReturnType<typeof animate> | undefined;
    /** Ends whatever the stroll is waiting on, so cleanup never leaves it hanging. */
    let release: (() => void) | undefined;
    /** Visitor activity cuts short the walk out and the look around, never the walk home. */
    let interruptible = false;
    let interrupted = false;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        release = resolve;
        timer = window.setTimeout(resolve, ms);
      });
    const walkTo = (target: number, speed = SPEED) =>
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
        controls = animate(x, target, { duration: distance / speed, ease: "linear", onComplete: arrive });
      });
    const stopListening = onRobotActivity(() => {
      if (!interruptible || interrupted) return;
      interrupted = true;
      controls?.stop();
      release?.();
    });

    void (async () => {
      // After a hover stopped it mid-stroll, head home soon.
      if (x.get() !== 0) {
        await wait(1200);
        if (cancelled) return;
        await walkTo(0);
      }
      while (!cancelled) {
        const idle = performance.now() - getRobotActivity();
        if (idle < IDLE_BEFORE_STROLL_MS || document.visibilityState !== "visible") {
          await wait(Math.max(1000, IDLE_BEFORE_STROLL_MS - idle));
          continue;
        }
        interrupted = false;
        interruptible = true;
        const room = Math.min(window.innerWidth * 0.35, 320);
        await walkTo(-(100 + Math.random() * Math.max(0, room - 100)));
        if (!cancelled && !interrupted) await wait(2000 + Math.random() * 1000); // stop and look around
        interruptible = false;
        if (cancelled) break;
        await walkTo(0, interrupted ? SPEED * 1.6 : SPEED);
        // Rest before the next stroll; a visitor who came back restarts the idle wait anyway.
        if (!cancelled && !interrupted) await wait(20000 + Math.random() * 15000);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controls?.stop();
      release?.();
      stopListening();
    };
  }, [open, hovered, teaser, reduceMotion, x]);

  const bubble = open ? null : teaser ? "teaser" : walking ? null : hovered ? "invite" : peek ? "peek" : null;

  return (
    <motion.div
      style={{ x }}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] sm:right-6 sm:bottom-6"
    >
      <AnimatePresence>
        {bubble && (
          <motion.div
            key={bubble === "teaser" ? "teaser" : "hint"}
            lang={lang}
            variants={reduceMotion ? STILL_BUBBLE : BUBBLE}
            initial="hidden"
            animate={bubble}
            exit="hidden"
            transition={{ type: "spring", visualDuration: 0.25, bounce: 0.2 }}
            className={cn(
              "absolute right-0 bottom-full mb-2 w-max max-w-64 origin-bottom-right rounded-2xl rounded-br-md border bg-card px-3 py-2 text-sm leading-snug text-card-foreground shadow-lg transition-colors",
              bubble === "invite" ? "border-caramel/70 font-medium" : "border-border",
              // Only the greeting has buttons; the invitation never blocks the page beneath it.
              bubble !== "teaser" && "pointer-events-none"
            )}
          >
            {bubble === "teaser" ? (
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
              <span aria-hidden>{hint}</span>
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
        <Robot walking={walking} className="size-full" />
        {open && (
          <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <X className="size-3.5" />
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}
