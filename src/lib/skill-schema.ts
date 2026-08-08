import { z } from "zod";
import { ICONS } from "@/lib/icons";

const skillIconKeys = Object.keys(ICONS).filter((key) => !key.startsWith("social-")) as [
  string,
  ...string[],
];

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
