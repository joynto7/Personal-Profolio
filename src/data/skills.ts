import type { IconType } from "react-icons";
import {
  SiReact,
  SiNextdotjs,
  SiTypescript,
  SiJavascript,
  SiTailwindcss,
  SiHtml5,
  SiCss,
  SiRedux,
  SiNodedotjs,
  SiExpress,
  SiMongodb,
  SiPostgresql,
  SiPrisma,
  SiFirebase,
  SiGit,
  SiGithub,
  SiDocker,
  SiVercel,
  SiPostman,
  SiFigma,
} from "react-icons/si";

export type Skill = {
  name: string;
  icon: IconType;
  /** Official brand color (hex). */
  color: string;
  /** Brand color is near-black/white — render theme-adaptive instead so it stays visible in dark mode. */
  monochrome?: boolean;
};

export type SkillCategory = {
  category: "Frontend" | "Backend" | "Tools";
  skills: Skill[];
};

export const skills: SkillCategory[] = [
  {
    category: "Frontend",
    skills: [
      { name: "React", icon: SiReact, color: "#61DAFB" },
      { name: "Next.js", icon: SiNextdotjs, color: "#000000", monochrome: true },
      { name: "TypeScript", icon: SiTypescript, color: "#3178C6" },
      { name: "JavaScript", icon: SiJavascript, color: "#F7DF1E" },
      { name: "Tailwind CSS", icon: SiTailwindcss, color: "#06B6D4" },
      { name: "HTML5", icon: SiHtml5, color: "#E34F26" },
      { name: "CSS3", icon: SiCss, color: "#1572B6" },
      { name: "Redux", icon: SiRedux, color: "#764ABC" },
    ],
  },
  {
    category: "Backend",
    skills: [
      { name: "Node.js", icon: SiNodedotjs, color: "#339933" },
      { name: "Express", icon: SiExpress, color: "#000000", monochrome: true },
      { name: "MongoDB", icon: SiMongodb, color: "#47A248" },
      { name: "PostgreSQL", icon: SiPostgresql, color: "#4169E1" },
      { name: "Prisma", icon: SiPrisma, color: "#2D3748", monochrome: true },
      { name: "Firebase", icon: SiFirebase, color: "#FFCA28" },
    ],
  },
  {
    category: "Tools",
    skills: [
      { name: "Git", icon: SiGit, color: "#F05032" },
      { name: "GitHub", icon: SiGithub, color: "#181717", monochrome: true },
      { name: "Docker", icon: SiDocker, color: "#2496ED" },
      { name: "Vercel", icon: SiVercel, color: "#000000", monochrome: true },
      { name: "Postman", icon: SiPostman, color: "#FF6C37" },
      { name: "Figma", icon: SiFigma, color: "#F24E1E" },
    ],
  },
];
