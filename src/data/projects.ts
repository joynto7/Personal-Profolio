export type Project = {
  slug: string;
  name: string;
  tagline: string;
  image: string;
  techStack: string[];
  description: string;
  liveUrl: string;
  githubUrl: string;
  challenges: string[];
  futureImprovements: string[];
};

export const projects: Project[] = [];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
