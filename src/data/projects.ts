export type Project = {
  slug: string;
  name: string;
  tagline?: string;
  image: string;
  techStack?: string[];
  description?: string;
  liveUrl?: string;
  githubUrl?: string;
  challenges?: string[];
  futureImprovements?: string[];
  caseStudySlug?: string;
};

export const projects: Project[] = [
  {
    slug: "agrosync",
    name: "AgroSync",
    tagline:
      "A real-time smart irrigation dashboard for a physical ESP32-based agriculture rig",
    image: "/images/projects/AgroSync.png",
    techStack: ["Next.js", "Express", "Prisma", "PostgreSQL", "MQTT"],
    caseStudySlug: "agrosync",
  },
  {
    slug: "club-connect",
    name: "Club Connect",
    tagline:
      "A full-stack platform for managing university clubs, events, and student engagement",
    image: "/images/projects/ClubConnect.png",
    techStack: ["Next.js", "Express", "TypeScript", "Prisma", "PostgreSQL"],
    caseStudySlug: "club-connect",
  },
  {
    slug: "fixitnow",
    name: "FixItNow",
    tagline:
      "A home services marketplace connecting customers with technicians for real-time booking and payment",
    image: "/images/projects/FixItNow.png",
    techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
    caseStudySlug: "fixitnow",
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
