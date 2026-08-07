import type { IconType } from "react-icons";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import {
  SiCss,
  SiDocker,
  SiExpress,
  SiFigma,
  SiFirebase,
  SiGit,
  SiGithub,
  SiHtml5,
  SiJavascript,
  SiMongodb,
  SiNextdotjs,
  SiNodedotjs,
  SiPostgresql,
  SiPostman,
  SiPrisma,
  SiReact,
  SiRedux,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
} from "react-icons/si";

/**
 * Postgres cannot store a React component, so `Skill.iconKey` and `Social.iconKey` hold one
 * of these string keys and the rendering component resolves it here.
 * Keys are lowercase and stable — changing one orphans every DB row that references it.
 */
export const ICONS: Record<string, IconType> = {
  // Frontend
  react: SiReact,
  nextjs: SiNextdotjs,
  typescript: SiTypescript,
  javascript: SiJavascript,
  tailwindcss: SiTailwindcss,
  html5: SiHtml5,
  css3: SiCss,
  redux: SiRedux,
  // Backend
  nodejs: SiNodedotjs,
  express: SiExpress,
  mongodb: SiMongodb,
  postgresql: SiPostgresql,
  prisma: SiPrisma,
  firebase: SiFirebase,
  // Tools
  git: SiGit,
  github: SiGithub,
  docker: SiDocker,
  vercel: SiVercel,
  postman: SiPostman,
  figma: SiFigma,
  // Socials — Font Awesome marks, visually distinct from the Si* skill marks above
  "social-github": FaGithub,
  "social-linkedin": FaLinkedin,
};
