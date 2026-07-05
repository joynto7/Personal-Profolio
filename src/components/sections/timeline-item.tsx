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
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative pl-10"
    >
      {!isLast && (
        <span className="absolute top-2 left-[7px] h-full w-px bg-border" />
      )}
      <span className="absolute top-1.5 left-0 flex size-3.5 items-center justify-center rounded-full border-2 border-caramel bg-background" />

      <div className="pb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-heading text-lg font-medium text-foreground">
            {title}
          </h3>
          <span className="text-sm font-medium text-caramel">{period}</span>
        </div>
        <p className="mt-0.5 text-sm font-medium text-muted-foreground">
          {subtitle}
        </p>
        {description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {bullets && bullets.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 size-1 shrink-0 rounded-full bg-caramel" />
                {bullet}
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
