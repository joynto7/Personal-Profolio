"use client";

import type { EducationEntry } from "@prisma/client";
import { SectionHeader } from "@/components/scifi/section-header";
import { TimelineItem } from "@/components/sections/timeline-item";

export function Education({ entries, number }: { entries: EducationEntry[]; number: number }) {
  return (
    <section id="education" className="scroll-mt-24 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader number={number} title="Education" subtitle="Academic background." />

        {entries.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">Nothing to show here yet — check back soon.</p>
        ) : (
          <div className="mx-auto mt-10 max-w-4xl">
            {entries.map((entry, i) => (
              <TimelineItem
                key={entry.id}
                index={i}
                isLast={i === entries.length - 1}
                title={`${entry.degree} · ${entry.field}`}
                subtitle={entry.institution}
                period={`${entry.startYear} — ${entry.endYear}`}
                description={entry.description ?? undefined}
                bullets={entry.achievements}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
