import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteForm } from "@/components/admin/confirm-delete-form";
import { prisma } from "@/lib/prisma";
import { deleteCaseStudy, moveCaseStudy } from "./actions";

export const metadata: Metadata = { title: "Case Studies — Admin" };

export default async function AdminCaseStudiesPage() {
  const caseStudies = await prisma.caseStudy.findMany({ orderBy: { order: "asc" } });

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
        <h1 className="font-heading text-3xl font-medium text-foreground sm:text-4xl">
          Case Studies
        </h1>
        <Button asChild size="sm">
          <Link href="/admin/case-studies/new">Add case study</Link>
        </Button>
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {caseStudies.map((caseStudy, index) => (
          <li
            key={caseStudy.id}
            className="flex items-center gap-4 rounded-xl border border-border p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={caseStudy.imageUrl}
              alt={caseStudy.name}
              className="size-14 shrink-0 rounded-lg border border-border object-cover"
            />
            <div className="flex-1">
              <p className="font-medium text-foreground">{caseStudy.name}</p>
              <p className="text-sm text-muted-foreground">{caseStudy.slug}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {index > 0 && (
                <form action={moveCaseStudy.bind(null, caseStudy.id, "up")}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${caseStudy.name} up`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </form>
              )}
              {index < caseStudies.length - 1 && (
                <form action={moveCaseStudy.bind(null, caseStudy.id, "down")}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${caseStudy.name} down`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </form>
              )}
              <Button asChild variant="ghost" size="icon-sm">
                <Link href={`/admin/case-studies/${caseStudy.id}`} aria-label={`Edit ${caseStudy.name}`}>
                  <Pencil className="size-4" />
                </Link>
              </Button>
              <ConfirmDeleteForm
                action={deleteCaseStudy.bind(null, caseStudy.id)}
                confirmMessage={`Delete the case study "${caseStudy.name}"? This cannot be undone.`}
                entryLabel={caseStudy.name}
              />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
