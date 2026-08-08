"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { experienceEntrySchema } from "@/lib/experience-schema";

export type ExperienceEntryFormState = {
  errors?: Partial<Record<keyof typeof experienceEntrySchema.shape, string>>;
  success?: boolean;
  message?: string;
  values?: Record<string, string>;
};

function fieldErrors(error: z.ZodError) {
  const errors: ExperienceEntryFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof experienceEntrySchema.shape;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export async function createExperienceEntry(
  _prevState: ExperienceEntryFormState,
  formData: FormData
): Promise<ExperienceEntryFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = experienceEntrySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw as Record<string, string> };
  }

  try {
    const { _max } = await prisma.experienceEntry.aggregate({ _max: { order: true } });
    await prisma.experienceEntry.create({
      data: { ...parsed.data, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    console.error("Failed to create experience entry:", error);
    return { message: "Could not save. Please try again.", values: raw as Record<string, string> };
  }

  revalidatePath("/admin/experience");
  revalidatePath("/");
  redirect("/admin/experience");
}

export async function updateExperienceEntry(
  id: number,
  _prevState: ExperienceEntryFormState,
  formData: FormData
): Promise<ExperienceEntryFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = experienceEntrySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw as Record<string, string> };
  }

  try {
    await prisma.experienceEntry.update({ where: { id }, data: parsed.data });
  } catch (error) {
    console.error("Failed to update experience entry:", error);
    return { message: "Could not save. Please try again.", values: raw as Record<string, string> };
  }

  revalidatePath("/admin/experience");
  revalidatePath("/");
  return { success: true };
}

export async function deleteExperienceEntry(id: number) {
  try {
    await prisma.experienceEntry.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete experience entry:", error);
    throw error;
  }

  revalidatePath("/admin/experience");
  revalidatePath("/");
}

export async function moveExperienceEntry(id: number, direction: "up" | "down") {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.experienceEntry.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.experienceEntry.findFirst({
        where:
          direction === "up"
            ? { order: { lt: current.order } }
            : { order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.experienceEntry.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.experienceEntry.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder experience entry:", error);
    throw error;
  }

  revalidatePath("/admin/experience");
  revalidatePath("/");
}
