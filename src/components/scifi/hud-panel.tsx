import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Chamfered holographic frame: a gradient edge with a soft glow around a glass fill
 * (the `.hud*` rules in globals.css). `accent` is any CSS color; it tints the edge,
 * glow and the top of the glass.
 */
export function HudPanel({
  children,
  className,
  accent,
  cut = 18,
  ticks = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
  cut?: number;
  ticks?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("hud", className)}
      style={{ "--cut": `${cut}px`, ...(accent ? { "--sf-accent": accent } : {}), ...style } as CSSProperties}
    >
      <span aria-hidden className="hud-glow">
        <span className="hud-edge" />
      </span>
      <span aria-hidden className="hud-fill" />
      {ticks && <span aria-hidden className="hud-ticks" />}
      <div className="relative">{children}</div>
    </div>
  );
}
