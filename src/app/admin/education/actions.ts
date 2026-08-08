"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { educationEntrySchema } from "@/lib/education-schema";

export type EducationEntryFormState = {
  errors?: Partial<Record<keyof typeof educationEntrySchema.shape, string>>;
  success?: boolean;
  message?: string;
};

function fieldErrors(error: z.ZodError) {
  const errors: EducationEntryFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof educationEntrySchema.shape;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export async function createEducationEntry(
  _prevState: EducationEntryFormState,
  formData: FormData
): Promise<EducationEntryFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = educationEntrySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  try {
    const { _max } = await prisma.educationEntry.aggregate({ _max: { order: true } });
    await prisma.educationEntry.create({
      data: { ...parsed.data, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    console.error("Failed to create education entry:", error);
    return { message: "Could not save. Please try again." };
  }

  revalidatePath("/admin/education");
  revalidatePath("/");
  redirect("/admin/education");
}

export async function updateEducationEntry(
  id: number,
  _prevState: EducationEntryFormState,
  formData: FormData
): Promise<EducationEntryFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = educationEntrySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  try {
    await prisma.educationEntry.update({ where: { id }, data: parsed.data });
  } catch (error) {
    console.error("Failed to update education entry:", error);
    return { message: "Could not save. Please try again." };
  }

  revalidatePath("/admin/education");
  revalidatePath("/");
  return { success: true };
}

export async function deleteEducationEntry(id: number) {
  try {
    await prisma.educationEntry.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete education entry:", error);
    throw error;
  }

  revalidatePath("/admin/education");
  revalidatePath("/");
}

export async function moveEducationEntry(id: number, direction: "up" | "down") {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.educationEntry.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.educationEntry.findFirst({
        where:
          direction === "up"
            ? { order: { lt: current.order } }
            : { order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.educationEntry.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.educationEntry.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder education entry:", error);
    throw error;
  }

  revalidatePath("/admin/education");
  revalidatePath("/");
}
