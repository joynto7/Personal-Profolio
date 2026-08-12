"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { caseStudySchema } from "@/lib/case-study-schema";

export type CaseStudyFormState = {
  errors?: Partial<Record<keyof typeof caseStudySchema.shape | "imageFile", string>>;
  success?: boolean;
  message?: string;
  values?: Record<string, string>;
};

function fieldErrors(error: z.ZodError) {
  const errors: CaseStudyFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof caseStudySchema.shape;
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

export async function createCaseStudy(
  _prevState: CaseStudyFormState,
  formData: FormData
): Promise<CaseStudyFormState> {
  const raw = textValues(formData);
  const parsed = caseStudySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw };
  }

  const imageFile = formData.get("imageFile");
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return { errors: { imageFile: "An image is required" }, values: raw };
  }

  let imageUrl: string;
  try {
    const blob = await put(`case-studies/${parsed.data.slug}-${Date.now()}`, imageFile, {
      access: "public",
    });
    imageUrl = blob.url;
  } catch (error) {
    console.error("Failed to upload case study image:", error);
    return { message: "Could not upload image. Please try again.", values: raw };
  }

  try {
    const { _max } = await prisma.caseStudy.aggregate({ _max: { order: true } });
    await prisma.caseStudy.create({
      data: { ...parsed.data, imageUrl, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { slug: "A case study with this slug already exists." }, values: raw };
    }
    console.error("Failed to create case study:", error);
    return { message: "Could not save. Please try again.", values: raw };
  }

  revalidatePath("/admin/case-studies");
  revalidatePath("/");
  redirect("/admin/case-studies");
}

export async function updateCaseStudy(
  id: number,
  _prevState: CaseStudyFormState,
  formData: FormData
): Promise<CaseStudyFormState> {
  const raw = textValues(formData);
  const parsed = caseStudySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw };
  }

  const imageFile = formData.get("imageFile");
  let imageUrl: string | undefined;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      const blob = await put(`case-studies/${parsed.data.slug}-${Date.now()}`, imageFile, {
        access: "public",
      });
      imageUrl = blob.url;
    } catch (error) {
      console.error("Failed to upload case study image:", error);
      return { message: "Could not upload image. Please try again.", values: raw };
    }
  }

  try {
    await prisma.caseStudy.update({
      where: { id },
      data: { ...parsed.data, ...(imageUrl ? { imageUrl } : {}) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { slug: "A case study with this slug already exists." }, values: raw };
    }
    console.error("Failed to update case study:", error);
    return { message: "Could not save. Please try again.", values: raw };
  }

  revalidatePath("/admin/case-studies");
  revalidatePath(`/admin/case-studies/${id}`);
  revalidatePath("/");
  return { success: true };
}

export async function deleteCaseStudy(id: number) {
  try {
    await prisma.caseStudy.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete case study:", error);
    throw error;
  }

  revalidatePath("/admin/case-studies");
  revalidatePath("/");
}

export async function moveCaseStudy(id: number, direction: "up" | "down") {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.caseStudy.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.caseStudy.findFirst({
        where:
          direction === "up"
            ? { order: { lt: current.order } }
            : { order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.caseStudy.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.caseStudy.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder case study:", error);
    throw error;
  }

  revalidatePath("/admin/case-studies");
  revalidatePath("/");
}
