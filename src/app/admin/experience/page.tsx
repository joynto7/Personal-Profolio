import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteForm } from "@/components/admin/confirm-delete-form";
import { prisma } from "@/lib/prisma";
import { deleteExperienceEntry, moveExperienceEntry } from "./actions";

export const metadata: Metadata = { title: "Experience — Admin" };

export default async function AdminExperiencePage() {
  const entries = await prisma.experienceEntry.findMany({ orderBy: { order: "asc" } });

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
        <h1 className="font-heading text-3xl font-medium text-foreground sm:text-4xl">Experience</h1>
        <Button asChild size="sm">
          <Link href="/admin/experience/new">Add entry</Link>
        </Button>
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {entries.map((entry, index) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
          >
            <div>
              <p className="font-medium text-foreground">
                {entry.role} at {entry.company}
              </p>
              <p className="text-sm text-muted-foreground">
                {entry.startDate} – {entry.endDate}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {index > 0 && (
                <form action={moveExperienceEntry.bind(null, entry.id, "up")}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Move up">
                    <ArrowUp className="size-4" />
                  </Button>
                </form>
              )}
              {index < entries.length - 1 && (
                <form action={moveExperienceEntry.bind(null, entry.id, "down")}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Move down">
                    <ArrowDown className="size-4" />
                  </Button>
                </form>
              )}
              <Button asChild variant="ghost" size="icon-sm">
                <Link href={`/admin/experience/${entry.id}`} aria-label="Edit">
                  <Pencil className="size-4" />
                </Link>
              </Button>
              <ConfirmDeleteForm
                action={deleteExperienceEntry.bind(null, entry.id)}
                confirmMessage={`Delete this experience entry (${entry.company})?`}
              />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
