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
    company: "Penguin (Club)",
    role: "Web Developer",
    startDate: "2024",
    endDate: "Present",
    description:
      "Independent, general-interest club — build and maintain web projects across a range of unrelated initiatives run by the club.",
    highlights: [
      "Built a food delivery web page",
      "Built \"Club Connect,\" a web page for linking club members across departments",
      "Built a guitar selling / marketplace web page",
    ],
  },
];
