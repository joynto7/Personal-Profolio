# Admin Dashboard — Database Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every piece of portfolio content out of the static `src/data/*.ts` arrays into a Neon Postgres database read through Prisma on every request, and put a Basic-Auth-gated `/admin` shell in place ready for the CRUD forms that follow.

**Architecture:** Prisma models one table per content type (`Profile`, `SkillGroup`/`Skill`, `EducationEntry`, `ExperienceEntry`, `Project`, `CaseStudy`, `Social`), each ordered by an explicit `order` column. A one-time `prisma/seed.ts` transcribes the current static content into those tables. Because every section component is a Client Component (Framer Motion), the Server Components above them — `src/app/page.tsx` and `src/app/layout.tsx` — do all the Prisma querying and pass results down as props. Rendering is fully dynamic: no `generateStaticParams`, no ISR, no `revalidatePath`. `/admin/*` is gated by HTTP Basic Auth in `src/proxy.ts`.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19, TypeScript (strict), Tailwind v4, Prisma + `@prisma/client` against Neon Postgres, `tsx` for the seed script, `react-icons` (unchanged), Node's built-in `node:test` for the single auth check.

## Global Constraints

- **Prerequisite — the human provisions the database, not the implementer.** This plan assumes a Neon Postgres project already exists and that the human has put its connection string into a local env file themselves. No credential ever appears in this plan, in the repo, or in a commit.
- **`DATABASE_URL` must live in `.env`, not only `.env.local`.** Next.js loads both, but the **Prisma CLI only reads `.env`** — `prisma generate`, `prisma migrate dev` and `prisma db seed` will not see a value that exists solely in `.env.local`. `.gitignore` already covers `.env*`, so `.env` is safe to create. `ADMIN_PASSWORD` may live in either.
- If `DATABASE_URL` is missing or unreachable at any step that needs it, **stop and ask the human**. Never invent, guess, or hardcode a connection string, and never commit one.
- Rendering is dynamic everywhere: no `generateStaticParams`, no `revalidate`, no `revalidatePath`, no ISR. Verified fact for this version: a bare Prisma call does **not** opt a route out of static prerendering — `export const dynamic = "force-dynamic"` is genuinely required (see Task 9 notes).
- Plan 1 is **read-only against the database from the app's perspective.** The only writes are from the one-time seed script. No server actions, no forms that submit — those are Plan 2.
- No image-upload code, no `@vercel/blob`, no Vercel Blob configuration — that is Plan 3. Image fields stay plain strings pointing at the files already committed under `public/`.
- New dependencies are limited to `@prisma/client`, `prisma`, and `tsx`. Nothing else.
- No test framework. The single exception is one `node:test` file asserting the `/admin` auth gate returns `401`. Everything else is verified with `npx tsc --noEmit`, `npm run lint`, `npm run build`, and a manual browser pass — the same way the Case Studies feature was verified.
- Every query that returns a list must use `orderBy: { order: "asc" }`. Postgres does not guarantee row order without an explicit `ORDER BY`, and the current display order is deliberate (Projects must stay AgroSync → Club Connect → FixItNow).
- `src/data/nav-links.ts` is site navigation config, not content. It is **not** migrated and stays a static import everywhere.
- Visual output must not change. Same JSX, same Tailwind classes, same Framer Motion variants — only the data source changes.

---

### Task 1: Prisma schema, client singleton, and dependencies

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: generated types `Profile`, `SkillGroup`, `Skill`, `EducationEntry`, `ExperienceEntry`, `Project`, `CaseStudy`, `Social` and the `Prisma` namespace, all importable from `@prisma/client` — consumed by Tasks 3, 5, 6, 7, 8, 9, 10, 11, 12.
- Produces: `prisma` (the `PrismaClient` singleton), `getProfile()`, `getProjectBySlug(slug)`, `getCaseStudyBySlug(slug)` from `@/lib/prisma` — consumed by Tasks 5, 6, 7, 8, 9, 10, 11, 12.
- Produces: `npm run db:seed` and the `prisma.seed` config block — consumed by Task 3.

- [ ] **Step 1: Install the dependencies with real npm commands**

Do not hand-type version numbers into `package.json` — npm writes them.

```bash
npm install @prisma/client
npm install -D prisma tsx
```

- [ ] **Step 2: Create `prisma/schema.prisma`**

Note: `npx prisma init` is deliberately **not** used — it would write a placeholder `DATABASE_URL` into `.env` and could clobber the real value the human put there. Write the file directly instead.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

/// Singleton — always exactly one row, id 1, written with upsert.
model Profile {
  id          Int    @id @default(1)
  name        String
  designation String
  tagline     String
  location    String
  avatarUrl   String
  resumeUrl   String
  email       String
  phone       String
  whatsapp    String
  bioJourney  String
  bioEnjoy    String
  bioHobbies  String
}

model SkillGroup {
  id       Int     @id @default(autoincrement())
  category String  @unique
  order    Int
  skills   Skill[]
}

model Skill {
  id         Int        @id @default(autoincrement())
  name       String
  iconKey    String
  /// Official brand color (hex).
  color      String
  /// Brand color is near-black/white — render theme-adaptive instead so it stays visible in dark mode.
  monochrome Boolean    @default(false)
  order      Int
  groupId    Int
  group      SkillGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
}

model EducationEntry {
  id           Int      @id @default(autoincrement())
  institution  String
  degree       String
  field        String
  startYear    String
  endYear      String
  description  String?
  achievements String[]
  order        Int
}

model ExperienceEntry {
  id          Int      @id @default(autoincrement())
  company     String
  role        String
  startDate   String
  endDate     String
  description String
  highlights  String[]
  order       Int
}

model Project {
  id                 Int      @id @default(autoincrement())
  slug               String   @unique
  name               String
  tagline            String?
  imageUrl           String
  techStack          String[]
  description        String?
  liveUrl            String?
  githubUrl          String?
  challenges         String[]
  futureImprovements String[]
  caseStudySlug      String?
  order              Int
}

model CaseStudy {
  id                 Int      @id @default(autoincrement())
  slug               String   @unique
  name               String
  tagline            String
  imageUrl           String
  techStack          String[]
  liveUrl            String?
  githubUrl          String?
  overview           String
  architecture       String
  systemDesign       String
  databaseDesign     String?
  security           String?
  challenges         String[]
  lessonsLearned     String[]
  futureImprovements String[]
  /// Array of { url: string, caption: string }
  screenshots        Json     @default("[]")
  /// Array of { title: string, language: string, code: string }
  codeSnippets       Json     @default("[]")
  order              Int
}

model Social {
  id      Int    @id @default(autoincrement())
  label   String
  url     String
  iconKey String
  order   Int
}
```

Two schema notes that the rendering code in later tasks depends on:

- Prisma scalar list fields (`String[]`) **cannot be nullable** — they default to `[]`. So the old `project.techStack && project.techStack.length > 0` guards collapse to `project.techStack.length > 0`. An empty array is the new "absent".
- `monochrome` is a non-null `Boolean @default(false)` rather than optional, so `skill.monochrome ? … : …` behaves exactly as it does today with no null handling.

- [ ] **Step 3: Create `src/lib/prisma.ts`**

```ts
import { cache } from "react";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * The profile is a singleton read by the root layout, its generateMetadata, the homepage
 * and the OG image. `cache` collapses those into a single query per request.
 * Throws if the seed has not run — failing loudly beats silently rendering a blank site.
 */
export const getProfile = cache(() =>
  prisma.profile.findUniqueOrThrow({ where: { id: 1 } })
);

export const getProjectBySlug = cache((slug: string) =>
  prisma.project.findUnique({ where: { slug } })
);

export const getCaseStudyBySlug = cache((slug: string) =>
  prisma.caseStudy.findUnique({ where: { slug } })
);
```

- [ ] **Step 4: Update `package.json`**

The three dependency lines npm just added are shown below in the positions npm writes them. **Leave whatever version npm wrote** — only add the `postinstall` script, the `db:seed` script, and the top-level `prisma` block. The `prisma` block is what makes `npx prisma db seed` and `prisma migrate dev`'s seed prompt work.

```json
{
  "name": "personal-portfolio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "postinstall": "prisma generate",
    "db:seed": "tsx prisma/seed.ts"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^7.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^12.42.2",
    "lucide-react": "^1.23.0",
    "next": "16.2.10",
    "next-themes": "^0.4.6",
    "radix-ui": "^1.6.1",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-icons": "^5.7.0",
    "resend": "^6.16.0",
    "shadcn": "^4.12.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.6.0",
    "tw-animate-css": "^1.4.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.10",
    "prisma": "^7.0.0",
    "tailwindcss": "^4",
    "tsx": "^4.20.6",
    "typescript": "^5"
  }
}
```

- [ ] **Step 5: Confirm `DATABASE_URL` is set, then generate the client**

`prisma generate` requires `DATABASE_URL` to be **defined** (it does not need to be reachable yet). Check first:

Run: `grep -c '^DATABASE_URL=' .env`
Expected: `1`.

If that prints `0` or the file does not exist, **stop and ask the human for their Neon connection string** and let them add it. Do not create a placeholder value and do not continue.

Then run: `npx prisma generate`
Expected: `Generated Prisma Client (…) to ./node_modules/@prisma/client`.

If instead it errors that the `prisma-client-js` generator provider is unknown or removed, **stop and ask the human** — the installed Prisma major has changed generator conventions and decision #4 of the design spec (importing types straight from `@prisma/client`) needs revisiting before continuing.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0. This proves `@prisma/client` resolves and `src/lib/prisma.ts` type-checks against the generated client.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma src/lib/prisma.ts
git commit -m "Add Prisma schema for portfolio content and a client singleton"
```

