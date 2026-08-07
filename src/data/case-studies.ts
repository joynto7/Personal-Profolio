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
