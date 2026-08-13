import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Boxes,
  Database,
  ExternalLink,
  Lightbulb,
  Lock,
  Puzzle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCaseStudyBySlug } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

type Screenshot = { url: string; caption: string };
type CodeSnippet = { title: string; language: string; code: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = await getCaseStudyBySlug(slug);
  if (!caseStudy) return {};
  return {
    title: `${caseStudy.name} — Case Study`,
    description: caseStudy.tagline,
  };
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const caseStudy = await getCaseStudyBySlug(slug);

  if (!caseStudy) notFound();

  const screenshots = caseStudy.screenshots as unknown as Screenshot[];
  const codeSnippets = caseStudy.codeSnippets as unknown as CodeSnippet[];

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/#projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>

      <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl border border-border shadow-sm">
        <Image
          src={caseStudy.imageUrl}
          alt={caseStudy.name}
          fill
          sizes="(min-width: 1024px) 56rem, 100vw"
          className="object-cover"
          priority
        />
      </div>

      <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-primary">
        Case Study
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        {caseStudy.name}
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">{caseStudy.tagline}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {caseStudy.techStack.map((tech) => (
          <Badge key={tech} variant="secondary">
            {tech}
          </Badge>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {caseStudy.liveUrl && (
          <Button asChild>
            <a href={caseStudy.liveUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Live Demo
            </a>
          </Button>
        )}
        {caseStudy.githubUrl ? (
          <Button variant="outline" asChild>
            <a href={caseStudy.githubUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              GitHub Repo
            </a>
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-4" />
            Source is private
          </span>
        )}
      </div>

      <section className="mt-12">
        <h2 className="font-heading text-xl font-medium text-foreground">Overview</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">{caseStudy.overview}</p>
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-2">
          <Boxes className="size-5 text-primary" />
          <h2 className="font-heading text-xl font-medium text-foreground">
            Architecture & Tech Stack
          </h2>
        </div>
        <p className="mt-3 leading-relaxed text-muted-foreground">{caseStudy.architecture}</p>
      </section>

      <section className="mt-12">
        <h2 className="font-heading text-xl font-medium text-foreground">System Design</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">{caseStudy.systemDesign}</p>
      </section>

      {caseStudy.databaseDesign && (
        <section className="mt-12">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium text-foreground">
              Database Design
            </h2>
          </div>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {caseStudy.databaseDesign}
          </p>
        </section>
      )}

      {caseStudy.security && (
        <section className="mt-12">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium text-foreground">Security</h2>
          </div>
          <p className="mt-3 leading-relaxed text-muted-foreground">{caseStudy.security}</p>
        </section>
      )}

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <section>
          <div className="flex items-center gap-2">
            <Puzzle className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium text-foreground">
              Challenges & Decisions
            </h2>
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {caseStudy.challenges.map((challenge) => (
              <li
                key={challenge}
                className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
                {challenge}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-center gap-2">
            <Lightbulb className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium text-foreground">
              Future Improvements
            </h2>
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {caseStudy.futureImprovements.map((improvement) => (
              <li
                key={improvement}
                className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
                {improvement}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {caseStudy.lessonsLearned.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-medium text-foreground">Lessons Learned</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {caseStudy.lessonsLearned.map((lesson) => (
              <li
                key={lesson}
                className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
                {lesson}
              </li>
            ))}
          </ul>
        </section>
      )}

      {screenshots.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-medium text-foreground">Screenshots</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {screenshots.map((shot, index) => (
              <figure key={`${shot.url}-${index}`}>
                <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
                  <Image
                    src={shot.url}
                    alt={shot.caption}
                    fill
                    sizes="(min-width: 640px) 28rem, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-2 text-sm text-muted-foreground">
                  {shot.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {codeSnippets.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-medium text-foreground">Code Snippets</h2>
          <div className="mt-4 flex flex-col gap-6">
            {codeSnippets.map((snippet, index) => (
              <div key={`${snippet.title}-${index}`}>
                <p className="mb-2 text-sm font-medium text-foreground">
                  {snippet.title}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {snippet.language}
                  </span>
                </p>
                <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 text-sm">
                  <code>{snippet.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
