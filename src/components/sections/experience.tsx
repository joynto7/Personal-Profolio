"use client";

import type { ExperienceEntry } from "@prisma/client";
import { SectionHeader } from "@/components/scifi/section-header";
import { TimelineItem } from "@/components/sections/timeline-item";

export function Experience({ entries, number }: { entries: ExperienceEntry[]; number: number }) {
  return (
    <section id="experience" className="scroll-mt-24 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader number={number} title="Experience" subtitle="Where I've built real things with real teams." />

        {entries.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">Nothing to show here yet — check back soon.</p>
        ) : (
          <div className="mx-auto mt-10 max-w-4xl">
            {entries.map((entry, i) => (
              <TimelineItem
                key={entry.id}
                index={i}
                isLast={i === entries.length - 1}
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
