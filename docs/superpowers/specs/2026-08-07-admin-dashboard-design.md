# Admin Dashboard — design

**Status:** Approved, ready for implementation plan
**Date:** 2026-08-07

## Context

The portfolio is currently a fully static Next.js site: every piece of content
(profile/bio, skills, education, experience, projects, case studies, socials)
lives in typed TypeScript arrays under `src/data/`, edited by hand and
published via a git commit + push (Vercel auto-deploys, or is manually
deployed via the Vercel CLI when the GitHub integration isn't connected).

The owner wants a dashboard to edit all of that content themselves, from any
device, without opening a code editor or touching git. This is explicitly a
solo-use tool — no other editors, no roles, no user accounts beyond the
owner.

## Decisions

1. **Database-backed, not git-commit-backed.** A git-commit-backed admin
   (edit → commit via GitHub API → redeploy) was considered and would have
   avoided provisioning a database — but it carries a ~30–90s delay between
   saving and seeing the change live (a real git commit → Vercel build →
   deploy cycle). The owner explicitly chose the database-backed approach to
   get near-instant updates instead. An off-the-shelf git-based CMS (e.g.
   Decap CMS) was also considered and rejected: it's built around
   collections of markdown/YAML entries, which fits arrays like Projects
   reasonably but not a true singleton like Profile, and it adds a new
   dependency plus its own GitHub OAuth setup for no real benefit over a
   purpose-built set of 6 forms.
2. **Neon (Postgres) + Prisma.** Matches the stack the owner already uses in
   two of their own other projects (Club Connect, AgroSync) — zero new
   tooling to learn, not just zero new tooling in this repo.
3. **Images go to Vercel Blob, not the database.** Postgres holds URLs;
   Vercel Blob (a native Vercel product, no separate account) holds the
   actual file bytes for anything uploaded through the admin (new project
   screenshots, an updated avatar). Existing images already committed under
   `public/images/` are left as-is unless explicitly replaced later.
4. **Every relevant page becomes dynamic (queries Postgres per request),
   not statically generated with revalidation.** A static-plus-`revalidatePath()`
   design was considered — it would avoid a database round-trip on every
   page view — but the owner chose the simpler mental model of "the page
   always reflects whatever's in the database right now," accepting one DB
   query per page view. Traffic on a personal portfolio makes this a
   non-issue.
5. **Auth is a single shared password via HTTP Basic Auth in middleware**,
   not a login page, not a user table. One `ADMIN_PASSWORD` env var, checked
   against the `Authorization` header for every request under `/admin/*`; a
   missing or wrong password gets a `401` with `WWW-Authenticate: Basic`,
   which every browser (including mobile) already knows how to prompt for
   natively. No session/cookie code, no login UI to build.
6. **Icon fields (`Skill.icon`, `Social.icon`) store a string key, not a
   component.** The current `skills.ts`/`socials.ts` files import actual
   React icon components (e.g. `icon: FaReact`) — components can't be
   stored in a Postgres row. The DB stores an identifier (`"react"`,
   `"figma"`); a small fixed `Record<string, IconType>` lookup map stays in
   code, and the admin form's icon field is a dropdown over that map's keys
   rather than free text.

## Schema

One table per content type, all via Prisma:

- `Profile` — singleton row (always `id: 1`, upserted): name, designation,
  tagline, location, avatarUrl, resumeUrl, email, phone, whatsapp, and the
  three bio paragraphs (journey/enjoy/hobbies).
- `SkillGroup` (category) → `Skill` (name, iconKey, color, monochrome, order,
  groupId FK).
- `EducationEntry` — institution, degree, field, startYear, endYear,
  description?, achievements (string array).
- `ExperienceEntry` — company, role, startDate, endDate, description,
  highlights (string array).
- `Project` — slug, name, tagline?, imageUrl, techStack (string array)?,
  description?, liveUrl?, githubUrl?, challenges (string array)?,
  futureImprovements (string array)?, caseStudySlug?.
- `CaseStudy` — slug, name, tagline, imageUrl, techStack (string array),
  liveUrl?, githubUrl?, overview, architecture, systemDesign,
  databaseDesign?, security?, challenges (string array), lessonsLearned
  (string array)?, futureImprovements (string array), screenshots (JSON
  array of `{url, caption}`)?, codeSnippets (JSON array of
  `{title, language, code}`)?.
- `Social` — label, url, iconKey.

Optional fields stay optional in the schema, matching the existing
"only render a section if it has real content" rule already established for
Projects and Case Studies — that rule doesn't change, it just now guards
against `null` from the DB instead of `undefined` from a static object.

## Rendering

Every file currently importing from `src/data/*` switches to reading from
Prisma instead, with no static generation and no `revalidatePath` — dynamic,
always reflecting current DB state. That's every section component
(`hero`, `about`, `skills`, `education`, `experience`, `projects`,
`case-studies`, `contact`), `layout.tsx`, `opengraph-image.tsx`,
`footer.tsx`, `navbar.tsx`, `project-card.tsx`, and the two dynamic routes
(`/projects/[slug]`, `/case-studies/[slug]`). `generateStaticParams` on
those two routes goes away; they look up their entry by slug via Prisma at
request time and call `notFound()` if missing, same as today.

## Auth & admin routes

Middleware matcher on `/admin/:path*` enforces HTTP Basic Auth against
`ADMIN_PASSWORD` before any admin route renders.

```
/admin                    Dashboard — links to each section
/admin/profile             Edit the singleton profile/bio
/admin/skills              Manage skill groups & entries
/admin/education           Add/edit/delete entries
/admin/experience          Add/edit/delete entries
/admin/projects            Add/edit/delete entries, image upload
/admin/case-studies        Add/edit/delete entries, image upload
```

Each form is a plain server action (`"use server"`) performing a Prisma
write, validated with **Zod** (already a dependency, already the pattern
used by the existing contact form) — no new form library, no separate REST
API layer.

## Image uploads

A file input on the Profile/Project/Case Study forms uploads directly to
Vercel Blob client-side (via `@vercel/blob`'s upload helper); the resulting
URL is what the server action writes into the DB row. The database never
holds file bytes, only URL strings.

## Migrating existing content

A one-time seed script reads the current `src/data/*.ts` arrays (the real
profile, 3 education/experience entries, 3 projects, 3 case studies, skills,
socials) and inserts them into Postgres via Prisma, so nothing already
written is lost or has to be retyped by hand. Once the seed has run and
every page is switched to querying Prisma, the data arrays in `src/data/*.ts`
are deleted; their `type` exports move to a shared types file (or
`Project`/`CaseStudy`/etc. become Prisma-generated types directly, removing
the need for a hand-maintained type file at all).

## Error handling

Form submission failures (Zod validation, a Prisma write error, an upload
error) surface as a toast via `sonner` (already used elsewhere on this
site) and don't clear whatever was typed into the form. A wrong `/admin`
password just gets the browser's native Basic Auth re-prompt — no custom
error page.

No optimistic locking / concurrent-edit handling — explicitly out of scope,
since this is a single-admin tool with no concurrent editors to conflict
with.

## Testing

No test runner exists in this repo. This feature is the one place in the
project where that's worth a narrow exception: the `/admin` auth gate is a
real security boundary, not just content-rendering logic, so it gets one
minimal automated check — a `node:test` file that issues a raw `fetch()` to
an `/admin` route with no `Authorization` header and asserts a `401`
response. No test framework, no fixtures, nothing beyond that one file.
Everything else (forms, migration, rendering) is verified the same way the
rest of this project always has been: manual build + browser check.

## New dependencies

`@prisma/client` + `prisma` (database), `@vercel/blob` (image uploads).
Nothing else — no form library, no auth library, no test framework beyond
Node's own built-in `node:test`.

## Explicitly out of scope

- Multi-user accounts, roles, or permissions (single shared password only)
- Static generation / `revalidatePath` for public pages (dynamic-per-request
  was the owner's explicit choice)
- Concurrent-edit conflict handling
- A git-commit-backed or headless-CMS-backed alternative (considered,
  rejected — see Decisions)
- Deleting or re-hosting images that are already committed under
  `public/images/` and not touched through the new admin forms

## Open items (need real values when implementing, not decided here)

- The actual `ADMIN_PASSWORD` value (set as a Vercel env var, never
  committed)
- Neon project provisioning and its `DATABASE_URL` (also a Vercel env var)
- Vercel Blob store provisioning and its token
- Confirming Vercel's GitHub auto-deploy integration is connected, or
  relying on manual `vercel --prod` deploys as established earlier this
  project's history — this feature's dynamic rendering makes deploys matter
  less than the git-commit approach would have, since content updates no
  longer require a deploy at all once the app itself is live
