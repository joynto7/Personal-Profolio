"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useSpring } from "framer-motion";

export type RobotMood = "idle" | "happy" | "thinking" | "talking" | "sad";

/** How far, in SVG units, the eyes travel inside the visor when following the pointer. */
const EYE_RANGE = { x: 7, y: 4 };
const GLOW = "fill-[#ffe2bd]";
const GLOW_STROKE = "stroke-[#ffe2bd]";
const SHELL = "fill-ivory stroke-espresso";
const loop = (duration: number) => ({ duration, repeat: Infinity, ease: "easeInOut" as const });
/** SVG parts rotate around their own box, e.g. a limb around its shoulder or hip. */
const pivot = (originX: number, originY: number) => ({ transformBox: "fill-box" as const, originX, originY });

/**
 * The assistant's mascot: a small robot drawn in SVG. Its eyes follow the pointer anywhere
 * on the page (and glance around when it rests), it blinks, and its face shows its mood.
 * `walking` swings its legs and arms, `waving` raises its right arm, and `variant="head"`
 * draws just the head, for small avatars. Reduced motion keeps it still apart from blinking.
 */
export function Robot({
  mood = "idle",
  walking = false,
  waving = false,
  variant = "full",
  className,
}: {
  mood?: RobotMood;
  walking?: boolean;
  waving?: boolean;
  variant?: "full" | "head";
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduceMotion = useReducedMotion();
  const lookX = useSpring(0, { stiffness: 200, damping: 20 });
  const lookY = useSpring(0, { stiffness: 200, damping: 20 });
  const tilt = useSpring(0, { stiffness: 120, damping: 14 });
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    let lastMove = 0;
    const aim = () => {
      frame = 0;
      const box = svgRef.current?.getBoundingClientRect();
      if (!box || !pointer) return;
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height * (variant === "head" ? 0.6 : 0.3));
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, distance / 160); // full stare once the pointer is ~160px away
      lookX.set((dx / distance) * EYE_RANGE.x * reach);
      lookY.set((dy / distance) * EYE_RANGE.y * reach);
      tilt.set(Math.max(-8, Math.min(8, dx / 50)));
    };
    const onPointer = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      lastMove = Date.now();
      frame ||= requestAnimationFrame(aim);
    };
    // While walking, keep re-aiming as the robot moves; at rest, glance around when the pointer is idle.
    const tick = window.setInterval(
      () => {
        if (walking && pointer) return aim();
        if (Date.now() - lastMove < 4000) return;
        const atVisitor = Math.random() < 0.35;
        lookX.set(atVisitor ? 0 : (Math.random() * 2 - 1) * EYE_RANGE.x);
        lookY.set(atVisitor ? 0 : (Math.random() * 2 - 1) * EYE_RANGE.y * 0.6);
        tilt.set(0);
      },
      walking ? 120 : 2600
    );
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.clearInterval(tick);
      cancelAnimationFrame(frame);
    };
  }, [reduceMotion, walking, variant, lookX, lookY, tilt]);

  // Blink every few seconds, at uneven intervals so it feels alive.
  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setBlinking(true);
        timer = window.setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 140);
      }, 2200 + Math.random() * 3800);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  const still = Boolean(reduceMotion);
  const limbSwing = (from: number) => (walking ? [from, -from, from] : [from / 5, -from / 5, from / 5]);

  return (
    <svg
      ref={svgRef}
      viewBox={variant === "head" ? "8 0 84 62" : "0 0 100 120"}
      className={className}
      aria-hidden
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      {variant === "full" && (
        <motion.ellipse
          cx={50}
          cy={115}
          rx={22}
          ry={3.5}
          className="fill-espresso/15 dark:fill-black/40"
          style={pivot(0.5, 0.5)}
          animate={still ? undefined : { scaleX: [1, 0.9, 1] }}
          transition={loop(walking ? 0.3 : 2.4)}
        />
      )}
      <motion.g animate={still ? undefined : { y: [0, walking ? -2 : -2.5, 0] }} transition={loop(walking ? 0.3 : 2.4)}>
        {variant === "full" && (
          <>
            {/* Legs and feet, swinging from the hip when walking */}
            <motion.g style={pivot(0.5, 0)} animate={still ? undefined : { rotate: limbSwing(14) }} transition={loop(0.6)}>
              <rect x={37} y={86} width={9} height={18} rx={4.5} className={SHELL} />
              <rect x={33.5} y={100} width={14} height={7} rx={3.5} className="fill-caramel stroke-espresso" />
            </motion.g>
            <motion.g style={pivot(0.5, 0)} animate={still ? undefined : { rotate: limbSwing(-14) }} transition={loop(0.6)}>
              <rect x={54} y={86} width={9} height={18} rx={4.5} className={SHELL} />
              <rect x={52.5} y={100} width={14} height={7} rx={3.5} className="fill-caramel stroke-espresso" />
            </motion.g>
            {/* Arms, hanging from the shoulders */}
            <motion.g style={pivot(0.5, 0)} animate={still ? undefined : { rotate: limbSwing(-14) }} transition={loop(walking ? 0.6 : 3)}>
              <rect x={20} y={65} width={8} height={22} rx={4} className={SHELL} />
            </motion.g>
            <motion.g
              style={pivot(0.5, 0)}
              animate={still ? undefined : { rotate: waving ? [0, -150, -115, -150, -115, -150, 0] : limbSwing(14) }}
              transition={waving ? { duration: 1.6, ease: "easeInOut" } : loop(walking ? 0.6 : 3)}
            >
              <rect x={72} y={65} width={8} height={22} rx={4} className={SHELL} />
            </motion.g>
            {/* Body with a glowing chest light */}
            <rect x={29} y={62} width={42} height={30} rx={13} className={SHELL} />
            <motion.circle
              cx={50}
              cy={77}
              r={4.5}
              className="fill-caramel"
              animate={still ? undefined : { opacity: [1, 0.45, 1] }}
              transition={loop(mood === "talking" ? 0.5 : 2)}
            />
            <rect x={44} y={56} width={12} height={8} rx={2} className="fill-espresso" />
          </>
        )}

        {/* Head, tilting toward the pointer from the neck */}
        <motion.g style={{ ...pivot(0.5, 1), rotate: tilt }}>
          <line x1={50} y1={17} x2={50} y2={8} className="stroke-espresso" />
          <motion.circle
            cx={50}
            cy={6}
            r={4.5}
            className="fill-caramel"
            animate={still ? undefined : { opacity: [1, mood === "thinking" ? 0.2 : 0.6, 1] }}
            transition={loop(mood === "thinking" ? 0.6 : 2)}
          />
          <rect x={11} y={29} width={8} height={16} rx={4} className="fill-caramel stroke-espresso" />
          <rect x={81} y={29} width={8} height={16} rx={4} className="fill-caramel stroke-espresso" />
          <rect x={16} y={15} width={68} height={44} rx={20} className={SHELL} />
          <rect x={23} y={22} width={54} height={30} rx={13} className="fill-[#2a1c16] dark:fill-[#120c0a]" />
          <ellipse cx={30} cy={45} rx={3.5} ry={2} className="fill-caramel" opacity={mood === "happy" ? 0.95 : 0.6} />
          <ellipse cx={70} cy={45} rx={3.5} ry={2} className="fill-caramel" opacity={mood === "happy" ? 0.95 : 0.6} />

          {/* Eyes: they follow the pointer, glance up while thinking, and squint when happy */}
          <motion.g style={{ x: lookX, y: lookY, filter: "drop-shadow(0 0 2px rgba(255, 190, 120, 0.9))" }}>
            <motion.g animate={mood === "thinking" ? { x: 3, y: -4 } : { x: 0, y: 0 }}>
              {mood === "happy" ? (
                <g className={GLOW_STROKE} strokeWidth={3} fill="none">
                  <path d="M35 39 Q40 32 45 39" />
                  <path d="M55 39 Q60 32 65 39" />
                </g>
              ) : (
                <motion.g
                  style={pivot(0.5, 0.5)}
                  animate={{ scaleY: blinking ? 0.1 : mood === "sad" ? 0.55 : 1 }}
                  transition={{ duration: 0.08 }}
                >
                  <rect x={35} y={30} width={10} height={13} rx={5} className={GLOW} />
                  <rect x={55} y={30} width={10} height={13} rx={5} className={GLOW} />
                  <circle cx={42.5} cy={33.5} r={1.5} className="fill-white" />
                  <circle cx={62.5} cy={33.5} r={1.5} className="fill-white" />
                </motion.g>
              )}
            </motion.g>
          </motion.g>

          {/* Mouth */}
          {mood === "talking" ? (
            <motion.rect
              x={46}
              y={45}
              width={8}
              height={4}
              rx={2}
              className={GLOW}
              style={pivot(0.5, 0.5)}
              animate={still ? undefined : { scaleY: [0.35, 1, 0.5, 1, 0.35] }}
              transition={loop(0.5)}
            />
          ) : mood === "thinking" ? (
            <circle cx={50} cy={47} r={1.8} className={GLOW} />
          ) : (
            <path
              d={mood === "sad" ? "M45 49 Q50 45.5 55 49" : mood === "happy" ? "M44 45 Q50 51 56 45" : "M45.5 46 Q50 49.5 54.5 46"}
              className={GLOW_STROKE}
              strokeWidth={2}
              fill="none"
            />
          )}
        </motion.g>
      </motion.g>
    </svg>
  );
}
