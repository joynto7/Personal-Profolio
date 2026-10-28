"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import {
  animate,
  cancelFrame,
  frame,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "framer-motion";
import { resolveFace, type RobotFace } from "@/lib/robot/brain";
import { getRobotGaze, getRobotPointer, onRobotMouth, subscribeRobotLook, useRobotState } from "@/lib/robot/bus";
import { cn } from "@/lib/utils";

/** How far, in SVG units, the eyes travel inside the visor when following the pointer. */
const EYE_RANGE = { x: 7, y: 4 };
/** After this long without the pointer moving, the robot stops following it and glances around. */
const IDLE_GAZE_MS = 4000;
const GLOW = "fill-[#ffe2bd]";
const GLOW_STROKE = "stroke-[#ffe2bd]";
const loop = (duration: number) => ({ duration, repeat: Infinity, ease: "easeInOut" as const });
/** Turns or scales a part around a fixed point of the drawing, e.g. a limb around its shoulder. */
const at = (x: number, y: number) => ({ transformBox: "view-box" as const, originX: `${x}px`, originY: `${y}px` });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Eyes lead, the head follows and the body settles last: the overlap reads as weight.
const EYE_SPRING = { stiffness: 420, damping: 32 };
const HEAD_SPRING = { visualDuration: 0.45, bounce: 0.15 };
const BODY_SPRING = { visualDuration: 0.7, bounce: 0.1 };
/** No overshoot, for visitors who prefer reduced motion. */
const CALM_SPRING = { stiffness: 300, damping: 40 };

const EYES: Record<RobotFace["eyes"], { open: number; size: number; slant: number }> = {
  open: { open: 1, size: 1, slant: 0 },
  happy: { open: 1, size: 1, slant: 0 },
  wide: { open: 1.12, size: 1.1, slant: 0 },
  focus: { open: 0.68, size: 1, slant: 0 },
  sleepy: { open: 0.3, size: 1, slant: 0 },
  sad: { open: 0.55, size: 0.95, slant: 9 },
};

/** The mouth's curves share one shape — a quadratic curve — so they morph into each other. */
const MOUTH_CURVES: Partial<Record<RobotFace["mouth"], string>> = {
  smile: "M45.5 46 Q50 49.5 54.5 46",
  grin: "M44 45 Q50 51 56 45",
  flat: "M46.5 47.5 Q50 47.5 53.5 47.5",
  frown: "M45 49 Q50 45.5 55 49",
};

const ANTENNA_HALO: Record<RobotFace["antenna"], number> = { calm: 0.25, fast: 0.45, bright: 0.9, flash: 0.9 };

function blinkEyes(blink: MotionValue<number>) {
  animate(blink, [1, 0.08, 1], { duration: 0.16, times: [0, 0.45, 1] });
}

/** How an arm moves for a face. `out` is the direction that lifts it away from the body. */
function armMotion(side: "left" | "right", arms: RobotFace["arms"], walking: boolean) {
  const out = side === "left" ? 1 : -1;
  if (walking) return { animate: { rotate: [-14 * out, 14 * out, -14 * out] }, transition: loop(0.6) };
  if (arms === "up") return { animate: { rotate: 50 * out }, transition: { type: "spring" as const, visualDuration: 0.3, bounce: 0.35 } };
  if (arms === "still") return { animate: { rotate: 0 }, transition: { duration: 0.3 } };
  if (arms === "wave" && side === "right") {
    return { animate: { rotate: [0, -150, -115, -150, -115, -150, 0] }, transition: { duration: 1.6, ease: "easeInOut" as const } };
  }
  if (arms === "waveLeft" && side === "left") {
    return { animate: { rotate: [0, 150, 120, 150, 0] }, transition: { duration: 0.9, ease: "easeInOut" as const } };
  }
  return { animate: { rotate: [-2.8 * out, 2.8 * out, -2.8 * out] }, transition: loop(3) };
}

/**
 * The assistant's mascot: a small robot drawn in SVG, with depth faked in layers — the face
 * plate slides further than the shell as it turns, the ears slide the other way, and the
 * highlights stay put — while the whole figure tilts a few degrees in real 3D. Its eyes lead,
 * its head and body follow the pointer (or the page element the visitor is on), and its face
 * shows the shared robot state from `@/lib/robot/bus`. `walking` swings its legs, and
 * `variant="head"` draws just the head, for small avatars. Reduced motion keeps it still apart
 * from its eyes and face.
 */
