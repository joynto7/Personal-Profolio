import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteForm } from "@/components/admin/confirm-delete-form";
import { prisma } from "@/lib/prisma";
import { deleteProject, moveProject } from "./actions";

export const metadata: Metadata = { title: "Projects — Admin" };

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({ orderBy: { order: "asc" } });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-medium text-foreground sm:text-4xl">Projects</h1>
        <Button asChild size="sm">
          <Link href="/admin/projects/new">Add project</Link>
        </Button>
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {projects.map((project, index) => (
          <li
            key={project.id}
            className="flex items-center gap-4 rounded-xl border border-border p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.imageUrl}
              alt={project.name}
              className="size-14 shrink-0 rounded-lg border border-border object-cover"
            />
            <div className="flex-1">
              <p className="font-medium text-foreground">{project.name}</p>
              <p className="text-sm text-muted-foreground">{project.slug}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {index > 0 && (
                <form action={moveProject.bind(null, project.id, "up")}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Move ${project.name} up`}>
                    <ArrowUp className="size-4" />
                  </Button>
                </form>
              )}
              {index < projects.length - 1 && (
                <form action={moveProject.bind(null, project.id, "down")}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Move ${project.name} down`}>
                    <ArrowDown className="size-4" />
                  </Button>
                </form>
              )}
              <Button asChild variant="ghost" size="icon-sm">
                <Link href={`/admin/projects/${project.id}`} aria-label={`Edit ${project.name}`}>
                  <Pencil className="size-4" />
                </Link>
              </Button>
              <ConfirmDeleteForm
                action={deleteProject.bind(null, project.id)}
                confirmMessage={`Delete the project "${project.name}"? This cannot be undone.`}
                entryLabel={project.name}
              />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
