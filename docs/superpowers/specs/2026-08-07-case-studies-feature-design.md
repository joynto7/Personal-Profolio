# Case Studies feature — design

**Status:** Approved, ready for implementation plan
**Date:** 2026-08-07
**Scope:** First of two sub-projects (Case Studies, then Blog as a separate follow-up spec)

## Context

The portfolio is a single-page Next.js App Router site (`src/app/page.tsx`) that
composes section components (`Hero`, `About`, `Skills`, `Education`, `Experience`,
`Projects`, `Contact`) over anchor-based nav (`/#projects`, etc.). Content lives in
plain TypeScript data files under `src/data/` (`education.ts`, `experience.ts`,
`projects.ts`, `profile.ts`). There is one existing dynamic route,
`src/app/projects/[slug]/page.tsx`, which renders a light project detail page:
hero image, tag badges, live/GitHub CTA buttons, a description, and a two-column
"Challenges Faced" / "Future Improvements" grid.

The original ask was much larger: add both a full technical Blog and an
enterprise-style Case Studies system (Problem Statement, Business Goals, User
Research, System Design, Database Design, API Design, Security, Performance,
Lessons Learned, etc.), restructure the whole site's information architecture,
and add blog infrastructure (search, tags, RSS, reading progress, TOC).

That was scoped down after review: the site currently has three "projects," all
with placeholder content (`[Add tech stack]`, `[Add a description]`), and no
markdown/MDX tooling installed. Building full blog infrastructure (tags, search,
RSS) before a single post exists, or forcing an 18-section enterprise template
onto a simple club webpage, would ship scaffolding instead of a finished feature.

Decomposition: **Blog** and **Case Studies** are independent subsystems with
different infrastructure needs (Case Studies extends the existing
project-detail pattern with zero new dependencies; Blog needs a new content
pipeline). This spec covers **Case Studies only**. Blog gets its own spec next.

## Target content

Of the three existing "projects," only **Club Connect** has real technical
depth to write about honestly — it's a full-stack platform (Next.js 16 +
Express 5 + Prisma 7 + PostgreSQL), with JWT/OAuth/2FA auth, Socket.io
real-time features, SSLCommerz paid ticketing, Claude-powered AI features,
role-based access (student/officer/admin), CI/CD via GitHub Actions, and a
multi-service deployment (Vercel, Render, Neon, Cloudflare R2, Resend).

The other two ("Food Delivery Webpage", "Guitar Selling Webpage") stay as
lightweight `Project` cards — no case-study treatment yet, no template forced
onto them.

**Links:** Club Connect has a live deployed URL but the source repository is
private ("Private project — all rights reserved" per its README). The case
study links to the live demo; it does **not** link to GitHub, and shows a
"source is private" note in that CTA's place instead of a dead or misleading
link.

## Decisions

1. **Separate route, not a bolt-on.** Rejected extending the existing
   `Project` type with optional deep-dive fields (`architecture`,
   `databaseSchema`, `security`, etc.) — that turns one type and one page
   template into a pile of conditional branches serving two very different
   content shapes, and gets worse with every future case study. Case Studies
   gets its own data shape and its own route: `src/data/case-studies.ts` +
   `src/app/case-studies/[slug]/page.tsx`.
2. **Plain TypeScript data, not MDX/markdown.** Rejected introducing a
   markdown/MDX content pipeline now — that's real infrastructure to install
   for exactly one entry. The existing codebase pattern for content is typed
   TS data files (`education.ts`, `experience.ts`, `projects.ts`); Case
   Studies follows the same pattern for consistency. When Blog is designed,
   it's worth revisiting whether Case Studies should move onto a shared
   markdown pipeline — that's a real reuse case once it exists, not a
   premature one now.
3. **No new homepage section yet.** A dedicated "Case Studies" section on the
   homepage with a single entry would look sparse. Instead, the Club Connect
   card inside the existing `Projects` grid gets a "Case Study" badge, and its
   "View Details" link points to `/case-studies/club-connect` instead of
   `/projects/club-connect`. Revisit a dedicated homepage section once there
   are 2–3 case studies.
4. **No nav change yet.** Reached via the Projects grid card, same as today's
   project pages. Add a nav entry only if/when Case Studies gets its own
   homepage section.

## Data model

`src/data/case-studies.ts`:

