import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProjectEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Edit Project — Admin" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const project = await prisma.project.findUnique({ where: { id: numericId } });
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin/projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Edit Project
      </h1>

      <div className="mt-8">
        <ProjectEntryForm mode="edit" entry={project} />
      </div>
    </main>
  );
}