---

### Task 2: Icon key lookup map

**Files:**
- Create: `src/lib/icons.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ICONS: Record<string, IconType>` from `@/lib/icons` — 20 skill keys plus 2 social keys. Consumed by Task 3 (the seed writes these exact key strings into `Skill.iconKey` / `Social.iconKey`), Task 5 (Hero socials), Task 7 (Skills chips), Task 9 (Footer socials).

- [ ] **Step 1: Create `src/lib/icons.ts`**

These 22 entries are exactly the icons imported by the current `src/data/skills.ts` (20, across Frontend/Backend/Tools) and `src/data/socials.ts` (2). Nothing added, nothing dropped. The social keys carry a `social-` prefix because `SiGithub` (the flat simple-icons mark used in the Skills grid) and `FaGithub` (the circular Font Awesome mark used for the profile link) are different components that would otherwise both want the key `github`.

```ts
import type { IconType } from "react-icons";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import {
  SiCss,
  SiDocker,
  SiExpress,
  SiFigma,
  SiFirebase,
  SiGit,
  SiGithub,
  SiHtml5,
  SiJavascript,
  SiMongodb,
  SiNextdotjs,
  SiNodedotjs,
  SiPostgresql,
  SiPostman,
  SiPrisma,
  SiReact,
  SiRedux,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
} from "react-icons/si";

/**
 * Postgres cannot store a React component, so `Skill.iconKey` and `Social.iconKey` hold one
 * of these string keys and the rendering component resolves it here.
 * Keys are lowercase and stable — changing one orphans every DB row that references it.
 */
export const ICONS: Record<string, IconType> = {
  // Frontend
  react: SiReact,
  nextjs: SiNextdotjs,
  typescript: SiTypescript,
  javascript: SiJavascript,
  tailwindcss: SiTailwindcss,
  html5: SiHtml5,
  css3: SiCss,
  redux: SiRedux,
  // Backend
  nodejs: SiNodedotjs,
  express: SiExpress,
  mongodb: SiMongodb,
  postgresql: SiPostgresql,
  prisma: SiPrisma,
  firebase: SiFirebase,
  // Tools
  git: SiGit,
  github: SiGithub,
  docker: SiDocker,
  vercel: SiVercel,
  postman: SiPostman,
  figma: SiFigma,
  // Socials — Font Awesome marks, visually distinct from the Si* skill marks above
  "social-github": FaGithub,
  "social-linkedin": FaLinkedin,
};
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/icons.ts
git commit -m "Add ICONS lookup map so icon fields can be stored as string keys"
```

---

### Task 3: Seed script and first migration

**Files:**
- Create: `prisma/seed.ts`
- Create: `prisma/migrations/` (generated by `prisma migrate dev`)

**Interfaces:**
- Consumes: the models from Task 1, the icon keys from Task 2's `ICONS`.
- Produces: a populated database — one `Profile` row (id 1), 2 `Social`, 3 `SkillGroup` with 20 `Skill`, 1 `EducationEntry`, 1 `ExperienceEntry`, 3 `Project`, 3 `CaseStudy`. Consumed by every task from 5 onwards, and by the manual browser checks.

- [ ] **Step 1: Create `prisma/seed.ts`**

Every string below is transcribed verbatim from the current `src/data/*.ts` files. Do not shorten, reword, or re-punctuate anything.

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const profileData = {
  name: "Joynto Ghosh",
  designation: "Software Developer",
  tagline:
    "I build fast, accessible web apps and enjoy turning complex problems into simple, well-crafted interfaces.",
  location: "Dhaka, Bangladesh",
  avatarUrl: "/images/IMG_6159.jpeg",
  resumeUrl: "/CV.pdf",
  email: "jg.contact.me07@gmail.com",
  phone: "+880 1305 531529",
  whatsapp: "+880 1305 531529",
  bioJourney:
    "I started programming in my second year of college after building a small script to automate a repetitive spreadsheet task for a college club — seeing it save hours of manual work got me hooked. Since then I've been building full-stack side projects and steadily leveling up as a software engineering student, spending most of my free time deepening my understanding of the web platform, system design basics, and clean architecture.",
  bioEnjoy:
    "I enjoy the moment a messy problem turns into a clean solution — refactoring a tangled component into something obvious, or shaving a slow API down to something snappy. I'm most at home working across the stack: wiring up a database schema in the morning and polishing a UI micro-interaction in the afternoon. I also like pairing with teammates and explaining tricky concepts, which is part of why I write short technical notes for myself as I learn.",
  bioHobbies:
    "Outside of code, I play badminton on weekends, and I'm slowly working through a personal goal of running a half marathon. I also sketch UI concepts for fun (some of them even make it into real projects), and I'm a bit of a coffee nerd — pour-over on weekend mornings is non-negotiable, which is partly why this site looks the way it does.",
};

