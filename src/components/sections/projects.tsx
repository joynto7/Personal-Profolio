"use client";

import { useState, useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import type { Project } from "@prisma/client";
import { OtherProjectCard, ProjectCard } from "@/components/sections/project-card";
import { SectionHeader } from "@/components/scifi/section-header";
import { FEATURED_COUNT, KIND_LABELS, projectMeta, type ProjectKind } from "@/lib/project-icons";
import { cn } from "@/lib/utils";

const WIDE_QUERY = "(min-width: 1280px)";
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export function Projects({
  projects,
  caseStudyOverviews,
  githubUrl,
  number,
}: {
  projects: Project[];
  /** Case study overview by slug — the card summary for projects that have no description of their own. */
  caseStudyOverviews: Record<string, string>;
  githubUrl?: string;
  /** Section number for "Featured Work"; "Other Projects" takes the next one. */
  number: number;
}) {
  const [filter, setFilter] = useState<ProjectKind | "all">("all");
  // On the four-column layout the cards curve gently, like a wall of screens.
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_QUERY).matches, () => false);

  if (projects.length === 0) return null;

  const all = projects.map((project, i) => ({ project, number: i + 1, meta: projectMeta(project.slug, i) }));
  const kinds = (Object.keys(KIND_LABELS) as ProjectKind[]).filter((kind) => all.some((item) => item.meta.kind === kind));
  const visible = (item: (typeof all)[number]) => filter === "all" || item.meta.kind === filter;
  const featured = all.slice(0, FEATURED_COUNT).filter(visible);
  const others = all.slice(FEATURED_COUNT).filter(visible);
  const hasOthers = all.length > FEATURED_COUNT;
  const repositories = githubUrl ? `${githubUrl.replace(/\/$/, "")}?tab=repositories` : undefined;

  return (
    <section id="projects" className="scroll-mt-24 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader number={number} title="Featured Work" subtitle="Handpicked projects that showcase my skills and creativity.">
          {kinds.length > 1 && (
            <div role="group" aria-label="Filter projects" className="flex flex-wrap gap-1 rounded-full border border-caramel/25 bg-foreground/[0.03] p-1">
              {(["all", ...kinds] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={filter === kind}
                  onClick={() => setFilter(kind)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold transition",
                    filter === kind
                      ? "bg-linear-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_16px_-4px_rgba(34,211,238,0.9)]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {kind === "all" ? "All" : KIND_LABELS[kind]}
                </button>
              ))}
            </div>
          )}
        </SectionHeader>

        {featured.length > 0 ? (
          <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
            {featured.map((item, i) => (
              <ProjectCard
                key={item.project.slug}
                project={item.project}
                index={i}
                number={item.number}
                meta={item.meta}
                yaw={wide ? ((featured.length - 1) / 2 - i) * 6 : 0}
                summary={
                  item.project.description ??
                  (item.project.caseStudySlug ? caseStudyOverviews[item.project.caseStudySlug] : null)
                }
              />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-muted-foreground">No featured projects in this category.</p>
        )}

        {hasOthers && (
          <div className="mt-20">
            <SectionHeader number={number + 1} title="Other Projects" subtitle="More projects I've worked on.">
              {repositories && (
                <a
                  href={repositories}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-caramel"
                >
                  View all projects
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </a>
              )}
            </SectionHeader>
            {others.length > 0 ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {others.map((item, i) => (
                  <OtherProjectCard key={item.project.slug} project={item.project} index={i} meta={item.meta} />
                ))}
              </div>
            ) : (
              <p className="mt-8 text-center text-sm text-muted-foreground">No other projects in this category.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
