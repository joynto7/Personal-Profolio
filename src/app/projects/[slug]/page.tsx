import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, Lightbulb, Puzzle } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProjectBySlug } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.tagline ?? project.name,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) notFound();
  if (project.caseStudySlug) permanentRedirect(`/case-studies/${project.caseStudySlug}`);

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
          src={project.imageUrl}
          alt={project.name}
          fill
          sizes="(min-width: 1024px) 56rem, 100vw"
          className="object-cover"
          priority
        />
      </div>

      <h1 className="mt-8 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        {project.name}
      </h1>
      {project.tagline && (
        <p className="mt-2 text-lg text-muted-foreground">{project.tagline}</p>
      )}

      {project.techStack.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {project.techStack.map((tech) => (
            <Badge key={tech} variant="secondary">
              {tech}
            </Badge>
          ))}
        </div>
      )}

      {(project.liveUrl || project.githubUrl) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {project.liveUrl && (
            <Button asChild>
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Live Project
              </a>
            </Button>
          )}
          {project.githubUrl && (
            <Button variant="outline" asChild>
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <FaGithub className="size-4" />
                GitHub Repo
              </a>
            </Button>
          )}
        </div>
      )}

      {project.description && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-medium text-foreground">
            About This Project
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        </section>
      )}

      {(project.challenges.length > 0 || project.futureImprovements.length > 0) && (
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {project.challenges.length > 0 && (
            <section>
              <div className="flex items-center gap-2">
                <Puzzle className="size-5 text-primary" />
                <h2 className="font-heading text-xl font-medium text-foreground">
                  Challenges Faced
                </h2>
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {project.challenges.map((challenge) => (
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
          )}

          {project.futureImprovements.length > 0 && (
            <section>
              <div className="flex items-center gap-2">
                <Lightbulb className="size-5 text-primary" />
                <h2 className="font-heading text-xl font-medium text-foreground">
                  Future Improvements
                </h2>
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {project.futureImprovements.map((improvement) => (
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
          )}
        </div>
      )}
    </main>
  );
}
