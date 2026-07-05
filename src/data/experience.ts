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
    company: "[Company Name]",
    role: "[Your Role]",
    startDate: "[Start Month Year]",
    endDate: "[End Month Year]",
    description: "[Replace this with a one-line summary of what you did in this role.]",
    highlights: [
      "[Replace with a specific accomplishment or responsibility]",
      "[Replace with another one]",
    ],
  },
];
