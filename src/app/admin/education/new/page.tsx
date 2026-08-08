import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EducationEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Add Education Entry — Admin" };

export default function NewEducationEntryPage() {
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
        Add Education Entry
      </h1>

      <div className="mt-8">
        <EducationEntryForm mode="create" />
      </div>
    </main>
  );
}