async function main() {
  // Wipe the content tables so the seed can be re-run safely. Skill rows go via the
  // SkillGroup cascade, but delete them explicitly so the intent is obvious.
  await prisma.skill.deleteMany();
  await prisma.skillGroup.deleteMany();
  await prisma.educationEntry.deleteMany();
  await prisma.experienceEntry.deleteMany();
  await prisma.project.deleteMany();
  await prisma.caseStudy.deleteMany();
  await prisma.social.deleteMany();

  await prisma.profile.upsert({
    where: { id: 1 },
    update: profileData,
    create: { id: 1, ...profileData },
  });

  await prisma.social.createMany({
    data: [
      {
        label: "GitHub",
        url: "https://github.com/joynto7",
        iconKey: "social-github",
        order: 0,
      },
      {
        label: "LinkedIn",
        url: "https://www.linkedin.com/in/joynto7/",
        iconKey: "social-linkedin",
        order: 1,
      },
    ],
  });

  await prisma.skillGroup.create({
    data: {
      category: "Frontend",
      order: 0,
      skills: {
        create: [
          { name: "React", iconKey: "react", color: "#61DAFB", order: 0 },
          {
            name: "Next.js",
            iconKey: "nextjs",
            color: "#000000",
            monochrome: true,
            order: 1,
          },
          { name: "TypeScript", iconKey: "typescript", color: "#3178C6", order: 2 },
          { name: "JavaScript", iconKey: "javascript", color: "#F7DF1E", order: 3 },
          { name: "Tailwind CSS", iconKey: "tailwindcss", color: "#06B6D4", order: 4 },
          { name: "HTML5", iconKey: "html5", color: "#E34F26", order: 5 },
          { name: "CSS3", iconKey: "css3", color: "#1572B6", order: 6 },
          { name: "Redux", iconKey: "redux", color: "#764ABC", order: 7 },
        ],
      },
    },
  });

  await prisma.skillGroup.create({
    data: {
      category: "Backend",
      order: 1,
      skills: {
        create: [
          { name: "Node.js", iconKey: "nodejs", color: "#339933", order: 0 },
          {
            name: "Express",
            iconKey: "express",
            color: "#000000",
            monochrome: true,
            order: 1,
          },
          { name: "MongoDB", iconKey: "mongodb", color: "#47A248", order: 2 },
          { name: "PostgreSQL", iconKey: "postgresql", color: "#4169E1", order: 3 },
          {
            name: "Prisma",
            iconKey: "prisma",
            color: "#2D3748",
            monochrome: true,
            order: 4,
          },
          { name: "Firebase", iconKey: "firebase", color: "#FFCA28", order: 5 },
        ],
      },
    },
  });

  await prisma.skillGroup.create({
    data: {
      category: "Tools",
      order: 2,
      skills: {
        create: [
          { name: "Git", iconKey: "git", color: "#F05032", order: 0 },
          {
            name: "GitHub",
            iconKey: "github",
            color: "#181717",
            monochrome: true,
            order: 1,
          },
          { name: "Docker", iconKey: "docker", color: "#2496ED", order: 2 },
          {
            name: "Vercel",
            iconKey: "vercel",
            color: "#000000",
            monochrome: true,
            order: 3,
          },
          { name: "Postman", iconKey: "postman", color: "#FF6C37", order: 4 },
          { name: "Figma", iconKey: "figma", color: "#F24E1E", order: 5 },
        ],
      },
    },
  });

  await prisma.educationEntry.create({
    data: {
      institution: "Daffodil International University",
      degree: "BSc. in Software Engineering",
      field: "Software Engineering",
      startYear: "2024",
      endYear: "2027",
      description:
        "Coursework focused on data structures & algorithms, database systems, operating systems, and web technologies.",
      achievements: [
        "CGPA: 3.4/4.0",
        "Participated in a hackathon and developed an innovative web application.",
        "Built a project for connecting the clubs of all the departments of the university to a centralized platform",
      ],
      order: 0,
    },
  });

  await prisma.experienceEntry.create({
    data: {
      company: "Penguin (Club)",
      role: "Software Engineer",
      startDate: "2024",
      endDate: "Present",
      description:
        "Independent, general-interest club — build and maintain web projects across a range of unrelated initiatives run by the club.",
      highlights: [
        "Built a food delivery web page",
        "Built \"Club Connect,\" a web page for linking club members across departments",
        "Built a guitar selling / marketplace web page",
      ],
      order: 0,
    },
  });

  await prisma.project.createMany({
    data: [
      {
        slug: "agrosync",
        name: "AgroSync",
        tagline:
          "A real-time smart irrigation dashboard for a physical ESP32-based agriculture rig",
        imageUrl: "/images/projects/AgroSync.png",
        techStack: ["Next.js", "Express", "Prisma", "PostgreSQL", "MQTT"],
        caseStudySlug: "agrosync",
        order: 0,
      },
      {
        slug: "club-connect",
        name: "Club Connect",
        tagline:
          "A full-stack platform for managing university clubs, events, and student engagement",
        imageUrl: "/images/projects/ClubConnect.png",
        techStack: ["Next.js", "Express", "TypeScript", "Prisma", "PostgreSQL"],
        caseStudySlug: "club-connect",
        order: 1,
      },
      {
        slug: "fixitnow",
        name: "FixItNow",
        tagline:
          "A home services marketplace connecting customers with technicians for real-time booking and payment",
        imageUrl: "/images/projects/FixItNow.png",
        techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
        caseStudySlug: "fixitnow",
        order: 2,
      },
    ],
  });

  await prisma.caseStudy.createMany({
    data: [
      {
        slug: "agrosync",
        name: "AgroSync",
        tagline:
          "A real-time smart irrigation dashboard for a physical ESP32-based agriculture rig",
        imageUrl: "/images/projects/AgroSync.png",
        techStack: [
          "ESP32 / Arduino",
          "Node.js",
          "Express",
          "Socket.IO",
          "MQTT (HiveMQ Cloud)",
          "Prisma",
          "PostgreSQL",
          "Next.js",
          "React",
        ],
        overview:
          "AgroSync pairs a self-contained, sensor-driven irrigation controller with a cloud dashboard. An ESP32 reads soil moisture, temperature/humidity, light, rain, and tank water level, makes its own local decisions about when to water, and streams everything to the cloud over MQTT so it's visible — and remotely controllable — from a browser, anywhere.",
        architecture:
          "The ESP32 and the browser never talk directly — everything routes through two always-on cloud pieces. The device publishes a JSON telemetry snapshot every ~20 seconds over MQTT (TLS) to a HiveMQ Cloud broker; a Node.js/Express backend subscribed to that topic validates it, writes it to PostgreSQL via Prisma, and pushes it to any connected dashboard over Socket.IO — no polling. Commands flow the other way: a dashboard action hits a REST endpoint, the backend re-checks safety conditions server-side, then publishes a command back over MQTT for the device to act on.",
        systemDesign:
          "Local safety is not optional and not cloud-dependent: the firmware's own control loop enforces a pump max-runtime cutoff, a tank-empty lock, and a rain override regardless of WiFi/MQTT state, with staged LED/buzzer warnings. The cloud layer adds visibility and remote control on top of a system that's already safe standalone — it's never the only thing keeping the pump from misbehaving. Each physical device is identified by a unique ID that has to match exactly across the firmware constant, the database row, and the MQTT topic structure.",
        databaseDesign:
          "Prisma models a Device, its SensorReadings, PumpEvents, Alerts, and per-device configurable thresholds (soil dry/wet points, temperature warnings, tank levels, max pump runtime), plus Users for dashboard auth. SensorReading.deviceId is a hard foreign key to Device.id — telemetry for an unregistered device fails the insert rather than getting silently accepted with bad data.",
        security:
          "The dashboard and the devices use two separate auth systems by design: dashboard users get JWTs with Admin/Viewer roles, while devices authenticate to the MQTT broker with their own credential, independent of user accounts. The backend re-validates safety conditions (tank level, rain state) before publishing a pump-start command — it doesn't trust the dashboard client any more than it trusts the device.",
        challenges: [
          "An MQTT credential set scoped to \"Subscribe Only\" authenticates fine but silently rejects a device's publish attempts — the permission model matters as much as authentication itself",
          "PubSubClient's default 128-byte packet buffer silently drops a multi-field JSON telemetry payload with no error — publish() just returns false",
          "The ESP32 resetting mid-connection right as WiFi/MQTT radio activity spikes turned out to be a power/brownout issue on a weak USB cable, not a code bug",
        ],
        lessonsLearned: [
          "Device connectivity issues split cleanly into two categories — application-layer bugs (buffer sizes, JSON schema) and physical-layer issues (power, RF) — and misdiagnosing one as the other wastes a lot of debugging time",
          "Registering the device in the database before it starts publishing avoids a whole class of silent, hard-to-trace foreign-key failures",
        ],
        futureImprovements: [
          "Move firmware WiFi/MQTT credentials out of hardcoded source into ESP32 NVS-backed storage before any public release",
          "Swap the insecure TLS client for a pinned CA certificate before unattended production use",
          "Add multi-device support to the dashboard UI (the schema already supports it)",
          "Weather-aware irrigation that pre-empts watering ahead of predicted rain",
        ],
        order: 0,
      },
      {
        slug: "club-connect",
        name: "Club Connect",
        tagline:
          "A full-stack platform for managing university clubs, events, and student engagement",
        imageUrl: "/images/projects/ClubConnect.png",
        techStack: [
          "Next.js 16",
          "Express 5",
          "TypeScript",
          "Prisma 7",
          "PostgreSQL",
          "Socket.io",
          "Tailwind CSS v4",
        ],
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
        order: 1,
      },
      {
        slug: "fixitnow",
        name: "FixItNow",
        tagline:
          "A home services marketplace connecting customers with technicians for real-time booking and payment",
        imageUrl: "/images/projects/FixItNow.png",
        techStack: [
          "Next.js",
          "React",
          "TypeScript",
          "Tailwind CSS",
          "TanStack Query",
          "Zustand",
          "React Hook Form",
          "Zod",
        ],
        overview:
          "FixItNow is a home services marketplace with three roles. Customers browse and book technicians for a real available time slot and pay via Stripe or SSLCommerz, then track jobs through to completion. Technicians manage their profile, services, and an interactive availability calendar, and handle incoming bookings. Admins get a platform-wide moderation dashboard covering users and service categories.",
        architecture:
          "This app is a pure API consumer — a Next.js (App Router) frontend with no business logic of its own, configured entirely through a single environment variable pointing at a separate Express + Prisma backend. It deploys to Vercel independently of the backend's own deployment, which keeps the two free to scale and redeploy on their own schedules.",
        systemDesign:
          "Booking is availability-aware rather than a blind date field: customers pick a real open slot from a technician's calendar, with a freeform-date fallback when nothing's been configured yet. Payment is initiated inline from the customer dashboard rather than as a separate route, with dedicated success/cancel pages handling the post-checkout outcome. Technician, customer, and admin each get their own dashboard and their own role-protected route tree, enforced via a shared proxy layer rather than per-page checks.",
        security:
          "Auth is Zod-validated at signup with role selection built in, and every dashboard route tree is role-protected through a shared proxy layer rather than scattered per-page checks — so a customer can't reach a technician or admin route by guessing a URL.",
        challenges: [
          "Coordinating payment gateway redirects across two independently deployed services — the backend's own callback URL has to point back at this app's Vercel URL, or a successful payment redirects to the backend's bare JSON instead of the frontend",
          "Designing the booking flow around a technician's real, live availability instead of a blind date-picker input, while still keeping a freeform-date fallback for technicians who haven't configured a calendar yet",
        ],
        futureImprovements: [
          "Add a dedicated skills/certifications field for technician profiles instead of overloading bio and service list",
          "Give every route its own loading/error boundary instead of relying on TanStack Query's inline states",
        ],
        order: 2,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
```

Two transcription notes:

- `Profile.location` ("Dhaka, Bangladesh") is carried over faithfully even though no current component renders it. It exists in the spec's schema and in today's data — dropping it would silently lose content.
- The three case studies have no `screenshots` or `codeSnippets` today, so those columns fall back to their `[]` schema default rather than being written explicitly.

- [ ] **Step 2: Confirm a live, reachable database before migrating**

This is the first step that needs a **real, reachable** `DATABASE_URL`, not just a defined one.

Run: `grep -c '^DATABASE_URL=' .env`
Expected: `1`.

If it prints `0`, or the following migration fails to connect, **stop and ask the human** for their Neon connection string. Do not invent one, do not point at a local Postgres, do not comment out the datasource.

If Neon rejects `prisma migrate dev` specifically (pooled connections do not support the advisory locks migrations need), ask the human for the **direct**, non-pooled Neon connection string rather than working around it.

- [ ] **Step 3: Create and apply the first migration**

Run: `npx prisma migrate dev --name init`
Expected: `Your database is now in sync with your schema.` and a new folder under `prisma/migrations/`. Prisma will also detect the `prisma.seed` config from Task 1 and offer to run the seed — it is fine either way; Step 4 runs it explicitly.

- [ ] **Step 4: Run the seed**

Run: `npm run db:seed`
Expected: exits 0 with no error output.

- [ ] **Step 5: Verify the rows landed, in order**

Run: `npx prisma studio`
Expected: `Profile` has exactly one row with `id` 1 and the three `bio*` paragraphs populated; `Social` has 2 rows; `SkillGroup` has 3 (Frontend/Backend/Tools with `order` 0/1/2) totalling 20 `Skill` rows; `EducationEntry` and `ExperienceEntry` have 1 each; `Project` has 3 with `order` 0/1/2 as agrosync/club-connect/fixitnow; `CaseStudy` has 3 in the same order. Close Prisma Studio when done.

Run: `npm run db:seed`
Expected: exits 0 again with the same row counts — the seed is re-runnable and does not duplicate rows.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts prisma/migrations
git commit -m "Add seed script migrating all static content into Postgres"
```

---

### Task 4: Basic Auth gate and its test

**Files:**
- Create: `src/proxy.ts`
- Create: `tests/admin-auth.test.ts`

**Interfaces:**
- Consumes: `process.env.ADMIN_PASSWORD`.
- Produces: a `401` + `WWW-Authenticate: Basic realm="Admin"` response for every unauthenticated request under `/admin/*`. Consumed by Task 13's `/admin` page and Task 14's verification.

**Version note — this is not `middleware.ts`.** In this Next.js version the `middleware` file convention is deprecated and renamed to `proxy` (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, "Version history": `v16.0.0 — Middleware is deprecated and renamed to Proxy`). The file must be `src/proxy.ts`, sitting beside `src/app`, and the exported function must be named `proxy`. Proxy defaults to the Node.js runtime, and setting `runtime` inside it throws.

- [ ] **Step 1: Create `src/proxy.ts`**

```ts
import type { NextRequest } from "next/server";

export const config = {
  matcher: "/admin/:path*",
};

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export function proxy(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  // Fail closed: an unset password locks the admin out rather than opening it up.
  if (!expected) return unauthorized();

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(header.slice("Basic ".length));
  } catch {
    return unauthorized();
  }

  // Basic Auth credentials are "username:password". Only the password is checked —
  // any username is accepted — and the password may itself contain colons.
  const separator = decoded.indexOf(":");
  if (separator === -1) return unauthorized();
  if (decoded.slice(separator + 1) !== expected) return unauthorized();

  // Returning nothing lets the request through.
}
```

- [ ] **Step 2: Create `tests/admin-auth.test.ts`**

The `/admin` gate is a real security boundary, so it gets the one automated check this repo allows. It hits a running dev server over HTTP rather than mocking anything, because the thing being tested is the proxy matcher plus the response, not a function in isolation. Both cases matter: a gate that rejects a missing header but waves through a wrong password would pass a no-credentials-only test.

```ts
import { strict as assert } from "node:assert";
import test from "node:test";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

test("GET /admin with no Authorization header is rejected", async () => {
  const response = await fetch(`${BASE_URL}/admin`);

  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate") ?? "", /^Basic realm="Admin"$/);
});

test("GET /admin with the wrong password is rejected", async () => {
  const response = await fetch(`${BASE_URL}/admin`, {
    headers: { Authorization: `Basic ${btoa("admin:not-the-password")}` },
  });

  assert.equal(response.status, 401);
});
```

- [ ] **Step 3: Set a local `ADMIN_PASSWORD`**

Run: `grep -c '^ADMIN_PASSWORD=' .env.local .env`
Expected: at least one file reports `1`.

If neither does, **ask the human to choose and set an `ADMIN_PASSWORD`** in `.env.local`. Do not pick a password on their behalf and do not commit one. Note that with no value set the proxy fails closed, so both tests below still pass — but the manual check in Task 14 needs a real value.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0. (`tsconfig.json` includes `**/*.ts`, so `src/proxy.ts` and `tests/admin-auth.test.ts` are both type-checked.)

Start the dev server in one terminal: `npm run dev`

Then, in another: `node --import tsx --test tests/admin-auth.test.ts`
Expected: `# pass 2`, `# fail 0`.

Sanity-check that the matcher is not over-broad: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/`
Expected: `200` — the gate must only apply to `/admin/*`.

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts tests/admin-auth.test.ts
git commit -m "Gate /admin behind HTTP Basic Auth with a node:test check"
```

---

### Task 5: Hero, About and Contact read from props

**Files:**
- Modify: `src/components/sections/hero.tsx`
- Modify: `src/components/sections/about.tsx`
- Modify: `src/components/sections/contact.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `prisma`, `getProfile` from `@/lib/prisma` (Task 1); `ICONS` from `@/lib/icons` (Task 2); types `Profile`, `Social` from `@prisma/client`.
- Produces: `<Hero profile={profile} socials={socials} />`, `<About profile={profile} />`, `<Contact profile={profile} />` — prop names and types reused unchanged by Task 9's layout work.

- [ ] **Step 1: Rewrite `src/components/sections/hero.tsx`**

`profile.avatarSrc` becomes `profile.avatarUrl` (the schema field name). `social.icon` becomes a lookup through `ICONS`; a key with no entry renders no glyph rather than crashing the homepage, and the link still works.

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import type { Profile, Social } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ICONS } from "@/lib/icons";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function Hero({ profile, socials }: { profile: Profile; socials: Social[] }) {
  return (
    <section className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-12 px-6 py-20 md:flex-row md:py-28">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col items-center text-center md:items-start md:text-left"
      >
        <motion.span
          variants={item}
          className="text-sm font-semibold tracking-widest text-caramel uppercase"
        >
          {profile.designation}
        </motion.span>

        <motion.h1
          variants={item}
          className="mt-4 font-heading text-4xl font-medium text-foreground sm:text-5xl md:text-6xl"
        >
          Hi, I&apos;m {profile.name}
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-5 max-w-lg text-lg text-muted-foreground"
        >
          {profile.tagline}
        </motion.p>

        <motion.div variants={item} className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
          <Button size="lg" asChild>
            <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
              <Download className="size-4" />
              View Resume
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/#contact">Get in Touch</Link>
          </Button>
        </motion.div>

        <motion.div variants={item} className="mt-8 flex gap-3">
          {socials.map((social) => {
            const Icon = ICONS[social.iconKey];
            return (
              <Tooltip key={social.id}>
                <TooltipTrigger asChild>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-caramel hover:bg-caramel hover:text-white"
                  >
                    {Icon && <Icon className="size-4" />}
                  </a>
                </TooltipTrigger>
                <TooltipContent>{social.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative flex flex-1 items-center justify-center"
      >
        <div className="absolute size-72 rounded-full bg-latte/50 blur-2xl sm:size-[28rem]" />
        <div className="relative size-64 overflow-hidden rounded-full border-4 border-background shadow-xl sm:size-96">
          <Image
            src={profile.avatarUrl}
            alt={profile.name}
            fill
            sizes="(min-width: 640px) 24rem, 16rem"
            className="object-cover"
            priority
          />
        </div>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/sections/about.tsx`**

The module-level `blocks` array referenced `profile` at import time — it has to move inside the component now that the profile arrives as a prop.

```tsx
"use client";

import { motion } from "framer-motion";
import { Compass, Heart, Coffee } from "lucide-react";
import type { Profile } from "@prisma/client";

export function About({ profile }: { profile: Profile }) {
  const blocks = [
    {
      icon: Compass,
      title: "My Journey",
      text: profile.bioJourney,
    },
    {
      icon: Heart,
      title: "What I Enjoy",
      text: profile.bioEnjoy,
    },
    {
      icon: Coffee,
      title: "Outside of Code",
      text: profile.bioHobbies,
    },
  ];

  return (
    <section id="about" className="scroll-mt-20 bg-muted py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            About Me
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            The person behind the code
          </h2>
          <p className="mt-4 text-muted-foreground">
            A quick look at how I got here, the kind of work that keeps me
            engaged, and what I get up to when I&apos;m away from the
            keyboard.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {blocks.map((block, i) => (
            <motion.div
              key={block.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="rounded-2xl border border-border bg-card p-8 shadow-sm"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <block.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-heading text-xl font-medium text-foreground">
                {block.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {block.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Rewrite `src/components/sections/contact.tsx`**

Same move: `contactMethods` was module-level and referenced `profile`, so it goes inside the component. Everything else — the Zod validation against `contactSchema`, the fetch to `/api/contact`, the toasts — is untouched.

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Phone, MessageCircle, Loader2, Send } from "lucide-react";
import type { Profile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema } from "@/lib/contact-schema";

type FormState = {
  name: string;
  email: string;
  message: string;
};

const initialState: FormState = { name: "", email: "", message: "" };

export function Contact({ profile }: { profile: Profile }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const contactMethods = [
    {
      icon: Mail,
      label: "Email",
      value: profile.email,
      href: `mailto:${profile.email}`,
    },
    {
      icon: Phone,
      label: "Phone",
      value: profile.phone,
      href: `tel:${profile.phone.replace(/\s+/g, "")}`,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: profile.whatsapp,
      href: `https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`,
    },
  ];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FormState;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) throw new Error("Request failed");

      toast.success("Message sent — I'll get back to you soon.");
      setForm(initialState);
    } catch {
      toast.error("Something went wrong. Please try again or email me directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="contact" className="scroll-mt-20 bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            Contact
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            Let&apos;s Work Together
          </h2>
          <p className="mt-4 text-muted-foreground">
            Have a role, project, or just want to say hi? My inbox is always
            open.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4"
          >
            {contactMethods.map((method) => (
              <a
                key={method.label}
                href={method.href}
                target={method.label === "WhatsApp" ? "_blank" : undefined}
                rel={method.label === "WhatsApp" ? "noopener noreferrer" : undefined}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-caramel"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <method.icon className="size-5" />
                </span>
                <span>
                  <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {method.label}
                  </span>
                  <span className="block text-sm font-medium text-foreground">
                    {method.value}
                  </span>
                </span>
              </a>
            ))}
          </motion.div>

          <motion.form
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            <div>
              <Input
                placeholder="Your name"
                aria-label="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div>
              <Input
                type="email"
                placeholder="you@example.com"
                aria-label="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div>
              <Textarea
                placeholder="Tell me a bit about what you have in mind…"
                aria-label="Message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
              {errors.message && (
                <p className="mt-1.5 text-xs text-destructive">{errors.message}</p>
              )}
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="self-start">
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {submitting ? "Sending..." : "Send Message"}
            </Button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rewrite `src/app/page.tsx`**

The page becomes an async Server Component. Tasks 6, 7 and 8 extend the same `Promise.all` — this is the intermediate state, not the final one.

```tsx
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Skills } from "@/components/sections/skills";
import { Education } from "@/components/sections/education";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { CaseStudies } from "@/components/sections/case-studies";
import { Contact } from "@/components/sections/contact";
import { getProfile, prisma } from "@/lib/prisma";

export default async function Home() {
  const [profile, socials] = await Promise.all([
    getProfile(),
    prisma.social.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <Hero profile={profile} socials={socials} />
      <About profile={profile} />
      <Skills />
      <Education />
      <Experience />
      <Projects />
      <CaseStudies />
      <Contact profile={profile} />
    </main>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Run `npm run dev` and open `http://localhost:3000`.
Expected: the Hero name/designation/tagline/avatar, the three About cards, and the three Contact method cards look exactly as before. The two social buttons in the Hero still show the GitHub and LinkedIn glyphs (proving `ICONS["social-github"]` / `ICONS["social-linkedin"]` resolve).

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/hero.tsx src/components/sections/about.tsx src/components/sections/contact.tsx src/app/page.tsx
git commit -m "Read Hero, About and Contact content from Postgres via page props"
```

---

### Task 6: Education and Experience read from props

**Files:**
- Modify: `src/components/sections/education.tsx`
- Modify: `src/components/sections/experience.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `prisma`, `getProfile` from `@/lib/prisma`; types `EducationEntry`, `ExperienceEntry` from `@prisma/client`; the `<Hero>`/`<About>`/`<Contact>` props established in Task 5.
- Produces: `<Education entries={education} />` and `<Experience entries={experience} />`, both taking a prop literally named `entries`.
- `src/components/sections/timeline-item.tsx` is **not** modified — its `TimelineItemProps` stay as they are.

- [ ] **Step 1: Rewrite `src/components/sections/education.tsx`**

`EducationEntry.description` is `string | null` in Prisma but `TimelineItem`'s `description` is `string | undefined`, so it needs `?? undefined` to satisfy strict mode. Keys switch from `entry.institution` to the real primary key `entry.id`.

```tsx
"use client";

import { motion } from "framer-motion";
import type { EducationEntry } from "@prisma/client";
import { TimelineItem } from "@/components/sections/timeline-item";

export function Education({ entries }: { entries: EducationEntry[] }) {
  return (
    <section id="education" className="scroll-mt-20 bg-muted py-24">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            Education
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            Academic Background
          </h2>
        </motion.div>

        <div className="mt-14">
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
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/sections/experience.tsx`**

The existing empty-state branch stays exactly as it is — it now guards an empty query result instead of an empty array literal.

```tsx
"use client";

import { motion } from "framer-motion";
import type { ExperienceEntry } from "@prisma/client";
import { TimelineItem } from "@/components/sections/timeline-item";

export function Experience({ entries }: { entries: ExperienceEntry[] }) {
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

        {entries.length === 0 ? (
          <p className="mt-14 text-center text-muted-foreground">
            Nothing to show here yet — check back soon.
          </p>
        ) : (
          <div className="mt-14">
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
```

- [ ] **Step 3: Rewrite `src/app/page.tsx`**

```tsx
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Skills } from "@/components/sections/skills";
import { Education } from "@/components/sections/education";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { CaseStudies } from "@/components/sections/case-studies";
import { Contact } from "@/components/sections/contact";
import { getProfile, prisma } from "@/lib/prisma";

export default async function Home() {
  const [profile, socials, education, experience] = await Promise.all([
    getProfile(),
    prisma.social.findMany({ orderBy: { order: "asc" } }),
    prisma.educationEntry.findMany({ orderBy: { order: "asc" } }),
    prisma.experienceEntry.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <Hero profile={profile} socials={socials} />
      <About profile={profile} />
      <Skills />
      <Education entries={education} />
      <Experience entries={experience} />
      <Projects />
      <CaseStudies />
      <Contact profile={profile} />
    </main>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Open `http://localhost:3000/#education` and `http://localhost:3000/#experience`.
Expected: the Daffodil International University entry with its three achievement bullets, and the Penguin (Club) entry with its three highlight bullets — the middle one containing the quoted `"Club Connect,"` text intact.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/education.tsx src/components/sections/experience.tsx src/app/page.tsx
git commit -m "Read Education and Experience timelines from Postgres"
```

---

### Task 7: Skills reads from props and resolves icons by key

**Files:**
- Modify: `src/components/sections/skills.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `ICONS` from `@/lib/icons` (Task 2); `Prisma` and `Skill` types from `@prisma/client`; the props established in Tasks 5 and 6.
- Produces: `<Skills skillGroups={skillGroups} />` and the exported type `SkillGroupWithSkills` from `@/components/sections/skills`.

- [ ] **Step 1: Rewrite `src/components/sections/skills.tsx`**

The nested shape comes back from a Prisma `include`, so the prop type is expressed with `Prisma.SkillGroupGetPayload` rather than hand-written. `skill.icon` becomes `ICONS[skill.iconKey]`; the `monochrome` colouring logic is unchanged.

```tsx
"use client";

import { motion } from "framer-motion";
import type { Prisma, Skill } from "@prisma/client";
import { ICONS } from "@/lib/icons";

export type SkillGroupWithSkills = Prisma.SkillGroupGetPayload<{
  include: { skills: true };
}>;

function SkillChip({ skill, delay }: { skill: Skill; delay: number }) {
  const Icon = ICONS[skill.iconKey];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay }}
      className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background px-4 py-5 text-center transition-colors hover:border-caramel"
    >
      {Icon && (
        <Icon
          className={`size-7 shrink-0 ${skill.monochrome ? "text-foreground" : ""}`}
          style={skill.monochrome ? undefined : { color: skill.color }}
        />
      )}
      <span className="text-sm font-medium text-foreground">{skill.name}</span>
    </motion.div>
  );
}

export function Skills({ skillGroups }: { skillGroups: SkillGroupWithSkills[] }) {
  return (
    <section id="skills" className="scroll-mt-20 bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            Skills
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            Tools I build with
          </h2>
          <p className="mt-4 text-muted-foreground">
            A snapshot of the languages, frameworks, and tools I reach for
            most, grouped by where they fit in the stack.
          </p>
        </motion.div>

        <div className="mt-14 flex flex-col gap-10">
          {skillGroups.map((group) => (
            <div key={group.id}>
              <h3 className="font-heading text-xl font-medium text-foreground">
                {group.category}
              </h3>
              <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                {group.skills.map((skill, i) => (
                  <SkillChip key={skill.id} skill={skill} delay={i * 0.04} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/page.tsx`**

Note the **nested** `orderBy` — the groups and the skills inside each group both need explicit ordering.

```tsx
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Skills } from "@/components/sections/skills";
import { Education } from "@/components/sections/education";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { CaseStudies } from "@/components/sections/case-studies";
import { Contact } from "@/components/sections/contact";
import { getProfile, prisma } from "@/lib/prisma";

export default async function Home() {
  const [profile, socials, skillGroups, education, experience] = await Promise.all([
    getProfile(),
    prisma.social.findMany({ orderBy: { order: "asc" } }),
    prisma.skillGroup.findMany({
      orderBy: { order: "asc" },
      include: { skills: { orderBy: { order: "asc" } } },
    }),
    prisma.educationEntry.findMany({ orderBy: { order: "asc" } }),
    prisma.experienceEntry.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <Hero profile={profile} socials={socials} />
      <About profile={profile} />
      <Skills skillGroups={skillGroups} />
      <Education entries={education} />
      <Experience entries={experience} />
      <Projects />
      <CaseStudies />
      <Contact profile={profile} />
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Open `http://localhost:3000/#skills`.
Expected: three groups in the order Frontend, Backend, Tools. Frontend has 8 chips starting React, Next.js, TypeScript, JavaScript; Backend has 6; Tools has 6 — 20 in total, every one showing its icon. Next.js, Express, Prisma, GitHub and Vercel render in the theme foreground colour (monochrome) while the rest keep their brand hex.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/skills.tsx src/app/page.tsx
git commit -m "Read Skills from Postgres and resolve icons through the ICONS map"
```

---

### Task 8: Projects, ProjectCard and CaseStudies read from props

**Files:**
- Modify: `src/components/sections/projects.tsx`
- Modify: `src/components/sections/project-card.tsx`
- Modify: `src/components/sections/case-studies.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: types `Project`, `CaseStudy` from `@prisma/client`; the props established in Tasks 5, 6 and 7.
- Produces: `<Projects projects={projects} />`, `<ProjectCard project={project} index={i} />`, `<CaseStudies caseStudies={caseStudies} />`. After this task `src/app/page.tsx` is fully converted and is not touched again by this plan.

- [ ] **Step 1: Rewrite `src/components/sections/projects.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import type { Project } from "@prisma/client";
import { ProjectCard } from "@/components/sections/project-card";

export function Projects({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;

  return (
    <section id="projects" className="scroll-mt-20 bg-muted py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            Projects
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            Things I&apos;ve Built
          </h2>
          <p className="mt-4 text-muted-foreground">
            A selection of projects that show how I think about product,
            architecture, and the details in between.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard key={project.slug} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/sections/project-card.tsx`**

Two field-level changes: `project.image` becomes `project.imageUrl`, and `project.techStack && project.techStack.length > 0` collapses to `project.techStack.length > 0` because Prisma scalar lists are never null.

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Project } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

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
          src={project.imageUrl}
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

        {project.techStack.length > 0 && (
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

- [ ] **Step 3: Rewrite `src/components/sections/case-studies.tsx`**

`caseStudy.image` becomes `caseStudy.imageUrl`; everything else is unchanged.

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { CaseStudy } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export function CaseStudies({ caseStudies }: { caseStudies: CaseStudy[] }) {
  if (caseStudies.length === 0) return null;

  return (
    <section id="case-studies" className="scroll-mt-20 bg-background py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            Case Studies
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            The Engineering Behind the Projects
          </h2>
          <p className="mt-4 text-muted-foreground">
            A closer look at how these were actually built — architecture,
            technical challenges, and the decisions in between.
          </p>
        </motion.div>

        <div className="mt-14 flex flex-col gap-8">
          {caseStudies.map((caseStudy, i) => (
            <motion.div
              key={caseStudy.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg sm:flex-row"
            >
              <div className="relative aspect-video shrink-0 overflow-hidden sm:aspect-square sm:w-64">
                <Image
                  src={caseStudy.imageUrl}
                  alt={caseStudy.name}
                  fill
                  sizes="(min-width: 640px) 16rem, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-heading text-xl font-medium text-foreground">
                  {caseStudy.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {caseStudy.tagline}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {caseStudy.techStack.slice(0, 5).map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>

                <Link
                  href={`/case-studies/${caseStudy.slug}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-caramel"
                >
                  Read Case Study
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rewrite `src/app/page.tsx` — final form**

```tsx
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Skills } from "@/components/sections/skills";
import { Education } from "@/components/sections/education";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { CaseStudies } from "@/components/sections/case-studies";
import { Contact } from "@/components/sections/contact";
import { getProfile, prisma } from "@/lib/prisma";

export default async function Home() {
  const [profile, socials, skillGroups, education, experience, projects, caseStudies] =
    await Promise.all([
      getProfile(),
      prisma.social.findMany({ orderBy: { order: "asc" } }),
      prisma.skillGroup.findMany({
        orderBy: { order: "asc" },
        include: { skills: { orderBy: { order: "asc" } } },
      }),
      prisma.educationEntry.findMany({ orderBy: { order: "asc" } }),
      prisma.experienceEntry.findMany({ orderBy: { order: "asc" } }),
      prisma.project.findMany({ orderBy: { order: "asc" } }),
      prisma.caseStudy.findMany({ orderBy: { order: "asc" } }),
    ]);

  return (
    <main className="flex flex-1 flex-col">
      <Hero profile={profile} socials={socials} />
      <About profile={profile} />
      <Skills skillGroups={skillGroups} />
      <Education entries={education} />
      <Experience entries={experience} />
      <Projects projects={projects} />
      <CaseStudies caseStudies={caseStudies} />
      <Contact profile={profile} />
    </main>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Open `http://localhost:3000/#projects` and `http://localhost:3000/#case-studies`.
Expected: the Projects grid shows **AgroSync, then Club Connect, then FixItNow** in that exact order, each with its screenshot and a "Case Study" badge. The Case Studies list shows the same three in the same order. Wrong ordering here means an `orderBy` was dropped.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/projects.tsx src/components/sections/project-card.tsx src/components/sections/case-studies.tsx src/app/page.tsx
git commit -m "Read Projects and Case Studies from Postgres, completing the homepage"
```

---

### Task 9: Layout, Navbar and Footer read from the database

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/layout/navbar.tsx`
- Modify: `src/components/layout/footer.tsx`

**Interfaces:**
- Consumes: `getProfile`, `prisma` from `@/lib/prisma`; `ICONS` from `@/lib/icons`; types `Profile`, `Social` from `@prisma/client`.
- Produces: `<Navbar profile={profile} />`, `<Footer profile={profile} socials={socials} />`, and `export const dynamic = "force-dynamic"` in the root layout, which cascades to every route beneath it.
- `src/data/nav-links.ts` stays a static import in both Navbar and Footer.

**Why `force-dynamic` is required, not optional.** `next.config.ts` does not enable `cacheComponents`, so this project is on the previous caching model, where `export const dynamic` is still a supported route segment config (`node_modules/next/dist/docs/.../route-segment-config/index.md` — those options are only removed *when Cache Components is enabled*, per its v16.0.0 version-history row; the semantics live in `.../02-guides/caching-without-cache-components.md`). Under that model a bare Prisma call is **not** a dynamic API — it does not opt a route out of prerendering the way `cookies()` or an uncached `fetch` would. Without `force-dynamic`, Next would try to prerender these routes at build time, which both requires a reachable database during `next build` and freezes the content at build time — exactly what the design spec rejected.

- [ ] **Step 1: Rewrite `src/app/layout.tsx`**

The static `metadata` export becomes an async `generateMetadata()`. `getProfile()` is React-`cache`d, so `generateMetadata`, `RootLayout` and `Home` share a single profile query per request.

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getProfile, prisma } from "@/lib/prisma";
import "./globals.css";

// Every page reads live content from Postgres — nothing here may be prerendered.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: {
      default: `${profile.name} — ${profile.designation}`,
      template: `%s — ${profile.name}`,
    },
    description: profile.tagline,
    openGraph: {
      title: `${profile.name} — ${profile.designation}`,
      description: profile.tagline,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.name} — ${profile.designation}`,
      description: profile.tagline,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [profile, socials] = await Promise.all([
    getProfile(),
    prisma.social.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <Navbar profile={profile} />
            {children}
            <Footer profile={profile} socials={socials} />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/layout/navbar.tsx`**

Navbar is a Client Component (it owns scroll and sheet state), so the profile has to arrive as a prop rather than being fetched here.

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import type { Profile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { navLinks } from "@/data/nav-links";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Navbar({ profile }: { profile: Profile }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 ${
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md shadow-sm"
          : "border-transparent bg-background/0"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-heading text-lg font-medium text-foreground"
        >
          {profile.name}
          <span className="text-caramel">.</span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-3/4">
                <SheetHeader>
                  <SheetTitle>{profile.name}</SheetTitle>
                </SheetHeader>
                <ul className="flex flex-col gap-1 px-4">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <SheetClose asChild>
                        <Link
                          href={link.href}
                          className="block rounded-md px-2 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          {link.label}
                        </Link>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: Rewrite `src/components/layout/footer.tsx`**

Footer is a Server Component and could query directly, but the layout already holds both values — passing them down keeps it to one query per request and matches the Navbar signature.

```tsx
import Link from "next/link";
import type { Profile, Social } from "@prisma/client";
import { navLinks } from "@/data/nav-links";
import { ICONS } from "@/lib/icons";

export function Footer({ profile, socials }: { profile: Profile; socials: Social[] }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-espresso text-warm-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <span className="font-heading text-xl font-medium">
            {profile.name}
            <span className="text-caramel">.</span>
          </span>
          <p className="mt-3 text-sm text-latte">{profile.tagline}</p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-latte">Quick Links</span>
          <ul className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-warm-white/80 transition-colors hover:text-caramel"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-latte">Connect</span>
          <div className="flex gap-3">
            {socials.map((social) => {
              const Icon = ICONS[social.iconKey];
              return (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex size-9 items-center justify-center rounded-full bg-warm-white/10 text-warm-white transition-colors hover:bg-caramel hover:text-espresso"
                >
                  {Icon && <Icon className="size-4" />}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-warm-white/10">
        <p className="mx-auto max-w-6xl px-6 py-5 text-center text-xs text-warm-white/60 sm:text-left">
          &copy; {year} {profile.name}. Built with Next.js &amp; Tailwind CSS.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Open `http://localhost:3000` and check the browser tab title.
Expected: `Joynto Ghosh — Software Developer`, proving `generateMetadata` read the database. The Navbar wordmark reads `Joynto Ghosh.` and the Footer shows the tagline plus two social buttons with visible glyphs.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/components/layout/navbar.tsx src/components/layout/footer.tsx
git commit -m "Fetch profile and socials in the root layout, force dynamic rendering"
```

---

### Task 10: Dynamic routes query Prisma by slug

**Files:**
- Modify: `src/app/projects/[slug]/page.tsx`
- Modify: `src/app/case-studies/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getProjectBySlug`, `getCaseStudyBySlug` from `@/lib/prisma` (Task 1) — these replace the identically named helpers being deleted from `src/data/projects.ts` and `src/data/case-studies.ts` in Task 12.
- Produces: nothing further downstream.

Both files keep their exact JSX and conditional-rendering rules. What changes: the data source, `generateStaticParams` is deleted, `image` becomes `imageUrl`, and the `x && x.length > 0` guards on scalar list fields collapse to `x.length > 0`. `force-dynamic` is repeated here even though the root layout already sets it — a silently prerendered slug page would serve stale content forever, and one explicit line per file is cheaper than that bug.

- [ ] **Step 1: Rewrite `src/app/projects/[slug]/page.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, Lightbulb, Puzzle } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProjectBySlug } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.tagline ?? project.name,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) notFound();
  if (project.caseStudySlug) permanentRedirect(`/case-studies/${project.caseStudySlug}`);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/#projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>

      <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl border border-border shadow-sm">
        <Image
          src={project.imageUrl}
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

      {project.techStack.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {project.techStack.map((tech) => (
            <Badge key={tech} variant="secondary">
              {tech}
            </Badge>
          ))}
        </div>
      )}

      {(project.liveUrl || project.githubUrl) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {project.liveUrl && (
            <Button asChild>
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Live Project
              </a>
            </Button>
          )}
          {project.githubUrl && (
            <Button variant="outline" asChild>
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <FaGithub className="size-4" />
                GitHub Repo
              </a>
            </Button>
          )}
        </div>
      )}

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

      {(project.challenges.length > 0 || project.futureImprovements.length > 0) && (
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {project.challenges.length > 0 && (
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

          {project.futureImprovements.length > 0 && (
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
    </main>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/case-studies/[slug]/page.tsx`**

Two `Json` columns need a shape. Prisma types them as `JsonValue`, so they are narrowed once at the top of the component with local types rather than being spread through the JSX. The screenshot field is `url` (matching the design spec's schema), not the old static `src`.

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
import { getCaseStudyBySlug } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

type Screenshot = { url: string; caption: string };
type CodeSnippet = { title: string; language: string; code: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = await getCaseStudyBySlug(slug);
  if (!caseStudy) return {};
  return {
    title: `${caseStudy.name} — Case Study`,
    description: caseStudy.tagline,
  };
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const caseStudy = await getCaseStudyBySlug(slug);

  if (!caseStudy) notFound();

  const screenshots = caseStudy.screenshots as unknown as Screenshot[];
  const codeSnippets = caseStudy.codeSnippets as unknown as CodeSnippet[];

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/#projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>

      <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl border border-border shadow-sm">
        <Image
          src={caseStudy.imageUrl}
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
        {caseStudy.githubUrl ? (
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

      {caseStudy.lessonsLearned.length > 0 && (
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

      {screenshots.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-medium text-foreground">Screenshots</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {screenshots.map((shot) => (
              <figure key={shot.url}>
                <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
                  <Image
                    src={shot.url}
                    alt={shot.caption}
                    fill
                    sizes="(min-width: 640px) 28rem, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-2 text-sm text-muted-foreground">
                  {shot.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {codeSnippets.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-medium text-foreground">Code Snippets</h2>
          <div className="mt-4 flex flex-col gap-6">
            {codeSnippets.map((snippet) => (
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
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Open `http://localhost:3000/case-studies/agrosync`.
Expected: the full AgroSync write-up including the Database Design and Security sections and the Lessons Learned list. No Screenshots or Code Snippets section renders (those columns are empty arrays).

Open `http://localhost:3000/case-studies/club-connect`.
Expected: renders, and has **no** Database Design section and **no** Lessons Learned section — proving the optional-field guards still work against `null` / `[]` from the database.

Open `http://localhost:3000/projects/agrosync`.
Expected: a 308 redirect to `/case-studies/agrosync`.

Open `http://localhost:3000/projects/does-not-exist`.
Expected: the 404 page.

- [ ] **Step 4: Commit**

```bash
git add "src/app/projects/[slug]/page.tsx" "src/app/case-studies/[slug]/page.tsx"
git commit -m "Look up project and case study pages by slug in Postgres"
```

---

### Task 11: OG image reads the profile from the database

**Files:**
- Modify: `src/app/opengraph-image.tsx`

**Interfaces:**
- Consumes: `getProfile` from `@/lib/prisma`.
- Produces: nothing further downstream.

The OG image is its own route, generated outside the page render, so it sets `force-dynamic` for itself rather than inheriting the root layout's.

- [ ] **Step 1: Rewrite `src/app/opengraph-image.tsx`**

```tsx
import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const profile = await getProfile();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#FAF8F5",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: 4,
            color: "#C28A58",
            textTransform: "uppercase",
          }}
        >
          {profile.designation}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 600,
            color: "#1B1A18",
            marginTop: 20,
          }}
        >
          {profile.name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#68625B",
            marginTop: 24,
            maxWidth: 900,
          }}
        >
          {profile.tagline}
        </div>
        <div
          style={{
            display: "flex",
            width: 90,
            height: 6,
            backgroundColor: "#4A2F27",
            marginTop: 40,
            borderRadius: 4,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Open `http://localhost:3000/opengraph-image`.
Expected: a 1200×630 PNG reading `SOFTWARE DEVELOPER` / `Joynto Ghosh` / the tagline, on the cream background.

- [ ] **Step 3: Commit**

```bash
git add src/app/opengraph-image.tsx
git commit -m "Generate the OG image from the database profile"
```

---

### Task 12: Delete the static data files

**Files:**
- Delete: `src/data/profile.ts`
- Delete: `src/data/socials.ts`
- Delete: `src/data/skills.ts`
- Delete: `src/data/education.ts`
- Delete: `src/data/experience.ts`
- Delete: `src/data/projects.ts`
- Delete: `src/data/case-studies.ts`
- Modify: `src/lib/email.ts`
- Modify: `.env.local.example`

**Interfaces:**
- Consumes: `getProfile` from `@/lib/prisma`.
- Produces: `src/data/` containing only `nav-links.ts`. Every hand-written `type` export (`Social`, `Skill`, `SkillCategory`, `EducationEntry`, `ExperienceEntry`, `Project`, `CaseStudy`) and the old `getProjectBySlug` / `getCaseStudyBySlug` helpers are gone, replaced by `@prisma/client` generated types and the `@/lib/prisma` helpers.

**`src/lib/email.ts` was not in this plan's original file survey but imports `profile` too** — it uses `profile.email` as the fallback recipient for the contact form. It is the last remaining consumer after Tasks 5–11, and deleting `src/data/profile.ts` without fixing it breaks the build.

- [ ] **Step 1: Confirm nothing still imports the doomed files**

Run: `grep -rn "@/data/" src/`
Expected: exactly four hits, and every one of them for `@/data/nav-links` — two in `src/components/layout/navbar.tsx`, one in `src/components/layout/footer.tsx`, plus the file's own path if grep matches it. If `@/data/profile`, `@/data/socials`, `@/data/skills`, `@/data/education`, `@/data/experience`, `@/data/projects` or `@/data/case-studies` appears anywhere other than `src/lib/email.ts`, an earlier task was left unfinished — go back and finish it before deleting anything.

- [ ] **Step 2: Rewrite `src/lib/email.ts`**

```ts
import { Resend } from "resend";
import { getProfile } from "@/lib/prisma";
import type { ContactFormValues } from "@/lib/contact-schema";

export async function sendContactEmail({ name, email, message }: ContactFormValues) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.CONTACT_TO_EMAIL ?? (await getProfile()).email;

  return resend.emails.send({
    from: "Portfolio Contact Form <onboarding@resend.dev>",
    to,
    replyTo: email,
    subject: `New portfolio message from ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });
}
```

- [ ] **Step 3: Delete the seven data files**

```bash
git rm src/data/profile.ts src/data/socials.ts src/data/skills.ts src/data/education.ts src/data/experience.ts src/data/projects.ts src/data/case-studies.ts
```

`src/data/nav-links.ts` stays. `src/lib/contact-schema.ts` stays.

- [ ] **Step 4: Rewrite `.env.local.example`**

Its `CONTACT_TO_EMAIL` comment points at a file that no longer exists, and the two new variables belong here. The `DATABASE_URL` note matters: the Prisma CLI does not read `.env.local`.

```bash
# Get a free API key at https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Inbox that contact form submissions should be delivered to.
# Falls back to the email on the Profile row in the database if unset.
CONTACT_TO_EMAIL=you@example.com

# Your production URL, used to resolve absolute Open Graph / Twitter image URLs.
# Set this to your real Vercel/custom domain after deploying.
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Neon Postgres connection string. Put this in `.env`, not `.env.local` —
# Next.js reads both, but the Prisma CLI only reads `.env`.
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Single shared password for the /admin dashboard, checked by src/proxy.ts.
# Unset means the admin is locked, not open.
ADMIN_PASSWORD=choose-something-long-and-random
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0. Any "Cannot find module '@/data/…'" error means a reference was missed.

Run: `npm run lint`
Expected: no errors.

Run: `grep -rn "@/data/" src/`
Expected: only `@/data/nav-links` hits remain.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email.ts .env.local.example src/data
git commit -m "Delete the static content files now that everything reads from Postgres"
```

---

### Task 13: Bare `/admin` dashboard shell

**Files:**
- Create: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: the Basic Auth gate from Task 4 (`src/proxy.ts`, matcher `/admin/:path*`).
- Produces: a reachable `/admin` route. The CRUD routes it names are not created here.

This is a finished page for this plan's scope, not a stub: it confirms the auth gate lets an authenticated request through and states what the next stage adds. The future admin routes are listed as **plain text, not links** — `/admin/profile` and friends do not exist yet and linking to them would produce 404s.

- [ ] **Step 1: Create `src/app/admin/page.tsx`**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
};

const sections = [
  "Profile — name, designation, tagline, location, contact details, and the three bio paragraphs",
  "Skills — skill groups and the entries inside them",
  "Education — academic timeline entries",
  "Experience — work timeline entries",
  "Projects — the project grid, including screenshots",
  "Case Studies — the long-form write-ups",
];

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
      <h1 className="mt-2 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Dashboard
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        You are authenticated. Every public page on this site now renders straight from the
        database on each request, so a content change shows up on the next page load — no
        rebuild and no deploy.
      </p>

      <section className="mt-12">
        <h2 className="font-heading text-xl font-medium text-foreground">Editable sections</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The editing forms arrive in the next stage of this feature. They are listed here as
          plain text because their routes do not exist yet.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {sections.map((section) => (
            <li
              key={section}
              className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
              {section}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/admin`
Expected: `401`.

Open `http://localhost:3000/admin` in a browser.
Expected: a native browser username/password prompt. Leave the username blank or type anything, enter the `ADMIN_PASSWORD` value from `.env.local`, and the Dashboard page renders inside the normal site chrome (Navbar and Footer) — which also proves the layout's database fetch works on a non-homepage route.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "Add the bare Basic-Auth-gated /admin dashboard shell"
```

---

### Task 14: Full verification pass

**Files:**
- Modify: none (verification only — unless a check fails, in which case fix the offending file from its own task and re-run).

**Interfaces:**
- Consumes: everything from Tasks 1–13.
- Produces: confidence that the site is genuinely database-backed and the admin gate holds.

- [ ] **Step 1: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds. In the route table **every** route is marked dynamic (`ƒ`), including `/`, `/admin`, `/projects/[slug]`, `/case-studies/[slug]` and `/opengraph-image`. A route marked static (`○`) or prerendered means a `force-dynamic` was missed — add it to that route's file and rebuild. There must be **no** "Generating static pages" step that lists project or case-study slugs; if slugs appear, a `generateStaticParams` survived Task 10.

- [ ] **Step 3: Auth test**

With `npm run dev` running, run: `node --import tsx --test tests/admin-auth.test.ts`
Expected: `# pass 2`, `# fail 0`.

- [ ] **Step 4: Prove the pages are really reading the database, not a stale import**

This is the check that catches the worst possible outcome of this plan — a page that still renders correct-looking content from a leftover static import. Change one row and see it on the next reload, with no restart and no rebuild:

Run: `npx prisma studio`

In Prisma Studio, edit the `Profile` row's `tagline` to something obviously different (for example append ` — DB CHECK`) and save. Do **not** touch any file.

Reload `http://localhost:3000` (no restart, no rebuild).
Expected: the Hero tagline and the Footer tagline both show the edited text, and the browser tab title still shows the name (so `generateMetadata` is live too). Then reload `http://localhost:3000/opengraph-image` and confirm the PNG shows the edited tagline.

Change the tagline back to the original value in Prisma Studio, reload once more to confirm it reverts, then close Prisma Studio.

Run: `grep -rn "@/data/" src/`
Expected: only `@/data/nav-links` hits — a second, static confirmation that no content import survived.

- [ ] **Step 5: Manual browser pass over every public page**

With `npm run dev` running, check each of these:

- `http://localhost:3000` — Hero (designation, name, tagline, avatar, two social buttons with glyphs), About (three cards with the journey/enjoy/hobbies paragraphs), Skills (Frontend 8 / Backend 6 / Tools 6, all 20 icons visible, monochrome ones adapting to the theme), Education (Daffodil entry, three achievements), Experience (Penguin entry, three highlights), Projects (AgroSync → Club Connect → FixItNow, in that order, each with a Case Study badge), Case Studies (same three, same order), Contact (email/phone/WhatsApp cards).
- Toggle dark mode — the monochrome skill icons must stay visible.
- `http://localhost:3000/case-studies/agrosync` — full write-up, Database Design and Security sections present, Lessons Learned present, no empty Screenshots/Code Snippets headings.
- `http://localhost:3000/case-studies/club-connect` — no Database Design section, no Lessons Learned section.
- `http://localhost:3000/case-studies/fixitnow` — renders, no Database Design section.
- `http://localhost:3000/projects/club-connect` — redirects to `/case-studies/club-connect`.
- `http://localhost:3000/projects/nope` — 404 page.
- `http://localhost:3000/opengraph-image` — the PNG renders.
- Submit the contact form once — the success toast appears (this exercises `src/lib/email.ts` and its new `getProfile()` fallback).

- [ ] **Step 6: Manual `/admin` pass, both ways**

- `http://localhost:3000/admin` in a fresh private window — the browser's native Basic Auth prompt appears.
- Cancel the prompt — the browser shows the 401 body, not the dashboard.
- Enter a deliberately wrong password — prompted again.
- Enter the real `ADMIN_PASSWORD` — the Dashboard renders.
- `http://localhost:3000/admin/profile` (a route that does not exist yet) — still prompts for credentials in a fresh window before showing a 404, proving the `/admin/:path*` matcher covers subpaths, not just `/admin`.

- [ ] **Step 7: Commit**

Verification-only; there is nothing to commit unless a fix was needed. If a fix was made:

```bash
git add [the exact files that were fixed]
git commit -m "Fix [specific issue] found in the database foundation verification pass"
```

---

## Deviations from the suggested task breakdown

The 14-task shape is unchanged. Five things differ from the letter of the brief, each for a verified reason:

1. **`src/proxy.ts`, not `src/middleware.ts`** (Task 4). Per this repo's `AGENTS.md` instruction to read `node_modules/next/dist/docs/` rather than trust training data: in this Next.js version the `middleware` file convention is deprecated and renamed to `proxy`, the exported function is `proxy`, and there is a codemod for the migration (`.../03-file-conventions/proxy.md`, version history row `v16.0.0`). Writing `src/middleware.ts` would produce a deprecated file, and in the worst case a silently inert auth gate. Everything else about decision #6 is unchanged: same `/admin/:path*` matcher, same `ADMIN_PASSWORD` check, same `401` + `WWW-Authenticate: Basic realm="Admin"`, no cookies, no session, no login page.

2. **`export const dynamic = "force-dynamic"` is required, and it is confirmed, not assumed** (Tasks 9, 10, 11). Decision #7 offered "or simply rely on the Prisma call making them dynamic automatically — verify which is actually needed." Verified: `next.config.ts` does not enable `cacheComponents`, so `dynamic` is still a valid route segment config (it is only removed *when* Cache Components is on), and under that model a plain Prisma call is not a dynamic API — the routes would be prerendered at build time. So `force-dynamic` goes in the root layout (covering all pages) and, explicitly, in both slug routes and the OG image route.

3. **`npx prisma init` is skipped** (Task 1); `prisma/schema.prisma` is written directly. `prisma init` writes a placeholder `DATABASE_URL` into `.env`, which would overwrite the real Neon string the human is asked to put there. Writing the file directly is both safer and fully deterministic.

4. **`DATABASE_URL` must be in `.env`, not only `.env.local`** (Global Constraints, Tasks 1 and 3). Decision #10 named `.env.local`. Next.js does read `.env.local`, but the **Prisma CLI does not** — `prisma generate`, `prisma migrate dev` and `prisma db seed` would all fail to find the variable. `.gitignore` already covers `.env*`, so nothing is exposed. The hard "stop and ask the human" gate that decision #10 asked for is placed at both points where it bites: Task 1 Step 5 (`prisma generate` needs the variable *defined*) and Task 3 Step 2 (`prisma migrate dev` needs the database *reachable*).

5. **Two files outside the stated survey are touched in Task 12:** `src/lib/email.ts` (imports `profile` for the contact-form fallback recipient — it would break the build the moment `src/data/profile.ts` is deleted) and `.env.local.example` (its `CONTACT_TO_EMAIL` comment points at the deleted file, and the two new environment variables belong there).

One naming note that is a choice rather than a deviation: the 2 social icon keys are `social-github` and `social-linkedin` rather than bare `github`/`linkedin`, because `SiGithub` (the flat mark in the Skills grid) and `FaGithub` (the circular mark on the profile links) are different components and both would otherwise claim the key `github`. All 22 keys (20 skill + 2 social) are enumerated in Task 2 and used verbatim by the Task 3 seed.
