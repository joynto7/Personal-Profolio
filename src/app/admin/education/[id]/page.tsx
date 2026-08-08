import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EducationEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Edit Education Entry — Admin" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditEducationEntryPage({ params }: Props) {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) notFound();

  const entry = await prisma.educationEntry.findUnique({ where: { id: numericId } });
  if (!entry) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin/education"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Education
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Edit Education Entry
      </h1>

      <div className="mt-8">
        <EducationEntryForm mode="edit" entry={entry} />
      </div>
    </main>
  );
}
