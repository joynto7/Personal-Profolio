import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin",
};

const sections = [
  {
    label: "Profile",
    href: "/admin/profile",
    description: "Name, designation, tagline, location, contact details, and the three bio paragraphs",
  },
  {
    label: "Skills",
    href: null,
    description: "Skill groups and the entries inside them",
  },
  {
    label: "Education",
    href: null,
    description: "Academic timeline entries",
  },
  {
    label: "Experience",
    href: null,
    description: "Work timeline entries",
  },
  {
    label: "Projects",
    href: null,
    description: "The project grid, including screenshots",
  },
  {
    label: "Case Studies",
    href: null,
    description: "The long-form write-ups",
  },
];

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
      <h1 className="mt-2 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Dashboard
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        You are authenticated. Every public page on this site now renders straight from the
        database on each request, so a content change shows up on the next page load — no
        rebuild and no deploy.
      </p>

      <section className="mt-12">
        <h2 className="font-heading text-xl font-medium text-foreground">Editable sections</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {sections.map((section) => (
            <li
              key={section.label}
              className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
              <span>
                {section.href ? (
                  <Link href={section.href} className="font-medium text-foreground hover:text-caramel">
                    {section.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{section.label}</span>
                )}
                {" — "}
                {section.description}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
