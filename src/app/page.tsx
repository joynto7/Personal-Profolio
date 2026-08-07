import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Skills } from "@/components/sections/skills";
import { Education } from "@/components/sections/education";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { CaseStudies } from "@/components/sections/case-studies";
import { Contact } from "@/components/sections/contact";
import { getProfile, prisma } from "@/lib/prisma";

export default async function Home() {
  const [profile, socials, education, experience] = await Promise.all([
    getProfile(),
    prisma.social.findMany({ orderBy: { order: "asc" } }),
    prisma.educationEntry.findMany({ orderBy: { order: "asc" } }),
    prisma.experienceEntry.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <Hero profile={profile} socials={socials} />
      <About profile={profile} />
      <Skills />
      <Education entries={education} />
      <Experience entries={experience} />
      <Projects />
      <CaseStudies />
      <Contact profile={profile} />
    </main>
  );
}
