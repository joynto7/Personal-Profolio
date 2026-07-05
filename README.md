# Joynto Ghosh — Portfolio

Personal portfolio site — about me, skills, education, experience, and a contact form.

**Live:** https://personal-portfolio-lilac-seven-29.vercel.app

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4 + shadcn/ui
- Framer Motion
- Resend (contact form email)

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

Hosted on Vercel. Environment variables (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `NEXT_PUBLIC_SITE_URL`) are set in the Vercel project settings.
