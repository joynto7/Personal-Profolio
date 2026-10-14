"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Star, Users } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import type { Project } from "@prisma/client";
import { Tilt } from "@/components/scifi/tilt";
import { TechBadge } from "@/components/scifi/tech-badge";
import { DEFAULT_PROJECT_ICON, PROJECT_ICONS, projectMeta } from "@/lib/project-icons";

/** Badges past this collapse into a "+N" chip so one long stack can't stretch its row. */
const MAX_TECH_BADGES = 4;

type Meta = ReturnType<typeof projectMeta>;

function detailsHref(project: Project) {
  return project.caseStudySlug
    ? `/case-studies/${project.caseStudySlug}`
    : `/projects/${project.slug}`;
}

/** What Nova, the AI guide, says when the card is clicked: name, tagline, then the summary's first sentence. */
function guideLine(project: Project, summary?: string | null) {
  const firstSentence = summary?.trim().split(/(?<=[.!?])\s+/)[0];
  const parts = [project.name, project.tagline, firstSentence].filter((part): part is string => Boolean(part));
  return `${parts.map((part) => part.trim().replace(/[.!?]$/, "")).join(". ")}.`;
}

function IconTile({ project, size }: { project: Project; size: "lg" | "sm" }) {
  const Icon = PROJECT_ICONS[project.slug] ?? DEFAULT_PROJECT_ICON;
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-xl text-white shadow-[0_0_20px_-4px_var(--sf-accent)] ${size === "lg" ? "size-12" : "size-11"}`}
      style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--sf-accent) 55%, #0b1022), var(--sf-accent))" }}
    >
      <span aria-hidden className="absolute inset-px rounded-[11px] border border-white/25" />
      <Icon className={size === "lg" ? "size-6" : "size-5"} />
    </span>
  );
}

/** Featured project: a holographic module on a lit pedestal, tilting toward the pointer. */
export function ProjectCard({
  project,
  index,
  number,
  summary,
  meta,
  yaw = 0,
}: {
  project: Project;
  index: number;
  number: number;
  summary?: string | null;
  meta: Meta;
  yaw?: number;
}) {
  const href = detailsHref(project);
  const tech = project.techStack.slice(0, MAX_TECH_BADGES);
  const hiddenTechCount = project.techStack.length - tech.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 46 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: "easeOut" }}
      data-guide={guideLine(project, summary)}
      className="flex flex-col"
      style={{ "--sf-accent": meta.accent } as CSSProperties}
    >
      <Tilt yaw={yaw} className="relative flex flex-1 flex-col">
        <article className="holo-card group/card relative flex flex-1 flex-col overflow-hidden rounded-[22px] p-5">
          <span aria-hidden className="holo-spot" />
          <span aria-hidden className="sf-sweep" style={{ "--sweep-delay": `${index * 1.8}s` } as CSSProperties} />

          <header className="relative flex items-start gap-3">
            <IconTile project={project} size="lg" />
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-lg leading-tight font-semibold text-foreground">{project.name}</h3>
              {project.tagline && (
                <p className="mt-1 line-clamp-2 text-xs leading-snug" style={{ color: "color-mix(in oklab, var(--sf-accent) 80%, var(--foreground))" }}>
                  {project.tagline}
                </p>
              )}
            </div>
            <span className="rounded-md border border-[color:var(--sf-accent)]/40 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
              {String(number).padStart(2, "0")}
            </span>
          </header>

          {(meta.category || index === 0 || project.caseStudySlug) && (
            <div className="relative mt-3 flex flex-wrap gap-1.5">
              {index === 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--sf-accent)]/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-foreground uppercase ring-1 ring-[color:var(--sf-accent)]/50">
                  <Star className="size-3 fill-current text-[color:var(--sf-accent)]" />
                  Featured
                </span>
              )}
              {meta.category && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-foreground/85 uppercase ring-1 ring-foreground/15">
                  {meta.category}
                </span>
              )}
              {project.caseStudySlug && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-foreground/85 uppercase ring-1 ring-foreground/15">
                  Case study
                </span>
              )}
            </div>
          )}

          {summary && <p className="relative mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{summary}</p>}

          <Link
            href={href}
            tabIndex={-1}
            aria-hidden
            className="relative mt-4 block aspect-[16/10] overflow-hidden rounded-xl border border-[color:var(--sf-accent)]/40 bg-[#050a1a] shadow-[0_0_24px_-10px_var(--sf-accent)]"
          >
            <Image
              src={project.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 92vw"
              className="object-cover object-top transition-transform duration-700 group-hover/card:scale-105"
            />
            <span aria-hidden className="holo-scanlines" />
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-[#050a1a]/70 to-transparent" />
          </Link>

          {tech.length > 0 && (
            <div className="relative mt-4 flex flex-wrap gap-1.5">
              {tech.map((name) => (
                <TechBadge key={name} name={name} />
              ))}
              {hiddenTechCount > 0 && (
                <span className="inline-flex items-center rounded-md border border-dashed border-foreground/20 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  +{hiddenTechCount}
                </span>
              )}
            </div>
          )}

          <div className="relative mt-auto flex flex-wrap items-center gap-2 pt-5">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-white shadow-[0_0_18px_-6px_var(--sf-accent)] transition hover:brightness-110"
                style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--sf-accent) 70%, #0b1022), var(--sf-accent))" }}
              >
                <ExternalLink className="size-3.5" />
                Live demo
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-foreground/20 bg-foreground/[0.04] px-3.5 text-xs font-semibold text-foreground transition hover:border-[color:var(--sf-accent)]"
              >
                <FaGithub className="size-3.5" />
                Source
              </a>
            )}
            <Link
              href={href}
              className="group/details inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-foreground/85 transition hover:text-[color:var(--sf-accent)]"
            >
              {project.caseStudySlug ? "Case study" : "Details"}
              <ArrowRight className="size-3.5 transition-transform group-hover/details:translate-x-0.5" />
            </Link>
          </div>

          {meta.team && (
            <p className="relative mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              Team of {meta.team}
            </p>
          )}
        </article>
        <div aria-hidden className="holo-pedestal" />
      </Tilt>
    </motion.div>
  );
}

/** Secondary project: a compact module with a lighter frame. */
export function OtherProjectCard({ project, index, meta }: { project: Project; index: number; meta: Meta }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      style={{ "--sf-accent": meta.accent } as CSSProperties}
    >
      <Link
        href={detailsHref(project)}
        data-guide={guideLine(project)}
        className="sf-glass group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl p-4 transition duration-300 hover:-translate-y-1 hover:border-[color:var(--sf-accent)]"
      >
        <span aria-hidden className="sf-sweep" style={{ "--sweep-delay": `${2 + index * 1.3}s` } as CSSProperties} />
        <IconTile project={project} size="sm" />
        <span className="relative min-w-0 flex-1">
          <span className="block truncate font-heading text-sm font-semibold text-foreground">{project.name}</span>
          {project.tagline && <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{project.tagline}</span>}
        </span>
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-foreground/20 text-[color:var(--sf-accent)] transition-transform group-hover:translate-x-1">
          <ArrowRight className="size-4" />
        </span>
      </Link>
    </motion.div>
  );
}
