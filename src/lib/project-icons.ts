import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarDays,
  FolderGit2,
  Gavel,
  Network,
  ShieldCheck,
  Sprout,
  Users,
  Wrench,
} from "lucide-react";
import type { IconType } from "react-icons";
import {
  SiCelery,
  SiDocker,
  SiEspressif,
  SiExpress,
  SiFastapi,
  SiFirebase,
  SiFramer,
  SiJavascript,
  SiJsonwebtokens,
  SiMongodb,
  SiMqtt,
  SiNextdotjs,
  SiNodedotjs,
  SiPostgresql,
  SiPrisma,
  SiPython,
  SiReact,
  SiReacthookform,
  SiReactquery,
  SiRedis,
  SiRedux,
  SiSocketdotio,
  SiStripe,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
  SiZod,
} from "react-icons/si";

/**
 * Projects have no icon column, so the icon tile on a project card is picked by slug here.
 * A slug missing from this map gets DEFAULT_PROJECT_ICON.
 */
export const PROJECT_ICONS: Record<string, LucideIcon> = {
  sentra: ShieldCheck,
  agrosync: Sprout,
  "club-connect": Users,
  fixitnow: Wrench,
  occasio: CalendarDays,
  surplusbid: Gavel,
  devpulse: Activity,
  "network-traffic-analyzer": Network,
  "network-analysis": Network,
};

export const DEFAULT_PROJECT_ICON = FolderGit2;

/** The first projects (in admin order) get a full card; the rest become compact "Other Projects" modules. */
export const FEATURED_COUNT = 4;

export type ProjectKind = "web" | "tool" | "ai" | "api";

export const KIND_LABELS: Record<ProjectKind, string> = {
  web: "Web Apps",
  tool: "Tools",
  ai: "AI / Data",
  api: "APIs",
};

/**
 * Presentation details the database doesn't store, keyed by project slug: the category tag,
 * which filter the project falls under, its accent color and team size. A project without
 * an entry is a "Web App" with an accent picked from FALLBACK_ACCENTS by its position.
 */
const PROJECT_META: Record<string, { category: string; kind: ProjectKind; accent: string; team?: number }> = {
  sentra: { category: "AI Security", kind: "ai", accent: "#22d3ee", team: 3 },
  agrosync: { category: "IoT / AgriTech", kind: "web", accent: "#10b981" },
  fixitnow: { category: "Marketplace", kind: "web", accent: "#8b5cf6" },
  occasio: { category: "Events", kind: "web", accent: "#f97316" },
  "club-connect": { category: "Campus", kind: "web", accent: "#14b8a6" },
  surplusbid: { category: "Auctions", kind: "web", accent: "#6366f1" },
  devpulse: { category: "Developer Tools", kind: "api", accent: "#3b82f6" },
  "network-traffic-analyzer": { category: "Networking", kind: "tool", accent: "#a855f7" },
  "network-analysis": { category: "Networking", kind: "tool", accent: "#a855f7" },
};

const FALLBACK_ACCENTS = ["#22d3ee", "#10b981", "#8b5cf6", "#f97316", "#3b82f6", "#d946ef"];

export function projectMeta(slug: string, index: number) {
  const meta = PROJECT_META[slug];
  return {
    category: meta?.category,
    kind: meta?.kind ?? ("web" as ProjectKind),
    accent: meta?.accent ?? FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length],
    team: meta?.team,
  };
}

export const TECH_ICONS: Record<string, IconType> = {
  nextjs: SiNextdotjs,
  reacthookform: SiReacthookform,
  reactquery: SiReactquery,
  react: SiReact,
  typescript: SiTypescript,
  javascript: SiJavascript,
  tailwindcss: SiTailwindcss,
  nodejs: SiNodedotjs,
  express: SiExpress,
  prisma: SiPrisma,
  postgresql: SiPostgresql,
  mongodb: SiMongodb,
  redis: SiRedis,
  celery: SiCelery,
  docker: SiDocker,
  socketio: SiSocketdotio,
  mqtt: SiMqtt,
  esp32: SiEspressif,
  stripe: SiStripe,
  fastapi: SiFastapi,
  python: SiPython,
  zod: SiZod,
  jwt: SiJsonwebtokens,
  firebase: SiFirebase,
  redux: SiRedux,
  framer: SiFramer,
  vercel: SiVercel,
};

/**
 * `Project.techStack` is free text typed in the admin ("Next.js 16", "MQTT (HiveMQ Cloud)"),
 * so entries are matched on their leading words rather than an exact key. First match wins —
 * keep specific patterns (React Hook Form, TanStack Query) above generic ones (React).
 */
const TECH_PATTERNS: [RegExp, string][] = [
  [/^next(\.?js)?\b/, "nextjs"],
  [/^react[- ]hook[- ]form/, "reacthookform"],
  [/^(tanstack|react)[- ]query/, "reactquery"],
  [/^react\b/, "react"],
  [/^typescript/, "typescript"],
  [/^javascript/, "javascript"],
  [/^tailwind/, "tailwindcss"],
  [/^node(\.?js)?\b/, "nodejs"],
  [/^express/, "express"],
  [/^prisma/, "prisma"],
  [/^postgres/, "postgresql"],
  [/^mongo/, "mongodb"],
  [/^redis/, "redis"],
  [/^celery/, "celery"],
  [/^docker/, "docker"],
  [/^socket\.?io/, "socketio"],
  [/^mqtt/, "mqtt"],
  [/^esp32/, "esp32"],
  [/^stripe/, "stripe"],
  [/^fastapi/, "fastapi"],
  [/^python/, "python"],
  [/^zod\b/, "zod"],
  [/^jwt\b/, "jwt"],
  [/^firebase/, "firebase"],
  [/^redux/, "redux"],
  [/^framer/, "framer"],
  [/^vercel/, "vercel"],
];

/** The TECH_ICONS key for a tech stack entry, or undefined when nothing matches. */
export function techIconKey(tech: string): string | undefined {
  const label = tech.trim().toLowerCase();
  return TECH_PATTERNS.find(([pattern]) => pattern.test(label))?.[1];
}
