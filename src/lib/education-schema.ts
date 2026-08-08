import { z } from "zod";

export const educationEntrySchema = z.object({
  institution: z.string().trim().min(1, "Institution is required").max(150),
  degree: z.string().trim().min(1, "Degree is required").max(150),
  field: z.string().trim().min(1, "Field of study is required").max(150),
  startYear: z.string().trim().min(1, "Start year is required").max(20),
  endYear: z.string().trim().min(1, "End year is required").max(20),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value === "" ? null : value)),
  achievements: z
    .string()
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
});

export type EducationEntryFormValues = z.infer<typeof educationEntrySchema>;
