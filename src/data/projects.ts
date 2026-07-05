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

export const projects: Project[] = [
  {
    slug: "food-delivery-webpage",
    name: "Food Delivery Webpage",
    tagline: "A food delivery web page built for Penguin, an independent club",
    image: "/images/projects/foodhub.svg",
    techStack: ["[Add tech stack]"],
    description:
      "A food delivery web page built while working with Penguin, an independent club that runs projects across different fields. [Add more detail about who it's for and how it works.]",
    liveUrl: "#",
    githubUrl: "#",
    challenges: ["[Add a challenge you faced building this]"],
    futureImprovements: ["[Add a planned improvement]"],
  },
  {
    slug: "club-connect",
    name: "Club Connect",
    tagline: "A web page for linking club members across departments",
    image: "/images/projects/taskflow.svg",
    techStack: ["[Add tech stack]"],
    description:
      "A web page built for Penguin club to help connect members across different departments. [Add more detail about how it works.]",
    liveUrl: "#",
    githubUrl: "#",
    challenges: ["[Add a challenge you faced building this]"],
    futureImprovements: ["[Add a planned improvement]"],
  },
  {
    slug: "guitar-selling-webpage",
    name: "Guitar Selling Webpage",
    tagline: "A marketplace web page for buying and selling guitars",
    image: "/images/projects/devnotes.svg",
    techStack: ["[Add tech stack]"],
    description:
      "A marketplace-style web page for buying and selling guitars, built for Penguin club. [Add more detail about how it works.]",
    liveUrl: "#",
    githubUrl: "#",
    challenges: ["[Add a challenge you faced building this]"],
    futureImprovements: ["[Add a planned improvement]"],
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
