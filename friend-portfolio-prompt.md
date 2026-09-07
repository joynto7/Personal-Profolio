# Personal Portfolio — Build Prompt

Build a personal portfolio website that is a pixel-for-pixel clone of this spec — same stack, same file structure, same design system, same section layout and copy style. Only the content (name, bio, links, skills, education, experience, projects) should differ, filled in from the placeholders at the end.

## Tech stack (use exactly these)

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (New York style) + tw-animate-css
- Framer Motion (scroll-reveal + stagger animations)
- next-themes (light/dark mode, class strategy, system default)
- lucide-react + react-icons (react-icons/fa6 for socials, react-icons/si for skill logos)
- zod (form validation) + Resend (contact form email delivery)
- sonner (toast notifications)
- Fonts via next/font/google: Geist (sans), Geist Mono (mono), Fraunces (headings — variable font, axes: opsz, SOFT, WONK)

## Design system

Clean, minimalist, warm-neutral palette (RYTHM-style) — not pure black and white.

| Purpose | Name | Hex |
|---|---|---|
| Background | Rich Off-White | `#F6F4F1` |
| Secondary Background | Warm Cream | `#EEE9E2` |
| Card Background | Pure White | `#FFFFFF` |
| Primary Text | Charcoal Black | `#1A1A1A` |
| Secondary Text | Dark Gray | `#5E5E5E` |
| Small/Tertiary Text | Light Gray | `#7A7A7A` |
| Borders | Soft Gray | `#D8D3CD` |
| Accent | Warm Beige | `#C9B8A6` |
| Hover Accent | Medium Beige | `#B79F87` |

**Buttons**
```css
/* Primary */
background: #1A1A1A;
color: #FFFFFF;

/* Primary — hover */
background: #333333;
```

**Navigation** (sticky header)
```css
background: rgba(246, 244, 241, 0.9);
backdrop-filter: blur(12px);
```

**Cards**
```css
background: #FFFFFF;
border: 1px solid #D8D3CD;
```

**Typography colors**
- Headings: `#1A1A1A`
- Paragraph: `#5E5E5E`
- Small text: `#7A7A7A`

**Tailwind theme**
```js
colors: {
  background: "#F6F4F1",
  surface: "#FFFFFF",
  surface2: "#EEE9E2",
  text: "#1A1A1A",
  textSecondary: "#5E5E5E",
  border: "#D8D3CD",
  accent: "#C9B8A6",
  accentHover: "#B79F87",
}
```

**Signature accent (pick one, used for links/CTAs/interactive highlights only — keep the rest of the palette neutral):**
- Orange (energetic / cybersecurity-leaning): `#FF7A3D`, hover `#FF9A61`
- Blue (professional): `#4F7CFF`
- Gold (premium): `#C7A66A`

Dark mode: invert to a near-black background (`#141312`ish) and warm off-white text, keep the chosen accent color as the primary interactive color in both modes.

## File structure

