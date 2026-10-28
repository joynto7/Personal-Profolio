"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import type { Project } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PROJECT_ICON,
  PROJECT_ICONS,
  TECH_ICONS,
  techIconKey,
} from "@/lib/project-icons";
import { cn } from "@/lib/utils";

/** Chips past this collapse into a "+N" pill so one long stack can't stretch its whole grid row. */
const MAX_TECH_CHIPS = 6;

function detailsHref(project: Project) {
  return project.caseStudySlug
    ? `/case-studies/${project.caseStudySlug}`
    : `/projects/${project.slug}`;
}

export function ProjectCard({
  project,
  index,
  summary,
  wide = false,
}: {
  project: Project;
  index: number;
  summary?: string | null;
  /** Spans both grid columns — used for the last card when the featured count is odd. */
  wide?: boolean;
}) {
  const href = detailsHref(project);
  const Icon = PROJECT_ICONS[project.slug] ?? DEFAULT_PROJECT_ICON;
  const tech = project.techStack.slice(0, MAX_TECH_CHIPS);
  const hiddenTechCount = project.techStack.length - tech.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      data-robot="card"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-caramel/40 hover:shadow-lg",
        wide && "lg:col-span-2"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 size-64 rounded-full bg-caramel/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-caramel/25 bg-caramel/10 text-caramel">
              <Icon className="size-6" />
            </span>
            <div className="min-w-0">
              <h3 className="font-heading text-xl font-medium text-foreground">
                {project.name}
              </h3>
              {project.tagline && (
                <p className="mt-1 line-clamp-2 text-sm font-medium text-mocha dark:text-caramel">
                  {project.tagline}
                </p>
              )}
            </div>
          </div>

          {summary && (
            <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {summary}
            </p>
          )}
        </div>

        <div
          className={cn(
            "relative order-first aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-border sm:order-none sm:aspect-4/3 sm:w-52 lg:w-40 xl:w-44",
            wide && "lg:w-64 xl:w-72"
          )}
        >
          <Image
            src={project.imageUrl}
            alt={project.name}
            fill
            sizes={wide ? "(min-width: 1024px) 18rem, (min-width: 640px) 13rem, 100vw" : "(min-width: 640px) 13rem, 100vw"}
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
          {project.caseStudySlug && (
            <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-semibold text-primary-foreground shadow-sm">
              Case Study
            </span>
          )}
        </div>
      </div>

      {tech.length > 0 && (
        <ul className="relative mt-5 flex flex-wrap gap-2">
          {tech.map((name) => {
            const iconKey = techIconKey(name);
            const TechIcon = iconKey ? TECH_ICONS[iconKey] : undefined;
            return (
              <li
                key={name}
                title={name}
                className="inline-flex max-w-48 items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1 text-xs font-medium text-foreground/80"
              >
                {TechIcon ? (
                  <TechIcon className="size-3.5 shrink-0 text-caramel" />
                ) : (
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-caramel" />
                )}
                <span className="truncate">{name}</span>
              </li>
            );
          })}
          {hiddenTechCount > 0 && (
            <li className="inline-flex items-center rounded-lg border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
              +{hiddenTechCount}
            </li>
          )}
        </ul>
      )}

      <div className="relative mt-auto flex flex-wrap gap-3 pt-6">
        {project.liveUrl && (
          <Button size="lg" className="px-4" data-robot="live" asChild>
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Live demo
            </a>
          </Button>
        )}
        {project.githubUrl && (
          <Button
            size="lg"
            variant={project.liveUrl ? "outline" : "default"}
            className="px-4"
            data-robot="github"
            asChild
          >
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
              <FaGithub className="size-4" />
              Source
            </a>
          </Button>
        )}
        <Button
          size="lg"
          variant={project.liveUrl || project.githubUrl ? "outline" : "default"}
          className="px-4"
          data-robot="details"
          asChild
        >
          <Link href={href}>
            View Details
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

export function OtherProjectCard({ project, index }: { project: Project; index: number }) {
  const Icon = PROJECT_ICONS[project.slug] ?? DEFAULT_PROJECT_ICON;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <Link
        href={detailsHref(project)}
        data-robot="details"
        className="flex h-full items-center gap-3 rounded-xl border border-border bg-background/60 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-caramel/40 hover:shadow-lg"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-caramel/25 bg-caramel/10 text-caramel">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground">{project.name}</span>
          {project.tagline && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {project.tagline}
            </span>
          )}
        </span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform group-hover:translate-x-1">
          <ArrowRight className="size-3.5" />
        </span>
      </Link>
    </motion.div>
  );
}
