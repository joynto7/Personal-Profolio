import { z } from "zod";

function jsonArrayField<T extends z.ZodTypeAny>(itemSchema: T, maxLength = 10000) {
  return z
    .string()
    .max(maxLength, `Too long (max ${maxLength} characters) — trim or split into fewer entries.`)
    .transform((value, ctx) => {
      if (value.trim() === "") return [];
      try {
        return JSON.parse(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid JSON" });
        return z.NEVER;
      }
    })
    .pipe(z.array(itemSchema));
}

export const caseStudySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(1, "Name is required").max(100),
  tagline: z.string().trim().min(1, "Tagline is required").max(300),
  techStack: z
    .string()
    .max(2000)
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
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
  overview: z.string().trim().min(1, "Overview is required").max(5000),
  architecture: z.string().trim().min(1, "Architecture is required").max(5000),
  systemDesign: z.string().trim().min(1, "System design is required").max(5000),
  databaseDesign: z
    .string()
    .trim()
    .max(5000)
    .transform((value) => (value === "" ? null : value)),
  security: z
    .string()
    .trim()
    .max(5000)
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
  lessonsLearned: z
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
  screenshots: jsonArrayField(
    z.object({
      url: z
        .string()
        .trim()
        .min(1, "Screenshot url is required")
        .refine(
          (value) =>
            value.startsWith("/") ||
            /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(value),
          "Must be a local path starting with / or a Vercel Blob URL"
        ),
      caption: z.string().trim(),
    })
  ),
  codeSnippets: jsonArrayField(
    z.object({
      title: z.string().trim().min(1, "Snippet title is required"),
      language: z.string().trim().min(1, "Snippet language is required"),
      code: z.string(),
    }),
    30000
  ),
});

export type CaseStudyFormValues = z.infer<typeof caseStudySchema>;