```ts
export type CaseStudy = {
  slug: string;
  name: string;
  tagline: string;
  image: string;
  techStack: string[];
  liveUrl: string;
  repoStatus: "public" | "private";
  githubUrl?: string; // only used when repoStatus === "public"
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

export const caseStudies: CaseStudy[] = [ /* club-connect entry */ ];
export function getCaseStudyBySlug(slug: string) { ... }
```

Optional fields (`databaseDesign`, `security`, `lessonsLearned`, `screenshots`,
`codeSnippets`) render their section **only when present** — no section
appears at all if the field is empty, rather than rendering an empty
heading or bracket placeholder.

## Route & components

`src/app/case-studies/[slug]/page.tsx` mirrors
`src/app/projects/[slug]/page.tsx` structurally:

- `generateStaticParams()` from `caseStudies`
- `generateMetadata()` per entry
- `notFound()` for unknown slugs
- Same visual language: `font-heading` headings, `rounded-2xl` hero image
  frame, `bg-caramel` bullet dots, existing `Badge` and `Button` components
- Reuses the existing "Challenges Faced" / "Future Improvements" two-column
  list pattern; adds a third card for "Lessons Learned" when present

No new components needed beyond the page itself — everything else (Badge,
Button, section/list patterns) is reused from what already exists.

**Content sections, in order:**

1. Hero — image, name, tagline, tech badges, Live Demo button, "source is
   private" note in place of a GitHub link
2. Overview — what it does, who it's for, the problem it solves (folds in
   what the original spec called Problem Statement + Business Goals; no
   separate User Research section, since none was conducted — staying honest
   about that rather than fabricating a research process)
3. Architecture & Tech Stack — frontend/backend/infra breakdown
4. System Design — the three roles (student/officer/admin) and the event
   lifecycle / real-time flow
5. Database Design — key Prisma models & relationships
6. Security — JWT refresh tokens, 2FA, OAuth, audit log
7. Challenges & Decisions — real-time sync, payment integration, booking
   conflict detection
8. Lessons Learned & Future Improvements
9. Screenshots / Code Snippets — optional galleries

Dropped from the original 18-section wishlist as not honestly fillable for
this project: User Research (no formal research done), Business Goals (folded
into Overview), API Design as its own section (mentioned within Architecture
instead — the backend already has OpenAPI docs, no need to duplicate them),
Performance Optimizations and Development Process as dedicated sections
(folded into Architecture unless real specifics surface during writing).

## Related fix (same underlying issue)

The live site currently renders literal placeholder text (`[Add tech stack]`,
`[Add a description...]`) on the existing light project pages — confirmed via
a live browser check during an earlier session, and visible on both the
homepage `ProjectCard` grid (`project.techStack` is rendered directly, no
guard) and the `/projects/[slug]` detail page.

These fields are always truthy today (they hold a placeholder *string*, not
an empty value), so a plain `if (field)` guard won't hide them — the fix has
to remove the placeholder strings themselves, not just add a conditional.
Concretely: `techStack`, `description`, `challenges`, and `futureImprovements`
on the `Project` type become optional; the bracket-placeholder values are
deleted from the three existing entries in `projects.ts` (left `undefined`
until real content exists); `ProjectCard` and `/projects/[slug]/page.tsx` skip
rendering the tech-badge row / description section / challenges-and-improvements
grid when the corresponding field is absent. Same mechanism the new
`CaseStudy` optional fields already use — same file family, no scope creep.

## Data flow & error handling

Static data (`case-studies.ts`) → `generateStaticParams` builds the page at
build time (SSG, same as the existing projects route) → page looks up the
entry by slug, calls `notFound()` if missing. Optional sections are omitted
entirely when their field is empty — no empty headings, no placeholder text.

## Verification

No test runner exists in this repo. Verification matches how the existing
`/projects/[slug]` page was validated: a build check plus a manual browser
pass — confirm `/case-studies/club-connect` resolves, confirm an unknown slug
404s, confirm sections with no data don't render, and confirm the Projects
grid card shows the new badge and links to the new route.

## Explicitly out of scope for this spec

- Blog (separate follow-up spec)
- Case-study treatment for the other two projects
- A dedicated homepage "Case Studies" section (revisit at 2–3 entries)
- Nav changes
- Any markdown/MDX content pipeline

## Open content items (authoring, not architecture)

These need real input when the page is actually written, not decided here:

- Live demo URL for Club Connect
- Specific Prisma models/relations worth highlighting in Database Design
- Real screenshots (if any are wanted)
- Code snippets (if any are wanted)
- Personal "lessons learned" reflections
