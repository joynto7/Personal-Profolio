import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
};

const sections = [
  "Profile — name, designation, tagline, location, contact details, and the three bio paragraphs",
  "Skills — skill groups and the entries inside them",
  "Education — academic timeline entries",
  "Experience — work timeline entries",
  "Projects — the project grid, including screenshots",
  "Case Studies — the long-form write-ups",
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
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The editing forms arrive in the next stage of this feature. They are listed here as
          plain text because their routes do not exist yet.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {sections.map((section) => (
            <li
              key={section}
              className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
              {section}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
