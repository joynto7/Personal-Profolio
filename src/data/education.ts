export type EducationEntry = {
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  description?: string;
  achievements?: string[];
};

export const education: EducationEntry[] = [
  {
    institution: "Daffodil International University",
    degree: "BSc. in Software Engineering",
    field: "Software Engineering",
    startYear: "2024",
    endYear: "2027",
    description:
      "Coursework focused on data structures & algorithms, database systems, operating systems, and web technologies.",
    achievements: [
      "CGPA: 3.4/4.0",
      "Participated in a hackathon and developed an innovative web application.",
      "Built a project for connecting the clubs of all the departments of the university to a centralized platform",
    ],
  },
  {
    institution: " Govt.Debendra College, Manikganj",
    degree: "Higher Secondary (HSC)",
    field: "Science (Computer Science)",
    startYear: "2020",
    endYear: "2022",
  },
];
