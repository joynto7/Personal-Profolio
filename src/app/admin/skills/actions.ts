"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { skillGroupSchema } from "@/lib/skill-group-schema";
import { skillSchema } from "@/lib/skill-schema";

export type SkillGroupFormState = {
  errors?: Partial<Record<keyof typeof skillGroupSchema.shape, string>>;
  success?: boolean;
  message?: string;
  values?: Record<string, string>;
};

export type SkillFormState = {
  errors?: Partial<Record<keyof typeof skillSchema.shape, string>>;
  success?: boolean;
  message?: string;
  values?: Record<string, string>;
};

function groupFieldErrors(error: z.ZodError) {
  const errors: SkillGroupFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof skillGroupSchema.shape;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

function skillFieldErrors(error: z.ZodError) {
  const errors: SkillFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof skillSchema.shape;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export async function createSkillGroup(
  _prevState: SkillGroupFormState,
  formData: FormData
): Promise<SkillGroupFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = skillGroupSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: groupFieldErrors(parsed.error), values: raw as Record<string, string> };
  }

  try {
    const { _max } = await prisma.skillGroup.aggregate({ _max: { order: true } });
    await prisma.skillGroup.create({
      data: { ...parsed.data, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        errors: { category: "A group with this category already exists." },
        values: raw as Record<string, string>,
      };
    }
    console.error("Failed to create skill group:", error);
    return { message: "Could not save. Please try again.", values: raw as Record<string, string> };
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
  return { success: true };
}

export async function updateSkillGroup(
  id: number,
  _prevState: SkillGroupFormState,
  formData: FormData
): Promise<SkillGroupFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = skillGroupSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: groupFieldErrors(parsed.error), values: raw as Record<string, string> };
  }

  try {
    await prisma.skillGroup.update({ where: { id }, data: parsed.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        errors: { category: "A group with this category already exists." },
        values: raw as Record<string, string>,
      };
    }
    console.error("Failed to update skill group:", error);
    return { message: "Could not save. Please try again.", values: raw as Record<string, string> };
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
  return { success: true };
}

export async function deleteSkillGroup(id: number) {
  try {
    await prisma.skillGroup.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete skill group:", error);
    throw error;
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
}

export async function moveSkillGroup(id: number, direction: "up" | "down") {
  try {
    // ponytail: transient P2028 under rapid successive Neon requests surfaces as a 500; acceptable for a single-admin tool. Add a bounded retry if it shows up in real use.
    await prisma.$transaction(async (tx) => {
      const current = await tx.skillGroup.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.skillGroup.findFirst({
        where:
          direction === "up"
            ? { order: { lt: current.order } }
            : { order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.skillGroup.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.skillGroup.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder skill group:", error);
    throw error;
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
}

export async function createSkill(
  groupId: number,
  _prevState: SkillFormState,
  formData: FormData
): Promise<SkillFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = skillSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: skillFieldErrors(parsed.error), values: raw as Record<string, string> };
  }

  try {
    const { _max } = await prisma.skill.aggregate({ where: { groupId }, _max: { order: true } });
    await prisma.skill.create({
      data: { ...parsed.data, groupId, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    console.error("Failed to create skill:", error);
    return { message: "Could not save. Please try again.", values: raw as Record<string, string> };
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
  return { success: true };
}

export async function updateSkill(
  id: number,
  _prevState: SkillFormState,
  formData: FormData
): Promise<SkillFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = skillSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: skillFieldErrors(parsed.error), values: raw as Record<string, string> };
  }

  try {
    await prisma.skill.update({ where: { id }, data: parsed.data });
  } catch (error) {
    console.error("Failed to update skill:", error);
    return { message: "Could not save. Please try again.", values: raw as Record<string, string> };
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
  return { success: true };
}

export async function deleteSkill(id: number) {
  try {
    await prisma.skill.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete skill:", error);
    throw error;
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
}

export async function moveSkill(id: number, direction: "up" | "down") {
  try {
    // ponytail: transient P2028 under rapid successive Neon requests surfaces as a 500; acceptable for a single-admin tool. Add a bounded retry if it shows up in real use.
    await prisma.$transaction(async (tx) => {
      const current = await tx.skill.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.skill.findFirst({
        where:
          direction === "up"
            ? { groupId: current.groupId, order: { lt: current.order } }
            : { groupId: current.groupId, order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.skill.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.skill.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder skill:", error);
    throw error;
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
}
