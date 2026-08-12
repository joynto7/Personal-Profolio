import { z } from "zod";

export const projectSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(1, "Name is required").max(100),
  tagline: z
    .string()
    .trim()
    .max(300)
    .transform((value) => (value === "" ? null : value)),
  techStack: z
    .string()
    .max(2000)
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value === "" ? null : value)),
  liveUrl: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === "" ? null : value)),
  githubUrl: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === "" ? null : value)),
  challenges: z
    .string()
    .max(2000)
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
  futureImprovements: z
    .string()
    .max(2000)
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
  caseStudySlug: z
    .string()
    .trim()
    .max(100)
    .transform((value) => (value === "" ? null : value)),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
