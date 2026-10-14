import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Skills } from "@/components/sections/skills";
import { Education } from "@/components/sections/education";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { CaseStudies } from "@/components/sections/case-studies";
import { Contact } from "@/components/sections/contact";
import { getProfile, getSocials, prisma } from "@/lib/prisma";
import { FEATURED_COUNT } from "@/lib/project-icons";

export default async function Home() {
  const [profile, socials, skillGroups, education, experience, projects, caseStudies] =
    await Promise.all([
      getProfile(),
      getSocials(),
      prisma.skillGroup.findMany({
        orderBy: { order: "asc" },
        include: { skills: { orderBy: { order: "asc" } } },
      }),
      prisma.educationEntry.findMany({ orderBy: { order: "asc" } }),
      prisma.experienceEntry.findMany({ orderBy: { order: "asc" } }),
      prisma.project.findMany({ orderBy: { order: "asc" } }),
      prisma.caseStudy.findMany({ orderBy: { order: "asc" } }),
    ]);

  // Sections are numbered 01, 02… in page order, skipping any that render nothing.
  // Past FEATURED_COUNT projects, "Other Projects" takes a number of its own.
  const slots = [
    ["projects", projects.length === 0 ? 0 : projects.length > FEATURED_COUNT ? 2 : 1],
    ["skills", 1],
    ["about", 1],
    ["experience", 1],
    ["education", 1],
    ["caseStudies", caseStudies.length > 0 ? 1 : 0],
    ["contact", 1],
  ] as const;
  const numbers = Object.fromEntries(
    slots.map(([key], i) => [key, 1 + slots.slice(0, i).reduce((sum, [, count]) => sum + count, 0)])
  ) as Record<(typeof slots)[number][0], number>;

  return (
    <main className="flex flex-1 flex-col">
      <Hero
        profile={profile}
        socials={socials}
        projectCount={projects.length}
        techCount={skillGroups.reduce((sum, group) => sum + group.skills.length, 0)}
      />
      <Projects
        projects={projects}
        number={numbers.projects}
        caseStudyOverviews={Object.fromEntries(
          caseStudies.map((caseStudy) => [caseStudy.slug, caseStudy.overview])
        )}
        githubUrl={socials.find((social) => social.iconKey === "social-github")?.url}
      />
      <Skills skillGroups={skillGroups} number={numbers.skills} />
      <About profile={profile} number={numbers.about} />
      <Experience entries={experience} number={numbers.experience} />
      <Education entries={education} number={numbers.education} />
      <CaseStudies caseStudies={caseStudies} number={numbers.caseStudies} />
      <Contact profile={profile} number={numbers.contact} />
    </main>
  );
}
