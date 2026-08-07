export type CaseStudy = {
  slug: string;
  name: string;
  tagline: string;
  image: string;
  techStack: string[];
  liveUrl?: string;
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
    slug: "agrosync",
    name: "AgroSync",
    tagline:
      "A real-time smart irrigation dashboard for a physical ESP32-based agriculture rig",
    image: "/images/projects/AgroSync.png",
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
  },
  {
    slug: "club-connect",
    name: "Club Connect",
    tagline:
      "A full-stack platform for managing university clubs, events, and student engagement",
    image: "/images/projects/ClubConnect.png",
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
  },
  {
    slug: "fixitnow",
    name: "FixItNow",
    tagline:
      "A home services marketplace connecting customers with technicians for real-time booking and payment",
    image: "/images/projects/FixItNow.png",
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
  },
];

export function getCaseStudyBySlug(slug: string) {
  return caseStudies.find((caseStudy) => caseStudy.slug === slug);
}
