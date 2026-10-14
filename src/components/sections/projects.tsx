"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Project } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { OtherProjectCard, ProjectCard } from "@/components/sections/project-card";

/** The first projects (in admin order) get a full card; the rest drop to the compact "Other Projects" row. */
const FEATURED_COUNT = 4;

export function Projects({
  projects,
  caseStudyOverviews,
  githubUrl,
}: {
  projects: Project[];
  /** Case study overview by slug — the card summary for projects that have no description of their own. */
  caseStudyOverviews: Record<string, string>;
  githubUrl?: string;
}) {
  if (projects.length === 0) return null;

  const featured = projects.slice(0, FEATURED_COUNT);
  const others = projects.slice(FEATURED_COUNT);

  return (
    <section id="projects" className="relative scroll-mt-20 overflow-hidden bg-muted py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[32rem] rounded-full bg-caramel/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-3 text-sm font-semibold tracking-widest text-caramel uppercase">
              Projects
              <span aria-hidden className="h-0.5 w-8 rounded-full bg-caramel" />
            </span>
            <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
              Featured{" "}
              <span className="bg-linear-to-r from-mocha to-caramel bg-clip-text text-transparent dark:from-caramel dark:to-latte">
                Work
              </span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              A selection of projects that show how I think about product,
              architecture, and the details in between.
            </p>
          </div>

          {githubUrl && (
            <Button size="lg" variant="outline" className="self-start px-4 sm:self-auto" asChild>
              <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                More on GitHub
                <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-1" />
              </a>
            </Button>
          )}
        </motion.div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {featured.map((project, i) => (
            <ProjectCard
              key={project.slug}
              project={project}
              index={i}
              summary={
                project.description ??
                (project.caseStudySlug ? caseStudyOverviews[project.caseStudySlug] : null)
              }
              wide={featured.length % 2 === 1 && i === featured.length - 1}
            />
          ))}
        </div>

        {others.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mt-6 rounded-2xl border border-border bg-card/60 p-6"
          >
            <div className="border-l-2 border-caramel pl-3">
              <h3 className="font-heading text-xl font-medium text-foreground">
                Other Projects
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                More things I&apos;ve built along the way
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {others.map((project, i) => (
                <OtherProjectCard key={project.slug} project={project} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
