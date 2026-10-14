"use client";

import { motion } from "framer-motion";

export type TimelineItemProps = {
  title: string;
  subtitle: string;
  period: string;
  description?: string;
  bullets?: string[];
  index: number;
  isLast: boolean;
};

export function TimelineItem({
  title,
  subtitle,
  period,
  description,
  bullets,
  index,
  isLast,
}: TimelineItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative pl-10 sm:pl-12"
    >
      {!isLast && (
        <span className="absolute top-4 left-[9px] h-full w-px bg-linear-to-b from-caramel/70 via-mocha/40 to-transparent" />
      )}
      <span className="absolute top-2 left-0 flex size-5 items-center justify-center rounded-full border border-caramel bg-background shadow-[0_0_14px_-2px_var(--caramel)]">
        <span className="size-2 rounded-full bg-caramel motion-safe:animate-[sf-pulse_2.6s_ease-in-out_infinite]" />
      </span>

      <div className="pb-8">
        <div className="sf-glass rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
            <span className="sf-label text-caramel">{period}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-foreground/75">{subtitle}</p>
          {description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>}
          {bullets && bullets.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rotate-45 bg-caramel shadow-[0_0_6px_var(--caramel)]" />
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}
