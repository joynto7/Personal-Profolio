"use client";

import { motion } from "framer-motion";
import { experience } from "@/data/experience";
import { TimelineItem } from "@/components/sections/timeline-item";

export function Experience() {
  return (
    <section id="experience" className="scroll-mt-20 bg-background py-24">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            Experience
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            Where I&apos;ve Worked
          </h2>
        </motion.div>

        {experience.length === 0 ? (
          <p className="mt-14 text-center text-muted-foreground">
            Nothing to show here yet — check back soon.
          </p>
        ) : (
          <div className="mt-14">
            {experience.map((entry, i) => (
              <TimelineItem
                key={entry.company}
                index={i}
                isLast={i === experience.length - 1}
                title={entry.role}
                subtitle={entry.company}
                period={`${entry.startDate} — ${entry.endDate}`}
                description={entry.description}
                bullets={entry.highlights}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
