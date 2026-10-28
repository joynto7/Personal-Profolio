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
| **Projects** | Cards for [AgroSync](https://joyntoghosh.vercel.app/case-studies/agrosync), [Club Connect](https://joyntoghosh.vercel.app/case-studies/club-connect), and [FixItNow](https://joyntoghosh.vercel.app/case-studies/fixitnow) |
| **Case Studies** | A deep engineering write-up for each project — architecture, system design, security, and real technical challenges, not just a screenshot |
| **Contact** | A working contact form (via Resend) plus direct email/social links |
| **AI assistant** | A chat button on every page — visitors ask about me, my skills, and my projects in English or Bangla, and Gemini (free tier) or Claude answers from the site's own content |

## Tech Stack

**Framework** — Next.js 16 (App Router, Turbopack) · React 19 · TypeScript

**Styling & UI** — Tailwind CSS v4 · shadcn/ui (Radix primitives) · Framer Motion · `next-themes` for light/dark mode

**Forms & Email** — React Hook Form–free native forms · Zod validation · Resend for the contact form

**AI** — Gemini via `@google/genai` (free tier) or Claude via the Anthropic TypeScript SDK, streamed to the browser

**Other** — `lucide-react` + `react-icons` for iconography · `sonner` for toasts

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    Home page — composes all sections
│   ├── projects/[slug]/            Lightweight project detail pages
│   ├── case-studies/[slug]/        Deep-dive case study pages
│   ├── api/contact/                Contact form API route (Resend)
│   └── api/chat/                   AI assistant API route (Gemini or Claude, streamed)
├── components/
│   ├── chat/                       AI assistant chat widget
│   ├── sections/                   Hero, About, Skills, Education, Experience, Projects, Contact
│   └── ui/                         shadcn/ui primitives (Button, Badge, etc.)
└── data/                           Typed content — profile, skills, education, experience, projects, case studies, socials
```

Content changes (a new project, an updated bio line, a new case study) mean editing a file under `src/data/` — no CMS, no database, just typed TypeScript.

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # add RESEND_API_KEY + CONTACT_TO_EMAIL for the contact form, GEMINI_API_KEY for the AI assistant
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## AI Assistant

The chat button in the bottom-right corner opens an assistant that answers visitors' questions about me — background, skills, education, experience, projects, case studies, and how to get in touch.

- **Bilingual** — it replies in the language of the question: English, Bangla, or Bangla typed in English letters (answered in Bangla script). The English / বাংলা switch in the chat header changes the interface and the default for messages with no clear language.
- **Grounded in the site** — each request carries everything the site shows (profile, skills, education, experience, projects, case studies, socials), read from the same content as the pages, plus extra CV details from `src/data/chatbot.ts`. It's told to answer only from that and to point visitors to my email when it doesn't know.
- **Page-aware** — on a project or case study page, "this project" means the one being viewed.
- **Either AI, free or paid** — set `GEMINI_API_KEY` (free from [Google AI Studio](https://aistudio.google.com/apikey), no card; Google may use free-tier conversations to improve its products) or `ANTHROPIC_API_KEY` (paid; Claude Opus 5.5). If both are set, Claude is used. With neither, the chat button stays hidden.
- **Cost controls** — the instructions and content sit in a cached prompt prefix; each visitor gets 20 messages per 10 minutes, questions are capped at 1,500 characters, and answers at 4,096 tokens. With Claude, also set a monthly spend limit in the [Anthropic Console](https://console.anthropic.com/).

To change what it knows beyond the site's content (CV details, how the site is built, the Bangla spelling of my name, or pronouns for English answers), edit `src/data/chatbot.ts`.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build locally
- `npm run lint` — lint the project
- `node --test tests/` — API tests, run against a running server (`TEST_BASE_URL`, default `http://localhost:3000`)

## Deployment

Hosted on [Vercel](https://joyntoghosh.vercel.app/). Environment variables (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`, and optionally `GEMINI_MODEL` / `CLAUDE_MODEL`) are set in the Vercel project settings.

## Contact

- **Email:** [joyntoghosh768@gmail.com](mailto:joyntoghosh768@gmail.com)
- **GitHub:** [@joynto7](https://github.com/joynto7)
- **LinkedIn:** [in/joynto7](https://www.linkedin.com/in/joynto7/)
