import { z } from "zod";

export const experienceEntrySchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(150),
  role: z.string().trim().min(1, "Role is required").max(150),
  startDate: z.string().trim().min(1, "Start date is required").max(20),
  endDate: z.string().trim().min(1, "End date is required").max(20),
  description: z.string().trim().min(1, "Description is required").max(2000),
  highlights: z
    .string()
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
});

export type ExperienceEntryFormValues = z.infer<typeof experienceEntrySchema>;
