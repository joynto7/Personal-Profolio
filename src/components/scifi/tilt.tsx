"use client";

import { useEffect, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

/**
 * Restrained 3D tilt that follows the mouse, plus `--mx`/`--my` CSS variables (pointer
 * position in %) for a spotlight. `yaw` is a resting rotation, e.g. to curve a row of cards.
 * Touch and reduced-motion users get a still card.
 */
export function Tilt({
  children,
  className,
  style,
  max = 7,
  yaw = 0,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  max?: number;
  yaw?: number;
}) {
  const reduceMotion = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const resting = useMotionValue(yaw);
  const spring = { stiffness: 170, damping: 18, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const tilt = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const rotateY = useTransform(() => tilt.get() + resting.get());

  useEffect(() => {
    resting.set(yaw);
  }, [resting, yaw]);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    px.set(x);
    py.set(y);
    event.currentTarget.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    event.currentTarget.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  };

  const onPointerLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      className={className}
      style={{
        ...style,
        rotateX: reduceMotion ? 0 : rotateX,
        rotateY: reduceMotion ? yaw : rotateY,
        transformPerspective: 1100,
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </motion.div>
  );
}
