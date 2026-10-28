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
export const cvFacts = `Career objective: Software Engineering undergraduate and freelance full-stack developer who builds web apps with Next.js, TypeScript, Node.js, Express, PostgreSQL and MongoDB. Shipped a paid client CMS and 3 live full-stack platforms with payments, real-time features and AI. Seeking a Software Engineer role to build reliable products.

Based in Mirpur-2, Dhaka, Bangladesh.

Full skill list from the CV:
- Languages: JavaScript (ES6+), TypeScript, Python, SQL
- Frontend: React.js, Next.js, Redux Toolkit, TanStack Query, Zustand, Tailwind CSS, React Native (Expo)
- Backend: Node.js, Express.js, Flask, REST APIs, Socket.IO, JWT, OAuth 2.0, Firebase
- Databases & ORMs: PostgreSQL, MongoDB, MySQL, Redis, Prisma, Mongoose, vector databases
- AI/ML: LLM APIs (Claude), RAG pipelines, semantic search
- DevOps & tools: Git, GitHub Actions, Docker, NGINX, Linux, VPS, Vercel, Postman, Jest, App Store & Play Store
- Interpersonal: communication, client handling, teamwork, collaboration, leadership

Professional experience — Full Stack Developer (freelance) for Nexoria Consultancy, July 2026 – September 2026:
- Built the client's Next.js 15 + MongoDB website and an admin CMS with 16 content sections, so staff update pages, blogs and courses without a developer
- Wrote 53 API routes with JWT auth in Edge middleware, bcrypt-hashed logins, rate limiting plus honeypot spam protection, and webhook lead alerts
- Added a drag-and-drop page builder, a rich-text editor and Cloudinary media uploads

Projects on the CV (all live, with separate client and server code):
- SurplusBid, a B2B surplus auction marketplace (live: https://surplusbid-frontend.vercel.app; code: https://github.com/joynto7/surplusbid-frontend and https://github.com/joynto7/surplusbid-backend). A timed-auction engine with anti-sniping and Stripe manual-capture deposit holds: losing holds are released and unpaid wins roll over to the next-highest bidder. Concurrent bids are handled with PostgreSQL row locks and Redis rate limiting, lots close via node-cron, and it has 19 Jest + Supertest suites. Claude powers its search, recommendations and chat, each with a built-in fallback engine. Tech: Next.js, TypeScript, Zustand, Node.js, Express, Prisma, PostgreSQL, Redis, Stripe, Jest.
- Club Connect, a university club management platform (live: https://club-connect-rust.vercel.app; code: https://github.com/joynto7/Club-Connect/tree/main/frontend and https://github.com/joynto7/Club-Connect/tree/main/backend). Three roles (students, club officers, admins) with RSVP waitlists and QR-code check-in, backed by 34 PostgreSQL models; real-time notifications (Socket.IO with the Redis adapter) and venue booking with conflict detection; JWT refresh tokens, Google OAuth and TOTP two-factor auth; event tickets sold through SSLCommerz (bKash, Nagad, Rocket, cards). Tech: Next.js, TypeScript, TanStack Query, Express, Prisma, PostgreSQL, Socket.IO, Redis, SSLCommerz.
- FixItNow, a home services booking marketplace (live: https://fixitnow-frontend-peach.vercel.app; code: https://github.com/joynto7/fixitnow-frontend and https://github.com/joynto7/fixitnow-backend). Three role-based dashboards (customer, technician, admin) guarded by a shared route proxy; slot-based booking from each technician's availability calendar, with a free-date fallback; Stripe and SSLCommerz checkout, with TanStack Query caching and Zustand state. Tech: Next.js, TypeScript, TanStack Query, Zustand, Zod, Node.js, Express, Prisma, PostgreSQL, Stripe.

Education detail: B.Sc. in Software Engineering, Daffodil International University, Dhaka, January 2024 – December 2027 (expected).

Extra-curricular:
- 2026 Shenzhen International FinTech Competition (International Track): participant. Built Aegis Wealth AI (https://github.com/joynto7/Aegis-Wealth-AI), an AI wealth-advisory agent with compliance checks and sandboxed execution.
- DIU Unlock the Algorithm Programming Contest, Spring 2026 Final: participant (invite-only, ICPC-style).

Spoken languages: Bangla (native), English (fluent).`;

/** How this site is built, for visitors who ask. */
export const siteFacts = `This portfolio website is Joynto's own, built with Next.js 16 (App Router), React 19 and TypeScript, styled with Tailwind CSS v4, shadcn/ui and Framer Motion, with light and dark themes. Its content lives in a Neon Postgres database through Prisma and is edited from a private admin dashboard; the contact form sends email through Resend; it is deployed on Vercel. This AI assistant answers from the same content the site shows.`;
