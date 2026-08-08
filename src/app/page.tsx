import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Skills } from "@/components/sections/skills";
import { Education } from "@/components/sections/education";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { CaseStudies } from "@/components/sections/case-studies";
import { Contact } from "@/components/sections/contact";
import { getProfile, getSocials, prisma } from "@/lib/prisma";

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

  return (
    <main className="flex flex-1 flex-col">
      <Hero profile={profile} socials={socials} />
      <About profile={profile} />
      <Skills skillGroups={skillGroups} />
      <Education entries={education} />
      <Experience entries={experience} />
      <Projects projects={projects} />
      <CaseStudies caseStudies={caseStudies} />
      <Contact profile={profile} />
    </main>
  );
}
