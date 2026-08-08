"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/profile-schema";

export type ProfileFormState = {
  errors?: Partial<Record<keyof typeof profileSchema.shape, string>>;
  success?: boolean;
  message?: string;
};

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = profileSchema.safeParse(raw);

  if (!parsed.success) {
    const errors: ProfileFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof typeof profileSchema.shape;
      if (!errors[field]) errors[field] = issue.message;
    }
    return { errors };
  }

  try {
    await prisma.profile.update({ where: { id: 1 }, data: parsed.data });
    revalidatePath("/admin/profile");
    revalidatePath("/");
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { message: "Could not save. Please try again." };
  }

  return { success: true };
}