```
src/
  app/
    layout.tsx          — root layout: fonts, ThemeProvider, TooltipProvider, Navbar, Footer, Toaster, SEO metadata from profile data
    page.tsx             — renders sections in order: Hero, About, Skills, Education, Experience, Projects, Contact
    not-found.tsx
    opengraph-image.tsx
    globals.css          — theme tokens (light + dark)
    projects/[slug]/page.tsx  — individual project detail page
    api/contact/route.ts — POST handler, validates with zod, sends email via Resend
  components/
    layout/navbar.tsx    — sticky header, blurs+shrinks on scroll, desktop nav links, mobile Sheet (slide-out drawer) menu, theme toggle
    layout/footer.tsx    — dark footer block: name/tagline, quick links, social icons, copyright with dynamic year
    layout/theme-toggle.tsx — light/dark toggle button
    sections/hero.tsx, about.tsx, skills.tsx, education.tsx, experience.tsx, projects.tsx, project-card.tsx, contact.tsx, timeline-item.tsx
    ui/ — shadcn primitives: button, card, badge, input, textarea, separator, sheet, tooltip, sonner
    theme-provider.tsx
  data/
    profile.ts    — name, designation, tagline, location, avatarSrc, resumeUrl, email, phone, whatsapp, bio {journey, enjoy, hobbies}
    socials.ts    — [{ label, url, icon }] for GitHub, LinkedIn (extend as needed)
    skills.ts     — grouped by category ("Frontend" | "Backend" | "Tools"), each skill has { name, icon (react-icons/si), color (brand hex), monochrome? (true for near-black/white brand marks like Next.js/GitHub/Vercel so they stay visible in dark mode) }
    education.ts  — [{ institution, degree, field, startYear, endYear, description?, achievements? }]
    experience.ts — [{ company, role, startDate, endDate, description, highlights[] }]
    projects.ts   — [{ slug, name, tagline, image, techStack[], description, liveUrl, githubUrl, challenges[], futureImprovements[] }] + getProjectBySlug()
    nav-links.ts  — anchor links to each section: About, Skills, Education, Experience, Projects, Contact
  lib/
    contact-schema.ts — zod schema: name (2-100 chars), email (valid email), message (10-2000 chars)
    email.ts           — Resend send wrapper
    utils.ts            — cn() class helper
```

## Section-by-section behavior

1. **Hero** — two-column (stacks on mobile, reversed so photo is on top on mobile): left = designation label (accent color, uppercase, tracked), "Hi, I'm {name}" heading (Fraunces font), tagline, two CTA buttons ("View Resume" → opens resumeUrl in new tab, "Get in Touch" → scrolls to #contact), row of circular social icon buttons with tooltips. Right = circular profile photo with a soft blurred glow behind it.
2. **About** — section heading "The person behind the code", 3-column card grid (icons: Compass/Heart/Coffee-or-similar) for "My Journey", "What I Enjoy", "Outside of Code", each pulled from profile.bio.
3. **Skills** — grouped by category, each skill shown as an icon chip in its brand color (or theme-adaptive if monochrome).
4. **Education** — timeline-style list of degrees with achievements.
5. **Experience** — timeline-style list of roles with highlight bullets.
6. **Projects** — card grid linking to /projects/[slug] detail pages; detail page shows tech stack, description, challenges, future improvements, live/GitHub links.
7. **Contact** — two columns: left = clickable contact method cards (Email/mailto, Phone/tel, WhatsApp/wa.me link built from the number), right = form (name, email, message) that POSTs to /api/contact, validated client + server side with zod, shows toast on success/failure.

## Env vars (.env.local)

```
RESEND_API_KEY=<from resend.com>
CONTACT_TO_EMAIL=<inbox for form submissions>
NEXT_PUBLIC_SITE_URL=<production domain, for OG image URLs>
```

## Content to fill in (replace every placeholder)

- Name: `[NAME]`
- Designation/title: `[TITLE]`
- Tagline (1 sentence): `[TAGLINE]`
- Location: `[LOCATION]`
- Profile photo: `[PHOTO_PATH]`
- Resume/CV file: `[CV_PATH]`
- Email / Phone / WhatsApp: `[EMAIL]` / `[PHONE]` / `[WHATSAPP]`
- Bio — journey / what I enjoy / hobbies (3 short paragraphs): `[BIO_JOURNEY]` / `[BIO_ENJOY]` / `[BIO_HOBBIES]`
- Social links (GitHub, LinkedIn, etc.): `[SOCIALS]`
- Skills by category (Frontend/Backend/Tools): `[SKILLS]`
- Education entries: `[EDUCATION]`
- Experience entries: `[EXPERIENCE]`
- Projects (name, tagline, image, tech stack, description, live/GitHub URLs, challenges, future improvements): `[PROJECTS]`

Keep every layout, animation, color token, and copy pattern identical to this spec — only the placeholder content changes.
