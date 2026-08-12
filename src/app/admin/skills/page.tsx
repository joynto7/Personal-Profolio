import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GroupRow } from "./group-row";
import { AddGroupForm } from "./add-group-form";

export const metadata: Metadata = { title: "Skills — Admin" };

export default async function AdminSkillsPage() {
  const groups = await prisma.skillGroup.findMany({
    orderBy: { order: "asc" },
    include: { skills: { orderBy: { order: "asc" } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">Skills</h1>

      <div className="mt-8 flex flex-col gap-6">
        {groups.map((group, index) => (
          <GroupRow
            key={group.id}
            group={group}
            isFirst={index === 0}
            isLast={index === groups.length - 1}
          />
        ))}
        <AddGroupForm />
      </div>
    </main>
  );
}
