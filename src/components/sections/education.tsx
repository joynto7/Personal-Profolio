"use client";

import { motion } from "framer-motion";
import { education } from "@/data/education";
import { TimelineItem } from "@/components/sections/timeline-item";

export function Education() {
  return (
    <section id="education" className="scroll-mt-20 bg-muted py-24">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            Education
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            Academic Background
          </h2>
        </motion.div>

        <div className="mt-14">
          {education.map((entry, i) => (
            <TimelineItem
              key={entry.institution}
              index={i}
              isLast={i === education.length - 1}
              title={`${entry.degree} · ${entry.field}`}
              subtitle={entry.institution}
              period={`${entry.startYear} — ${entry.endYear}`}
              description={entry.description}
              bullets={entry.achievements}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
