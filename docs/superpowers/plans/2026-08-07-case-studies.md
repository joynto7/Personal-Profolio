# Case Studies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/case-studies/[slug]` route with a deep-dive Club Connect case study, fix the existing `Project` placeholder-text bug it shares a mechanism with, and wire the Projects grid to link Club Connect to its case study instead of its thin project page.

**Architecture:** New `CaseStudy` type + data file (`src/data/case-studies.ts`) and a new route (`src/app/case-studies/[slug]/page.tsx`) that mirror the existing `Project` / `/projects/[slug]` pattern — same visual language, same static-generation approach, no new dependencies. The existing `Project` type gains a `caseStudySlug` field; when set, `/projects/[slug]` redirects to the matching case study instead of rendering.

**Tech Stack:** Next.js 16 App Router, TypeScript, existing `Badge`/`Button` UI components, `lucide-react` icons (already a dependency).

## Global Constraints

- No new dependencies (no MDX, no markdown parser, no test framework) — see [2026-08-07-case-studies-feature-design.md](../specs/2026-08-07-case-studies-feature-design.md).
- Reuse existing visual language exactly: `font-heading` section titles, `rounded-2xl` hero image frame, `bg-caramel` bullet dots, existing `Badge`/`Button` components.
- Optional fields render their section only when present — never an empty heading, never bracket placeholder text.
- No test runner exists in this repo. Verification per task is: `npx tsc --noEmit` (typecheck) + a manual browser pass, not automated tests.
- This plan covers Case Studies only. Blog and the admin-dashboard idea are separate, not-yet-designed sub-projects — out of scope here.

---

### Task 1: Clean up `Project` type and placeholder content

**Files:**
- Modify: `src/data/projects.ts` (full file)

**Interfaces:**
- Produces: `Project.tagline?: string`, `Project.techStack?: string[]`, `Project.description?: string`, `Project.challenges?: string[]`, `Project.futureImprovements?: string[]`, `Project.caseStudySlug?: string` — all consumed by Task 2 and Task 3.

- [ ] **Step 1: Rewrite `src/data/projects.ts`**

```ts
export type Project = {
  slug: string;
  name: string;
  tagline?: string;
  image: string;
  techStack?: string[];
  description?: string;
  liveUrl: string;
  githubUrl: string;
  challenges?: string[];
  futureImprovements?: string[];
  caseStudySlug?: string;
};

export const projects: Project[] = [
  {
    slug: "food-delivery-webpage",
    name: "Food Delivery Webpage",
    tagline: "A food delivery web page built for Penguin, an independent club",
    image: "/images/projects/foodhub.svg",
    description:
      "A food delivery web page built while working with Penguin, an independent club that runs projects across different fields.",
    liveUrl: "#",
    githubUrl: "#",
  },
  {
    slug: "club-connect",
    name: "Club Connect",
    tagline:
      "A full-stack platform for managing university clubs, events, and student engagement",
    image: "/images/projects/taskflow.svg",
    techStack: ["Next.js", "Express", "TypeScript", "Prisma", "PostgreSQL"],
    liveUrl: "#",
    githubUrl: "#",
    caseStudySlug: "club-connect",
  },
  {
    slug: "guitar-selling-webpage",
    name: "Guitar Selling Webpage",
    tagline: "A marketplace web page for buying and selling guitars",
    image: "/images/projects/devnotes.svg",
    description:
      "A marketplace-style web page for buying and selling guitars, built for Penguin club.",
    liveUrl: "#",
    githubUrl: "#",
  },
  {
    slug: "agrosync",
    name: "Agrosync",
    image: "/images/projects/foodhub.svg",
    liveUrl: "#",
    githubUrl: "#",
  },
  {
    slug: "fixitnow",
    name: "Fixitnow",
    image: "/images/projects/taskflow.svg",
    liveUrl: "#",
    githubUrl: "#",
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
```

Notes on this rewrite:
- `food-delivery-webpage` and `guitar-selling-webpage`: kept their real tagline and description, dropped the bracket clause and the three fields that were 100% placeholder (`techStack`, `challenges`, `futureImprovements`).
- `club-connect`: tagline and `techStack` updated to real facts from its README; `description`/`challenges`/`futureImprovements` dropped because this entry now redirects to its case study (Task 3) — writing content that's immediately bypassed would be dead weight. `caseStudySlug` added.
- `agrosync` / `fixitnow`: every optional field dropped — there's no real content for these yet, so the card shows just name and image rather than bracket placeholders. Fill in the same fields used above once there's real content.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this step will surface every call site that assumed these fields were always present — Tasks 2 and 3 fix those).

