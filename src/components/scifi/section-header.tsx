"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { HudPanel } from "@/components/scifi/hud-panel";

/** Numbered HUD bar that opens each section ("01 Featured Work"), with room for controls on the right. */
export function SectionHeader({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <HudPanel cut={22} className="px-5 py-5 sm:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="relative flex size-12 shrink-0 items-center justify-center sm:size-14">
              <span className="absolute inset-0 rounded-full border border-caramel/60 shadow-[0_0_18px_-4px_var(--caramel)]" />
              <span className="absolute inset-1.5 rounded-full border border-dashed border-caramel/35 motion-safe:animate-[sf-spin_18s_linear_infinite]" />
              <span className="font-mono text-base font-semibold text-foreground">
                {String(number).padStart(2, "0")}
              </span>
            </span>
            <div>
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h2>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
            </div>
          </div>
          {children}
        </div>
      </HudPanel>
    </motion.div>
  );
}
