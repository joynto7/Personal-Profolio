import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CaseStudyEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Add Case Study — Admin" };

export default function NewCaseStudyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin/case-studies"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Case Studies
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Add Case Study
      </h1>

      <div className="mt-8">
        <CaseStudyEntryForm mode="create" />
      </div>
    </main>
  );
}