- [ ] **Step 3: Commit**

```bash
git add src/data/projects.ts
git commit -m "Drop placeholder project content, add caseStudySlug field"
```

---

### Task 2: Guard `ProjectCard` for optional fields and add the Case Study badge/link

**Files:**
- Modify: `src/components/sections/project-card.tsx` (full file)

**Interfaces:**
- Consumes: `Project` type from Task 1 (`tagline?`, `techStack?`, `caseStudySlug?`).

- [ ] **Step 1: Rewrite `src/components/sections/project-card.tsx`**

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/data/projects";

export function ProjectCard({ project, index }: { project: Project; index: number }) {
  const href = project.caseStudySlug
    ? `/case-studies/${project.caseStudySlug}`
    : `/projects/${project.slug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={project.image}
          alt={project.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {project.caseStudySlug && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
            Case Study
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-heading text-xl font-medium text-foreground">
          {project.name}
        </h3>
        {project.tagline && (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {project.tagline}
          </p>
        )}

        {project.techStack && project.techStack.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.techStack.slice(0, 4).map((tech) => (
              <Badge key={tech} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
        )}

        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-caramel"
        >
          View Details
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </motion.div>
  );
}
```

Note: when `tagline` is absent, the card loses `flex-1` on that paragraph — its parent `<div className="flex flex-1 flex-col ...">` on the content wrapper still pushes "View Details" to the bottom correctly via its own `flex-1`, so removing the tagline paragraph doesn't collapse the card's layout.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Start the dev server, open the homepage, confirm:
- Agrosync and Fixitnow cards show name + image only, no bracket text, no empty tag row
- Club Connect card shows the "Case Study" badge on its image and its tagline/tech badges from Task 1
- Food Delivery and Guitar cards look the same as before (they still have real tagline/description)

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/project-card.tsx
git commit -m "Guard ProjectCard for optional fields, add Case Study badge"
```

---

### Task 3: Redirect `/projects/[slug]` to the case study when one exists, guard remaining optional sections

**Files:**
- Modify: `src/app/projects/[slug]/page.tsx` (full file)

**Interfaces:**
- Consumes: `Project` type from Task 1.

- [ ] **Step 1: Rewrite `src/app/projects/[slug]/page.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, Lightbulb, Puzzle } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projects, getProjectBySlug } from "@/data/projects";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.tagline ?? project.name,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) notFound();
  if (project.caseStudySlug) redirect(`/case-studies/${project.caseStudySlug}`);

  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/#projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>

      <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl border border-border shadow-sm">
        <Image
          src={project.image}
          alt={project.name}
          fill
          sizes="(min-width: 1024px) 56rem, 100vw"
          className="object-cover"
          priority
        />
      </div>

      <h1 className="mt-8 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        {project.name}
      </h1>
      {project.tagline && (
        <p className="mt-2 text-lg text-muted-foreground">{project.tagline}</p>
      )}

      {project.techStack && project.techStack.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {project.techStack.map((tech) => (
            <Badge key={tech} variant="secondary">
              {tech}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            Live Project
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
            <FaGithub className="size-4" />
            GitHub Repo
          </a>
        </Button>
      </div>

      {project.description && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-medium text-foreground">
            About This Project
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        </section>
      )}

      {((project.challenges?.length ?? 0) > 0 ||
        (project.futureImprovements?.length ?? 0) > 0) && (
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {project.challenges && project.challenges.length > 0 && (
            <section>
              <div className="flex items-center gap-2">
                <Puzzle className="size-5 text-primary" />
                <h2 className="font-heading text-xl font-medium text-foreground">
                  Challenges Faced
                </h2>
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {project.challenges.map((challenge) => (
                  <li
                    key={challenge}
                    className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
                    {challenge}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {project.futureImprovements && project.futureImprovements.length > 0 && (
            <section>
              <div className="flex items-center gap-2">
                <Lightbulb className="size-5 text-primary" />
                <h2 className="font-heading text-xl font-medium text-foreground">
                  Future Improvements
                </h2>
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {project.futureImprovements.map((improvement) => (
                  <li
                    key={improvement}
                    className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
                    {improvement}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

With the dev server running:
- Visit `/projects/club-connect` → should redirect to `/case-studies/club-connect` (will 404 until Task 5 lands — expected at this point in the plan, confirm the redirect fires rather than confirming the destination renders)
- Visit `/projects/agrosync` → renders with just name/image/hero, no empty sections, no bracket text
- Visit `/projects/does-not-exist` → 404

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/[slug]/page.tsx
git commit -m "Redirect projects with a case study, guard optional sections"
```

---

### Task 4: Create the `CaseStudy` data file

**Files:**
- Create: `src/data/case-studies.ts`

**Interfaces:**
- Produces: `CaseStudy` type, `caseStudies` array, `getCaseStudyBySlug(slug: string)` — consumed by Task 5.

- [ ] **Step 1: Create `src/data/case-studies.ts`**

```ts
export type CaseStudy = {
  slug: string;
  name: string;
  tagline: string;
  image: string;
  techStack: string[];
  liveUrl?: string;
  repoStatus: "public" | "private";
  githubUrl?: string;
  overview: string;
  architecture: string;
  systemDesign: string;
  databaseDesign?: string;
  security?: string;
  challenges: string[];
  lessonsLearned?: string[];
  futureImprovements: string[];
  screenshots?: { src: string; caption: string }[];
  codeSnippets?: { title: string; language: string; code: string }[];
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "club-connect",
    name: "Club Connect",
    tagline:
      "A full-stack platform for managing university clubs, events, and student engagement",
    image: "/images/projects/taskflow.svg",
    techStack: [
      "Next.js 16",
      "Express 5",
      "TypeScript",
      "Prisma 7",
      "PostgreSQL",
      "Socket.io",
      "Tailwind CSS v4",
    ],
    repoStatus: "private",
    overview:
      "Club Connect covers the full lifecycle of campus club activity for three kinds of users. Students discover and join clubs, RSVP to events (including paid ones), book venues and equipment, follow clubs, and get real-time notifications. Club officers manage membership, run events with QR check-in, post announcements, and track a club budget. Admins moderate content, manage users and clubs, and review a full audit log.",
    architecture:
      "The app is split into a Next.js 16 (App Router) frontend and an Express 5 (ESM) backend, each deployed independently — the frontend on Vercel, the backend on Render. Prisma 7 talks to a PostgreSQL database hosted on Neon. File uploads go to Cloudflare R2, transactional email through Resend, and real-time features run over Socket.io between the two services. A GitHub Actions workflow type-checks and builds both apps on every push to main, then runs database migrations and deploys on success.",
    systemDesign:
      "Three roles share the same data model with different permissions: students browse and join, officers administer a club's membership/events/budget, and admins operate across every club. Events carry their own lifecycle — an approval workflow, RSVP with waitlisting, QR-code check-in, and post-event feedback with AI sentiment analysis. Venue and equipment bookings run through a separate conflict-detection step so two events can't double-book the same resource.",
    security:
      "Auth uses JWT access/refresh tokens alongside Google OAuth, email verification, password reset, and optional TOTP-based two-factor authentication. Admin actions are tracked in a persistent audit log rather than trusted blindly.",
    challenges: [
      "Detecting scheduling conflicts for venue and equipment bookings so two events can't reserve the same resource at the same time",
      "Keeping live notifications, attendance counters, and check-in state in sync across connected clients over Socket.io",
      "Integrating paid event ticketing through SSLCommerz across multiple local payment methods (bKash, Nagad, Rocket, cards)",
    ],
    futureImprovements: [
      "Publish the OpenAPI docs that already exist in development for external consumption",
      "Add automated tests around the booking-conflict and payment flows",
    ],
  },
];

export function getCaseStudyBySlug(slug: string) {
  return caseStudies.find((caseStudy) => caseStudy.slug === slug);
}
```

`databaseDesign`, `lessonsLearned`, `screenshots`, `codeSnippets`, and `liveUrl` are left out deliberately — real Prisma model names, a live URL, screenshots, and personal lessons-learned reflections weren't available when this plan was written (see "Open content items" in the design spec). Add them here whenever they're ready; each renders automatically once present (Task 5).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/case-studies.ts
git commit -m "Add CaseStudy data model and Club Connect entry"
```

---

### Task 5: Create the case study page

**Files:**
- Create: `src/app/case-studies/[slug]/page.tsx`

**Interfaces:**
- Consumes: `CaseStudy`, `caseStudies`, `getCaseStudyBySlug` from Task 4.

- [ ] **Step 1: Create `src/app/case-studies/[slug]/page.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Boxes,
  Database,
  ExternalLink,
  Lightbulb,
  Lock,
  Puzzle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { caseStudies, getCaseStudyBySlug } from "@/data/case-studies";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return caseStudies.map((caseStudy) => ({ slug: caseStudy.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);
  if (!caseStudy) return {};
  return {
    title: `${caseStudy.name} — Case Study`,
    description: caseStudy.tagline,
  };
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);

  if (!caseStudy) notFound();

  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/#projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>

      <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl border border-border shadow-sm">
        <Image
          src={caseStudy.image}
          alt={caseStudy.name}
          fill
          sizes="(min-width: 1024px) 56rem, 100vw"
          className="object-cover"
          priority
        />
      </div>

      <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-primary">
        Case Study
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        {caseStudy.name}
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">{caseStudy.tagline}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {caseStudy.techStack.map((tech) => (
          <Badge key={tech} variant="secondary">
            {tech}
          </Badge>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {caseStudy.liveUrl && (
          <Button asChild>
            <a href={caseStudy.liveUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Live Demo
            </a>
          </Button>
        )}
        {caseStudy.repoStatus === "public" && caseStudy.githubUrl ? (
          <Button variant="outline" asChild>
            <a href={caseStudy.githubUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              GitHub Repo
            </a>
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-4" />
            Source is private
          </span>
        )}
      </div>

      <section className="mt-12">
        <h2 className="font-heading text-xl font-medium text-foreground">Overview</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">{caseStudy.overview}</p>
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-2">
          <Boxes className="size-5 text-primary" />
          <h2 className="font-heading text-xl font-medium text-foreground">
            Architecture & Tech Stack
          </h2>
        </div>
        <p className="mt-3 leading-relaxed text-muted-foreground">{caseStudy.architecture}</p>
      </section>

      <section className="mt-12">
        <h2 className="font-heading text-xl font-medium text-foreground">System Design</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">{caseStudy.systemDesign}</p>
      </section>

      {caseStudy.databaseDesign && (
        <section className="mt-12">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium text-foreground">
              Database Design
            </h2>
          </div>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {caseStudy.databaseDesign}
          </p>
        </section>
      )}

      {caseStudy.security && (
        <section className="mt-12">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium text-foreground">Security</h2>
          </div>
          <p className="mt-3 leading-relaxed text-muted-foreground">{caseStudy.security}</p>
        </section>
      )}

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <section>
          <div className="flex items-center gap-2">
            <Puzzle className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium text-foreground">
              Challenges & Decisions
            </h2>
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {caseStudy.challenges.map((challenge) => (
              <li
                key={challenge}
                className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
                {challenge}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-center gap-2">
            <Lightbulb className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium text-foreground">
              Future Improvements
            </h2>
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {caseStudy.futureImprovements.map((improvement) => (
              <li
                key={improvement}
                className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
                {improvement}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {caseStudy.lessonsLearned && caseStudy.lessonsLearned.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-medium text-foreground">Lessons Learned</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {caseStudy.lessonsLearned.map((lesson) => (
              <li
                key={lesson}
                className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
                {lesson}
              </li>
            ))}
          </ul>
        </section>
      )}

      {caseStudy.screenshots && caseStudy.screenshots.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-medium text-foreground">Screenshots</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {caseStudy.screenshots.map((shot) => (
              <figure key={shot.src}>
                <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
                  <Image src={shot.src} alt={shot.caption} fill className="object-cover" />
                </div>
                <figcaption className="mt-2 text-sm text-muted-foreground">
                  {shot.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {caseStudy.codeSnippets && caseStudy.codeSnippets.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-medium text-foreground">Code Snippets</h2>
          <div className="mt-4 flex flex-col gap-6">
            {caseStudy.codeSnippets.map((snippet) => (
              <div key={snippet.title}>
                <p className="mb-2 text-sm font-medium text-foreground">
                  {snippet.title}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {snippet.language}
                  </span>
                </p>
                <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 text-sm">
                  <code>{snippet.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/case-studies/[slug]/page.tsx
git commit -m "Add case study page template"
```

---

### Task 6: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: succeeds, with `/case-studies/[slug]` and `/projects/[slug]` both listed among the generated routes (no build errors, no missing-param warnings).

- [ ] **Step 2: Manual browser pass**

With the dev server running, check:
- `/` — Projects grid shows 5 cards; Club Connect has the "Case Study" badge; Agrosync/Fixitnow show no bracket text and no empty tag rows
- `/case-studies/club-connect` — renders Overview, Architecture, System Design, Security, Challenges & Decisions, Future Improvements; does **not** render Database Design, Lessons Learned, Screenshots, or Code Snippets (all omitted in the data); shows "Source is private" instead of a GitHub button; shows no Live Demo button (no `liveUrl` set yet)
- `/case-studies/does-not-exist` — 404
- `/projects/club-connect` — redirects to `/case-studies/club-connect`
- `/projects/agrosync` and `/projects/fixitnow` — render with just name/hero/CTA buttons, no empty sections
- `/projects/does-not-exist` — 404

- [ ] **Step 3: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "Fix issues found in Case Studies verification pass"
```

(Skip this step if verification passed with no changes.)
