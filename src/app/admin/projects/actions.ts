"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/project-schema";

export type ProjectFormState = {
  errors?: Partial<Record<keyof typeof projectSchema.shape | "imageFile", string>>;
  success?: boolean;
  message?: string;
  values?: Record<string, string>;
};

function fieldErrors(error: z.ZodError) {
  const errors: ProjectFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof projectSchema.shape;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

function textValues(formData: FormData) {
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") raw[key] = value;
  }
  return raw;
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const raw = textValues(formData);
  const parsed = projectSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw };
  }

  const imageFile = formData.get("imageFile");
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return { errors: { imageFile: "An image is required" }, values: raw };
  }

  let imageUrl: string;
  try {
    const blob = await put(`projects/${parsed.data.slug}-${Date.now()}`, imageFile, {
      access: "public",
    });
    imageUrl = blob.url;
  } catch (error) {
    console.error("Failed to upload project image:", error);
    return { message: "Could not upload image. Please try again.", values: raw };
  }

  try {
    const { _max } = await prisma.project.aggregate({ _max: { order: true } });
    await prisma.project.create({
      data: { ...parsed.data, imageUrl, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { slug: "A project with this slug already exists." }, values: raw };
    }
    console.error("Failed to create project:", error);
    return { message: "Could not save. Please try again.", values: raw };
  }

  revalidatePath("/admin/projects");
  revalidatePath("/");
  redirect("/admin/projects");
}

export async function updateProject(
  id: number,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const raw = textValues(formData);
  const parsed = projectSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw };
  }

  const imageFile = formData.get("imageFile");
  let imageUrl: string | undefined;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      const blob = await put(`projects/${parsed.data.slug}-${Date.now()}`, imageFile, {
        access: "public",
      });
      imageUrl = blob.url;
    } catch (error) {
      console.error("Failed to upload project image:", error);
      return { message: "Could not upload image. Please try again.", values: raw };
    }
  }

  try {
    await prisma.project.update({
      where: { id },
      data: { ...parsed.data, ...(imageUrl ? { imageUrl } : {}) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { slug: "A project with this slug already exists." }, values: raw };
    }
    console.error("Failed to update project:", error);
    return { message: "Could not save. Please try again.", values: raw };
  }

  revalidatePath("/admin/projects");
  revalidatePath("/");
  return { success: true };
}

export async function deleteProject(id: number) {
  try {
    await prisma.project.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete project:", error);
    throw error;
  }

  revalidatePath("/admin/projects");
  revalidatePath("/");
}

export async function moveProject(id: number, direction: "up" | "down") {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.project.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.project.findFirst({
        where:
          direction === "up"
            ? { order: { lt: current.order } }
            : { order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.project.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.project.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder project:", error);
    throw error;
  }

  revalidatePath("/admin/projects");
  revalidatePath("/");
}
