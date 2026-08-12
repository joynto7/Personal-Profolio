import { z } from "zod";
import { SKILL_ICON_KEYS } from "@/lib/icons";

const skillIconKeys = SKILL_ICON_KEYS as [string, ...string[]];

export const skillSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  iconKey: z.enum(skillIconKeys, { message: "Select an icon" }),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color (e.g. #61DAFB)"),
  monochrome: z.literal("on").optional().transform((value) => value === "on"),
});

export type SkillFormValues = z.infer<typeof skillSchema>;
