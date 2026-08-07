# Joynto Ghosh — Portfolio

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?logo=framer&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel)

A personal portfolio for a software engineering student — a warm, editorial-styled one-page site covering my background, skills, education, experience, and projects, plus a deep-dive case study and a working contact form.

**Live:** [joyntoghosh.vercel.app](https://joyntoghosh.vercel.app/)

---

## Overview

Everything on the site is content-driven from a handful of typed data files under `src/data/`, rendered through section components composed on a single scrolling page:

| Section | What it shows |
|---|---|
| **Hero** | Name, role, tagline, resume link |
| **About** | My journey into programming, what I enjoy building, and life outside of code |
| **Skills** | Frontend, backend, and tooling I work with, grouped by category |
| **Education** | Academic background |
| **Experience** | Work history |
| **Projects** | Cards for each project, linking to either a lightweight detail page or a full case study |
| **Case Study** | A deep engineering write-up for [Club Connect](https://joyntoghosh.vercel.app/case-studies/club-connect) — architecture, system design, security, and real technical challenges, not just a screenshot |
| **Contact** | A working contact form (via Resend) plus direct email/social links |

## Tech Stack

**Framework** — Next.js 16 (App Router, Turbopack) · React 19 · TypeScript

**Styling & UI** — Tailwind CSS v4 · shadcn/ui (Radix primitives) · Framer Motion · `next-themes` for light/dark mode

**Forms & Email** — React Hook Form–free native forms · Zod validation · Resend for the contact form

**Other** — `lucide-react` + `react-icons` for iconography · `sonner` for toasts

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    Home page — composes all sections
│   ├── projects/[slug]/            Lightweight project detail pages
│   ├── case-studies/[slug]/        Deep-dive case study pages
│   └── api/contact/                Contact form API route (Resend)
├── components/
│   ├── sections/                   Hero, About, Skills, Education, Experience, Projects, Contact
│   └── ui/                         shadcn/ui primitives (Button, Badge, etc.)
└── data/                           Typed content — profile, skills, education, experience, projects, case studies, socials
```

Content changes (a new project, an updated bio line, a new case study) mean editing a file under `src/data/` — no CMS, no database, just typed TypeScript.

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # add RESEND_API_KEY + CONTACT_TO_EMAIL to enable the contact form
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build locally
- `npm run lint` — lint the project

## Deployment

Hosted on [Vercel](https://joyntoghosh.vercel.app/). Environment variables (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `NEXT_PUBLIC_SITE_URL`) are set in the Vercel project settings.

## Contact

- **Email:** [jg.contact.me07@gmail.com](mailto:jg.contact.me07@gmail.com)
- **GitHub:** [@joynto7](https://github.com/joynto7)
- **LinkedIn:** [in/joynto7](https://www.linkedin.com/in/joynto7/)
