import { z } from "zod";

export const skillGroupSchema = z.object({
  category: z.string().trim().min(1, "Category is required").max(50),
});

export type SkillGroupFormValues = z.infer<typeof skillGroupSchema>;
