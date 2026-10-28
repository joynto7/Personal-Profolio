/**
 * Settings and extra knowledge for the AI assistant (src/components/chat/chat-widget.tsx).
 * Everything the site shows — profile, skills, education, experience, projects, case
 * studies, socials — is read live from the database, so it never needs repeating here.
 * This file only holds what the database has no field for.
 */
export const assistantProfile = {
  /** First name in Bangla script, used in Bangla replies and the Bangla UI. */
  firstNameBn: "জয়ন্ত",
  /** The same name in the possessive ("Joynto's"), as Bangla attaches it to the word. */
  firstNamePossessiveBn: "জয়ন্তের",
  /**
   * Pronouns for English answers, e.g. "he/him", "she/her" or "they/them". Left null, the
   * assistant refers to Joynto by name rather than guessing. (Bangla pronouns are gender-neutral.)
   */
  pronouns: null as string | null,
};

/**
 * Facts from the CV (public/CV.pdf) that go beyond what the site shows. Update this
 * alongside the CV — the assistant treats every line here as true.
 */
export const cvFacts = `Professional summary: Software Engineering undergraduate at Daffodil International University who builds full-stack web platforms end-to-end — from real-time IoT dashboards to marketplace and community platforms. Aiming to grow as a Software Engineer focused on building AI-driven software products, combining full-stack development with practical AI/LLM integration. Comfortable owning a project across design, architecture, and implementation.

Full skill list from the CV:
- Languages: JavaScript, TypeScript, Python, C++, Go, PHP, SQL
- Frontend: React.js, Next.js, React Native, Tailwind CSS, Bootstrap
- Backend: Node.js, Express.js, Flask, REST APIs, Firebase
- Databases: PostgreSQL, MongoDB, MySQL, vector databases (semantic search)
- DevOps & tools: Docker, NGINX, Linux, Git, VPS management, CI/CD, Expo, Google Play & App Store deployment
- AI/ML: LLM APIs, RAG pipelines, Vision APIs, semantic search, multimodal models

Education detail: BSc in Software Engineering, Daffodil International University (Daffodil Smart City, Ashulia, Dhaka), January 2024 – December 2027 (expected), CGPA 3.40/4.00.

Experience detail (Software Engineer at Penguin, 2024 – present):
- Built a food delivery web application as part of the team's product lineup
- Developed "Club Connect", a platform linking club members across university departments
- Built a marketplace web application for buying and selling musical instruments

Project details from the CV:
- AgroSync (personal project): streamed real-time sensor data (soil moisture, temperature) from ESP32 devices via MQTT and Socket.IO for live monitoring; enabled remote irrigation control so users can trigger watering cycles from the dashboard; logged historical sensor data in PostgreSQL for trend visualization; built a type-safe full-stack data pipeline with Next.js, Express and Prisma.
- Club Connect (personal project): a department-wise club directory so students can browse and discover clubs in one place; club profile pages with events, announcements and member information; built with Next.js, Express, TypeScript, Prisma and PostgreSQL.
- FixItNow (personal project): browse and search technicians by service category and availability; a booking and scheduling flow for home service appointments; fast, cached data fetching with TanStack Query; a responsive, mobile-friendly UI with Next.js, React, TypeScript and Tailwind CSS.

Extra-curricular: participant in the DIU Unlock the Algorithm Programming Contest – Spring '26 (Final), an invite-only, ICPC-regional-style contest organized by Daffodil International University.

Spoken languages: Bangla (native), English (fluent).`;

/** How this site is built, for visitors who ask. */
export const siteFacts = `This portfolio website is Joynto's own, built with Next.js 16 (App Router), React 19 and TypeScript, styled with Tailwind CSS v4, shadcn/ui and Framer Motion, with light and dark themes. Its content lives in a Neon Postgres database through Prisma and is edited from a private admin dashboard; the contact form sends email through Resend; it is deployed on Vercel. This AI assistant runs on Claude, by Anthropic, and answers from the same content the site shows.`;
