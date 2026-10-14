import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarDays,
  FolderGit2,
  Gavel,
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
};

export const DEFAULT_PROJECT_ICON = FolderGit2;

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
