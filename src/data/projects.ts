export type Project = {
  slug: string;
  name: string;
  tagline?: string;
  image: string;
  techStack?: string[];
  description?: string;
  liveUrl: string;
  githubUrl: string;
  challenges?: string[];
  futureImprovements?: string[];
  caseStudySlug?: string;
};

export const projects: Project[] = [
  {
    slug: "food-delivery-webpage",
    name: "Food Delivery Webpage",
    tagline: "A food delivery web page built for Penguin, an independent club",
    image: "/images/projects/foodhub.svg",
    description:
      "A food delivery web page built while working with Penguin, an independent club that runs projects across different fields.",
    liveUrl: "#",
    githubUrl: "#",
  },
  {
    slug: "club-connect",
    name: "Club Connect",
    tagline:
      "A full-stack platform for managing university clubs, events, and student engagement",
    image: "/images/projects/taskflow.svg",
    techStack: ["Next.js", "Express", "TypeScript", "Prisma", "PostgreSQL"],
    liveUrl: "#",
    githubUrl: "#",
    caseStudySlug: "club-connect",
  },
  {
    slug: "guitar-selling-webpage",
    name: "Guitar Selling Webpage",
    tagline: "A marketplace web page for buying and selling guitars",
    image: "/images/projects/devnotes.svg",
    description:
      "A marketplace-style web page for buying and selling guitars, built for Penguin club.",
    liveUrl: "#",
    githubUrl: "#",
  },
  {
    slug: "agrosync",
    name: "Agrosync",
    image: "/images/projects/foodhub.svg",
    liveUrl: "#",
    githubUrl: "#",
  },
  {
    slug: "fixitnow",
    name: "Fixitnow",
    image: "/images/projects/taskflow.svg",
    liveUrl: "#",
    githubUrl: "#",
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
