export type ExperienceEntry = {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  highlights: string[];
};

export const experience: ExperienceEntry[] = [
  {
    company: "Nimbus Labs",
    role: "Frontend Developer Intern",
    startDate: "May 2025",
    endDate: "Jul 2025",
    description:
      "Worked within a small product team building customer-facing dashboard features for an analytics SaaS product.",
    highlights: [
      "Shipped 4 dashboard widgets using React and TypeScript, cutting a common reporting task from 5 clicks to 1",
      "Migrated a legacy class-component module to hooks, reducing its bundle size by ~18%",
      "Paired with backend engineers to design and consume a new REST endpoint for saved filters",
    ],
  },
];