export function Robot({
  walking = false,
  variant = "full",
  className,
}: {
  walking?: boolean;
  variant?: "full" | "head";
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const id = useId();
  const still = Boolean(useReducedMotion());
  const robot = useRobotState();
  const face = useMemo(() => resolveFace(robot), [robot]);
  const gesture = robot.gesture;
  // Thinking holds the head still, and an open chat calms the robot so it doesn't distract from reading.
  const restraint = robot.base === "thinking" ? 0.4 : robot.open ? 0.5 : 1;
  const restraintRef = useRef(restraint);

  // Following the pointer.
  const lookX = useSpring(0, still ? CALM_SPRING : EYE_SPRING);
  const lookY = useSpring(0, still ? CALM_SPRING : EYE_SPRING);
  const turn = useSpring(0, HEAD_SPRING); // yaw, -1 to 1
  const nod = useSpring(0, HEAD_SPRING); // pitch, -1 to 1
  const tilt = useSpring(0, HEAD_SPRING); // roll, degrees
  const lean = useSpring(0, BODY_SPRING); // degrees
  const tiltX = useSpring(0, BODY_SPRING); // the 3D tilt of the whole figure, degrees
  const tiltY = useSpring(0, BODY_SPRING);

  // Gestures and the face.
  const hop = useMotionValue(0);
  const squash = useMotionValue(1);
  const headDip = useMotionValue(0);
  const shake = useMotionValue(0);
  const leanIn = useMotionValue(0);
  const ring = useMotionValue(0);
  const blink = useMotionValue(1);
  const mouth = useMotionValue(0);
  const float = useMotionValue(0);
  const eyeOpen = useMotionValue(1);
  const eyeSize = useMotionValue(1);
  const eyeSlant = useMotionValue(0);
  const leftEye = useMotionValue(1);
  const rightEye = useMotionValue(1);
  const glow = useMotionValue(face.glow);
  const cheeks = useMotionValue(face.cheeks);

  // The 2.5D layers: the further forward a part sits, the further it slides as the head turns.
  const shellX = useTransform(turn, (t) => t);
  const shellScaleX = useTransform(turn, (t) => 1 - Math.abs(t) * 0.03);
  const earsX = useTransform(turn, (t) => t * -2.2);
  const visorX = useTransform(turn, (t) => t * 2.5);
  const visorY = useTransform(nod, (n) => n * 1.5);
  const faceX = useTransform(turn, (t) => t * 3.5);
  const faceY = useTransform(nod, (n) => n * 2);
  const shineX = useTransform(turn, (t) => t * -1.5);
  const sheenX = useTransform(turn, (t) => t * -4);
  const bodyX = useTransform(turn, (t) => t * 0.8);
  const glintX = useTransform(lookX, (x) => x * -0.15);
  const headRotate = useTransform([tilt, shake], ([roll, jolt]: number[]) => roll + jolt);
  const figureTiltX = useTransform([tiltX, leanIn], ([pointer, gestureLean]: number[]) => pointer + gestureLean);
  // The antenna trails the head's turns, then wobbles back: follow-through.
  const antennaSwing = useSpring(
    useTransform(useVelocity(turn), (velocity) => clamp(-velocity * 5, -14, 14)),
    { stiffness: 140, damping: 7 }
  );
  const eyesScaleY = useTransform([eyeOpen, blink], ([open, lid]: number[]) => open * lid);
  const leftSlant = useTransform(eyeSlant, (slant) => -slant);
  const mouthOpen = useTransform(mouth, [0, 1], [0.35, 1]);
  const ringScale = useTransform(ring, [0, 1], [1, 3]);
  const ringOpacity = useTransform(ring, [0, 0.05, 1], [0, 0.8, 0]);
  const shadowScale = useTransform([float, hop], ([lift, jump]: number[]) => 1 + lift * 0.035 + jump * 0.03);
  const shadowOpacity = useTransform([float, hop], ([lift, jump]: number[]) => 1 + lift * 0.08 + jump * 0.06);
  const shadowX = useTransform(lean, (degrees) => degrees * 0.8);
  const aura = useTransform(glow, [0.5, 1], [0, 0.55]);

  useEffect(() => {
    restraintRef.current = restraint;
  }, [restraint]);

  // Aim at the page element the visitor is on, or the pointer while it moves. Measuring and
  // moving run in Motion's frame batches, so pointer moves never re-render React.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let box: DOMRect | null = null;
    let target: DOMRect | null = null;
    let blinkedAt = 0;

    const measure = () => {
      box = svg.getBoundingClientRect();
      const gaze = getRobotGaze();
      target = gaze?.isConnected ? gaze.getBoundingClientRect() : null;
    };
    const apply = () => {
      if (!box?.width) return; // hidden behind the full-screen chat
      const pointer = getRobotPointer();
      const now = performance.now();
      const point = target
        ? { x: target.left + target.width / 2, y: target.top + target.height / 2 }
        : pointer && now - pointer.at < IDLE_GAZE_MS
          ? pointer
          : null;
      if (!point) return; // the glances below take over
      const dx = point.x - (box.left + box.width / 2);
      const dy = point.y - (box.top + box.height * (variant === "head" ? 0.6 : 0.3));
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, distance / 160); // full stare once the point is ~160px away
      const x = (dx / distance) * EYE_RANGE.x * reach;
      const y = (dy / distance) * EYE_RANGE.y * reach;
      // A big glance comes with a blink, the way eyes do.
      if (Math.hypot(x - lookX.get(), y - lookY.get()) > 7 && now - blinkedAt > 1200) {
        blinkedAt = now;
        blinkEyes(blink);
      }
      lookX.set(x);
      lookY.set(y);
      if (still) return;
      // The head and body only fully turn for what's close by, or for an element the visitor is on.
      const engaged = (target ? 1 : 0.35 + 0.65 * clamp((600 - distance) / 420, 0, 1)) * restraintRef.current;
      turn.set(clamp(dx / 260, -1, 1) * engaged);
      nod.set(clamp(dy / 320, -1, 1) * 0.8 * engaged);
      tilt.set(clamp(dx / 50, -6, 6) * engaged);
      lean.set(clamp(dx / 320, -1, 1) * 2 * engaged);
      tiltY.set(clamp(dx / 320, -1, 1) * 5 * engaged);
      tiltX.set(clamp(-dy / 320, -1, 1) * 4 * engaged);
    };
    const aim = () => {
      frame.read(measure);
      frame.update(apply);
    };

    aim();
    const unsubscribe = subscribeRobotLook(aim);
    // While the visitor rests, glance around now and then — and back at them sometimes.
    const glances = window.setInterval(() => {
      const pointer = getRobotPointer();
      if (getRobotGaze() || (pointer && performance.now() - pointer.at < IDLE_GAZE_MS)) return;
      const atVisitor = Math.random() < 0.35;
      const x = atVisitor ? 0 : (Math.random() * 2 - 1) * EYE_RANGE.x;
      lookX.set(x);
      lookY.set(atVisitor ? 0 : (Math.random() * 2 - 1) * EYE_RANGE.y * 0.6);
      if (still) return;
      turn.set((x / EYE_RANGE.x) * 0.3 * restraintRef.current);
      for (const value of [nod, tilt, lean, tiltX, tiltY]) value.set(0);
    }, 2600);

    return () => {
      unsubscribe();
      window.clearInterval(glances);
      cancelFrame(measure);
      cancelFrame(apply);
    };
  }, [variant, still, lookX, lookY, turn, nod, tilt, lean, tiltX, tiltY, blink]);

  // Blink every few seconds, at uneven intervals, now and then twice.
  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        blinkEyes(blink);
        if (Math.random() < 0.15) {
          timer = window.setTimeout(() => {
            blinkEyes(blink);
            schedule();
          }, 260);
        } else {
          schedule();
        }
      }, 2200 + Math.random() * 3800);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [blink]);

  // A gentle float, on the HTML wrapper so it costs no SVG repaints.
  useEffect(() => {
    if (still || variant === "head") return;
    const controls = animate(float, [0, walking ? -2 : -2.5, 0], loop(walking ? 0.3 : 2.4));
    return () => controls.stop();
  }, [still, variant, walking, float]);

  // Each streamed piece of an answer, or word read aloud, moves the mouth.
  useEffect(() => {
    let flappedAt = 0;
    return onRobotMouth(() => {
      const now = performance.now();
      if (now - flappedAt < 110) return;
      flappedAt = now;
      animate(mouth, [null, 1, 0.25], { duration: 0.2, ease: "easeOut" });
    });
  }, [mouth]);

  // Ease between faces.
  useEffect(() => {
    const shape = EYES[face.eyes];
    const ease = { duration: 0.22, ease: "easeOut" as const };
    const settle = still ? ease : { type: "spring" as const, visualDuration: 0.3, bounce: 0.3 };
    animate(eyeOpen, shape.open, ease);
    animate(eyeSize, shape.size, settle);
    animate(eyeSlant, shape.slant, ease);
    animate(leftEye, face.curious ? 1.1 : 1, settle);
    animate(rightEye, face.curious ? 0.9 : 1, settle);
    animate(glow, face.glow, { duration: 0.35 });
    animate(cheeks, face.cheeks, { duration: 0.35 });
  }, [face.eyes, face.curious, face.glow, face.cheeks, still, eyeOpen, eyeSize, eyeSlant, leftEye, rightEye, glow, cheeks]);

  // The body language of each gesture: anticipation, action, settle. `null` starts from wherever it is.
  useEffect(() => {
    if (!gesture || still) return;
    switch (gesture.name) {
      case "excited":
      case "success":
        animate(squash, [null, 0.93, 1.05, 1], { duration: 0.5, times: [0, 0.18, 0.5, 1], ease: "easeOut" });
        animate(hop, [null, 1.2, -5, 0], { duration: 0.6, times: [0, 0.18, 0.5, 1], ease: "easeInOut" });
        animate(ring, [0, 1], { duration: 0.55, ease: "easeOut" });
        break;
      case "acknowledge":
      case "nod":
        animate(headDip, [null, 2.2, 0], { duration: 0.42, ease: "easeInOut" });
        blinkEyes(blink);
        break;
      case "powerDown":
        animate(headDip, [null, 1.8, 0], { duration: 0.6, ease: "easeInOut" });
        break;
      case "error":
        animate(shake, [null, -4, 4, -3, 2, 0], { duration: 0.55, ease: "easeInOut" });
        break;
      case "perk":
        animate(squash, [null, 1.04, 1], { duration: 0.35, ease: "easeOut" });
        break;
      case "lean":
        animate(leanIn, [null, 6, 0], { duration: 0.9, times: [0, 0.35, 1], ease: "easeInOut" });
        break;
      case "blink":
        blinkEyes(blink);
        window.setTimeout(() => blinkEyes(blink), 220);
        break;
    }
  }, [gesture, still, squash, hop, ring, headDip, blink, shake, leanIn]);

  const ids = {
    shell: `${id}-shell`,
    shine: `${id}-shine`,
    visor: `${id}-visor`,
    visorClip: `${id}-visor-clip`,
    glow: `${id}-glow`,
    chest: `${id}-chest`,
    shade: `${id}-shade`,
  };
  const shell = { fill: `url(#${ids.shell})`, className: "stroke-espresso" };
  const mouthCurve = MOUTH_CURVES[face.mouth];
  const loops = !still;

  const svg = (
    <motion.svg
      ref={svgRef}
      viewBox={variant === "head" ? "8 0 84 62" : "0 0 100 120"}
      className={variant === "head" ? className : "relative size-full overflow-visible will-change-transform"}
      style={variant === "full" ? { y: float, rotateX: figureTiltX, rotateY: tiltY, transformPerspective: 500 } : undefined}
      // What drives the face, for debugging: base, proximity, page element, gesture.
      data-state={`${robot.base} ${robot.proximity} ${robot.target ?? "-"} ${gesture?.name ?? "-"}`}
      aria-hidden
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <defs>
        {/* Soft light from the top left, falling off toward the bottom right */}
        <linearGradient id={ids.shell} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffaf4" />
          <stop offset="0.5" style={{ stopColor: "var(--ivory)" }} />
          <stop offset="1" stopColor="#e2d5c7" />
        </linearGradient>
        <radialGradient id={ids.shine}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {/* Glass: a little light caught at the top, deeper at the bottom */}
        <linearGradient id={ids.visor} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.13" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
        <clipPath id={ids.visorClip}>
          <rect x={23} y={22} width={54} height={30} rx={13} />
        </clipPath>
        <radialGradient id={ids.glow}>
          <stop offset="0" stopColor="#ffc98f" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffc98f" stopOpacity="0" />
        </radialGradient>
        {/* A lit bulb: hot at the centre, caramel at the rim */}
        <radialGradient id={ids.chest} cx="0.42" cy="0.38">
          <stop offset="0" stopColor="#fff4e6" />
          <stop offset="0.45" stopColor="#ffcf9c" />
          <stop offset="0.85" style={{ stopColor: "var(--caramel)" }} />
          <stop offset="1" stopColor="#ad7445" />
        </radialGradient>
        {/* Where the head shades the body */}
        <radialGradient id={ids.shade}>
          <stop offset="0" style={{ stopColor: "var(--espresso)" }} stopOpacity="0.35" />
          <stop offset="1" style={{ stopColor: "var(--espresso)" }} stopOpacity="0" />
        </radialGradient>
      </defs>

      <motion.g style={{ ...at(50, 107), y: hop, scaleY: squash, rotate: lean }}>
        {variant === "full" && (
          <>
            {/* Legs and feet, swinging from the hip when walking */}
            <motion.g
              style={at(41.5, 86)}
              animate={loops ? { rotate: walking ? [14, -14, 14] : [2.8, -2.8, 2.8] } : undefined}
              transition={loop(walking ? 0.6 : 2.4)}
            >
              <rect x={37} y={86} width={9} height={18} rx={4.5} {...shell} />
              <rect x={33.5} y={100} width={14} height={7} rx={3.5} className="fill-caramel stroke-espresso" />
            </motion.g>
            <motion.g
              style={at(58.5, 86)}
              animate={loops ? { rotate: walking ? [-14, 14, -14] : [-2.8, 2.8, -2.8] } : undefined}
              transition={loop(walking ? 0.6 : 2.4)}
            >
              <rect x={54} y={86} width={9} height={18} rx={4.5} {...shell} />
              <rect x={52.5} y={100} width={14} height={7} rx={3.5} className="fill-caramel stroke-espresso" />
            </motion.g>
            {/* Arms, hanging from the shoulders */}
            <motion.g style={at(24, 66)} {...(loops ? armMotion("left", face.arms, walking) : {})}>
              <rect x={20} y={65} width={8} height={22} rx={4} {...shell} />
            </motion.g>
            <motion.g style={at(76, 66)} {...(loops ? armMotion("right", face.arms, walking) : {})}>
              <rect x={72} y={65} width={8} height={22} rx={4} {...shell} />
            </motion.g>
            {/* Body, with a highlight, the head's shadow and a glowing chest light */}
            <motion.g style={{ x: bodyX }}>
              <rect x={29} y={62} width={42} height={30} rx={13} {...shell} />
              <ellipse cx={38} cy={68.5} rx={6} ry={2.2} fill={`url(#${ids.shine})`} opacity={0.7} transform="rotate(-20 38 68.5)" />
              <ellipse cx={50} cy={64.5} rx={17} ry={3.4} fill={`url(#${ids.shade})`} />
              <motion.circle
                cx={50}
                cy={77}
                r={8}
                fill={`url(#${ids.glow})`}
                initial={false}
                animate={{ opacity: face.chest === "dim" ? 0 : face.chest === "flash" ? 0.9 : 0.45 }}
              />
              <motion.circle
                cx={50}
                cy={77}
                r={4.5}
                fill={`url(#${ids.chest})`}
                style={at(50, 77)}
                {...(face.chest === "dim" || !loops
                  ? { animate: { opacity: face.chest === "dim" ? 0.35 : 1, scale: 1 }, transition: { duration: 0.3 } }
                  : face.chest === "flash"
                    ? { animate: { opacity: [1, 0.3, 1, 0.3, 1], scale: [1, 1.25, 1, 1.25, 1] }, transition: { duration: 0.7 } }
                    : {
                        animate: { opacity: [1, face.chest === "pulse" ? 0.45 : 0.55, 1], scale: 1 },
                        transition: loop(face.chest === "pulse" ? 0.5 : 2),
                      })}
              />
            </motion.g>
            <rect x={44} y={56} width={12} height={8} rx={2} className="fill-espresso" />
          </>
        )}

        {/* Head, turning and tilting from the neck */}
        <motion.g style={{ ...at(50, 59), rotate: headRotate, y: headDip }}>
          {/* Antenna, trailing the head's turns */}
          <motion.g style={{ x: shellX }}>
            <motion.g style={{ ...at(50, 17), rotate: antennaSwing }}>
              <line x1={50} y1={17} x2={50} y2={8} className="stroke-espresso" />
              <motion.circle
                cx={50}
                cy={6}
                r={8}
                fill={`url(#${ids.glow})`}
                initial={false}
                animate={{ opacity: ANTENNA_HALO[face.antenna] }}
              />
              <motion.circle
                key={face.antenna === "flash" ? `flash-${gesture?.id}` : "steady"}
                cx={50}
                cy={6}
                r={4.5}
                className="fill-caramel"
                {...(!loops || face.antenna === "bright"
                  ? { animate: { opacity: 1 }, transition: { duration: 0.2 } }
                  : face.antenna === "flash"
                    ? { animate: { opacity: [1, 0.25, 1, 0.25, 1] }, transition: { duration: 0.6 } }
                    : {
                        animate: { opacity: [1, face.antenna === "fast" ? 0.2 : 0.6, 1] },
                        transition: loop(face.antenna === "fast" ? 0.6 : 2),
                      })}
              />
            </motion.g>
            {/* A ring of light that leaves the antenna as the robot powers up */}
            <motion.circle
              cx={50}
              cy={6}
              r={4.5}
              fill="none"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              className="stroke-caramel"
              style={{ ...at(50, 6), scale: ringScale, opacity: ringOpacity }}
            />
          </motion.g>

          {/* Ears sit behind the face, so they slide the other way as it turns */}
          <motion.g style={{ x: earsX }}>
            <rect x={11} y={29} width={8} height={16} rx={4} className="fill-caramel stroke-espresso" />
            <rect x={81} y={29} width={8} height={16} rx={4} className="fill-caramel stroke-espresso" />
            {/* Lights that show it's listening */}
            <motion.g
              className={GLOW}
              initial={false}
              animate={face.ears ? (loops ? { opacity: [0.3, 0.95, 0.3] } : { opacity: 0.8 }) : { opacity: 0 }}
              transition={face.ears && loops ? loop(1.4) : { duration: 0.3 }}
            >
              <rect x={13.5} y={33} width={3} height={8} rx={1.5} />
              <rect x={83.5} y={33} width={3} height={8} rx={1.5} />
            </motion.g>
          </motion.g>

          {/* Shell, narrowing slightly as it turns; its highlights stay where the light is */}
          <motion.g style={{ ...at(50, 37), x: shellX, scaleX: shellScaleX }}>
            <rect x={16} y={15} width={68} height={44} rx={20} {...shell} />
            <motion.g style={{ x: shineX }} fill={`url(#${ids.shine})`}>
              <ellipse cx={34} cy={18.6} rx={7} ry={2} opacity={0.9} />
              <ellipse cx={19.6} cy={37} rx={1.3} ry={6} opacity={0.6} />
            </motion.g>
          </motion.g>

          {/* Visor: dark glass with a sheen that slides across it as the head turns */}
          <motion.g style={{ x: visorX, y: visorY }}>
            <rect x={23} y={22} width={54} height={30} rx={13} className="fill-[#2a1c16] dark:fill-[#120c0a]" />
            <rect x={23} y={22} width={54} height={30} rx={13} fill={`url(#${ids.visor})`} />
            <g clipPath={`url(#${ids.visorClip})`}>
              <motion.g style={{ x: sheenX }} fill="#fff">
                <path d="M41 20 L49 20 L37 54 L29 54 Z" opacity={0.07} />
                <path d="M51 20 L54 20 L42 54 L39 54 Z" opacity={0.05} />
              </motion.g>
              {/* A slow scan line while it thinks */}
              <motion.rect
                x={23}
                y={0}
                width={54}
                height={1.4}
                rx={0.7}
                className={GLOW}
                initial={false}
                animate={face.scan && loops ? { y: [23, 50, 23], opacity: 0.22 } : { opacity: 0 }}
                transition={face.scan && loops ? { y: loop(1.8), opacity: { duration: 0.3 } } : { duration: 0.3 }}
              />
            </g>
          </motion.g>

          {/* Face: cheeks, eyes and mouth, the front-most layer */}
          <motion.g style={{ x: faceX, y: faceY }}>
            <motion.g className="fill-caramel" style={{ opacity: cheeks }}>
              <ellipse cx={30} cy={45} rx={3.5} ry={2} />
              <ellipse cx={70} cy={45} rx={3.5} ry={2} />
            </motion.g>

            {/* Eyes: they follow the pointer, settle where the face says (up while thinking), and squint when happy */}
            <motion.g style={{ x: lookX, y: lookY }}>
              <motion.g initial={false} animate={face.gaze ?? { x: 0, y: 0 }}>
                <motion.g style={{ opacity: glow }} fill={`url(#${ids.glow})`}>
                  <ellipse cx={40} cy={36.5} rx={9} ry={10} />
                  <ellipse cx={60} cy={36.5} rx={9} ry={10} />
                </motion.g>
                <motion.g
                  style={{ ...at(50, 36.5), scale: eyeSize, scaleY: eyesScaleY, filter: "drop-shadow(0 0 2px rgba(255, 190, 120, 0.9))" }}
                  initial={false}
                  animate={{ opacity: face.eyes === "happy" ? 0 : 1 }}
                  transition={{ duration: 0.12 }}
                >
                  <motion.g style={{ ...at(40, 36.5), scale: leftEye, rotate: leftSlant }}>
                    <rect x={35} y={30} width={10} height={13} rx={5} className={GLOW} />
                    <motion.circle cx={42.5} cy={33.5} r={1.5} className="fill-white" style={{ x: glintX }} />
                  </motion.g>
                  <motion.g style={{ ...at(60, 36.5), scale: rightEye, rotate: eyeSlant }}>
                    <rect x={55} y={30} width={10} height={13} rx={5} className={GLOW} />
                    <motion.circle cx={62.5} cy={33.5} r={1.5} className="fill-white" style={{ x: glintX }} />
                  </motion.g>
                </motion.g>
                <motion.g
                  className={GLOW_STROKE}
                  strokeWidth={3}
                  fill="none"
                  style={{ filter: "drop-shadow(0 0 2px rgba(255, 190, 120, 0.9))" }}
                  initial={false}
                  animate={{ opacity: face.eyes === "happy" ? 1 : 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <path d="M35 39 Q40 32 45 39" />
                  <path d="M55 39 Q60 32 65 39" />
                </motion.g>
              </motion.g>
            </motion.g>

            {/* Mouth: a curve that morphs between moods, or moving while it speaks */}
            <motion.path
              className={GLOW_STROKE}
              strokeWidth={2}
              fill="none"
              initial={false}
              animate={{ d: mouthCurve ?? MOUTH_CURVES.smile, opacity: mouthCurve ? 1 : 0 }}
              transition={{ duration: 0.18 }}
            />
            <motion.rect
              x={46}
              y={44.5}
              width={8}
              height={5}
              rx={2.5}
              className={GLOW}
              style={{ ...at(50, 47), scaleY: mouthOpen }}
              initial={false}
              animate={{ opacity: face.mouth === "talk" ? 1 : 0 }}
              transition={{ duration: 0.12 }}
            />
            <motion.circle
              cx={50}
              cy={47}
              r={1.8}
              className={GLOW}
              initial={false}
              animate={{ opacity: face.mouth === "dot" ? 1 : 0 }}
              transition={{ duration: 0.12 }}
            />
            <motion.ellipse
              cx={50}
              cy={46.5}
              rx={3.2}
              ry={2.6}
              className={GLOW}
              initial={false}
              animate={{ opacity: face.mouth === "open" ? 1 : 0 }}
              transition={{ duration: 0.12 }}
            />
          </motion.g>
        </motion.g>
      </motion.g>
    </motion.svg>
  );

  if (variant === "head") return svg;

  return (
    <div className={cn("relative", className)}>
      {/* A contact shadow that shrinks as the robot rises, and an aura when it's engaged */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-[91.5%] left-[27%] h-[6.5%] w-[46%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(74_47_39/0.3),transparent)] dark:bg-[radial-gradient(closest-side,rgb(0_0_0/0.6),transparent)]"
        style={{ scaleX: shadowScale, opacity: shadowOpacity, x: shadowX }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-[2%] -top-[8%] h-[64%] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--caramel)_45%,transparent),transparent)]"
        style={{ opacity: aura }}
      />
      {svg}
    </div>
  );
}
