import type {
  CaseStudy,
  EducationEntry,
  ExperienceEntry,
  Profile,
  Project,
  Skill,
  SkillGroup,
  Social,
} from "@prisma/client";
import { cvFacts, siteFacts } from "@/data/chatbot";
import { navLinks } from "@/data/nav-links";
import { prisma } from "@/lib/prisma";

export type PortfolioContent = {
  profile: Profile;
  socials: Social[];
  skillGroups: (SkillGroup & { skills: Skill[] })[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: Project[];
  caseStudies: CaseStudy[];
};

export type PortfolioKnowledge = {
  profile: Profile;
  socials: Social[];
  /** Everything the assistant knows, as one document for the system prompt. */
  document: string;
  /** Project and case study paths → what the visitor is looking at, for resolving "this project". */
  pages: Map<string, string>;
};

/** Long code snippets are cut here so one case study can't crowd out the rest. */
const MAX_SNIPPET_CHARS = 3000;

export function projectPagePath(project: Pick<Project, "slug" | "caseStudySlug">) {
  return project.caseStudySlug ? `/case-studies/${project.caseStudySlug}` : `/projects/${project.slug}`;
}

function bullets(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

/** Joins labelled lines, skipping any whose value is empty. */
function lines(entries: [label: string, value: string | null | undefined][]) {
  return entries
    .flatMap(([label, value]) => (value?.trim() ? [`${label}: ${value.trim()}`] : []))
    .join("\n");
}

function listSection(title: string, items: string[]) {
  return items.length > 0 ? `${title}:\n${bullets(items)}` : "";
}

function jsonArray<T>(value: unknown, isItem: (item: unknown) => item is T): T[] {
  return Array.isArray(value) ? value.filter(isItem) : [];
}

function isScreenshot(item: unknown): item is { caption: string } {
  return typeof item === "object" && item !== null && typeof (item as { caption?: unknown }).caption === "string";
}

function isCodeSnippet(item: unknown): item is { title: string; language: string; code: string } {
  const snippet = item as { title?: unknown; language?: unknown; code?: unknown };
  return (
    typeof item === "object" &&
    item !== null &&
    typeof snippet.title === "string" &&
    typeof snippet.language === "string" &&
    typeof snippet.code === "string"
  );
}

function section(title: string, body: string) {
  return `# ${title}\n\n${body.trim()}`;
}

function projectBlock(project: Project) {
  return [
    `## ${project.name}`,
    lines([
      ["Page on this site", projectPagePath(project)],
      ["Tagline", project.tagline],
      ["Tech stack", project.techStack.join(", ")],
      ["Live demo", project.liveUrl],
      ["Source code", project.githubUrl],
      ["Description", project.description],
    ]),
    listSection("Challenges", project.challenges),
    listSection("Future improvements", project.futureImprovements),
  ]
    .filter(Boolean)
    .join("\n");
}

function caseStudyBlock(caseStudy: CaseStudy) {
  const captions = jsonArray(caseStudy.screenshots, isScreenshot)
    .map((screenshot) => screenshot.caption.trim())
    .filter(Boolean);
  const snippets = jsonArray(caseStudy.codeSnippets, isCodeSnippet).map((snippet) => {
    const code =
      snippet.code.length > MAX_SNIPPET_CHARS ? `${snippet.code.slice(0, MAX_SNIPPET_CHARS)}\n… (cut short)` : snippet.code;
    return `Code snippet "${snippet.title}" (${snippet.language}):\n${code}`;
  });

  return [
    `## ${caseStudy.name}`,
    lines([
      ["Page on this site", `/case-studies/${caseStudy.slug}`],
      ["Tagline", caseStudy.tagline],
      ["Tech stack", caseStudy.techStack.join(", ")],
      ["Live demo", caseStudy.liveUrl],
      ["Source code", caseStudy.githubUrl],
      ["Overview", caseStudy.overview],
      ["Architecture", caseStudy.architecture],
      ["System design", caseStudy.systemDesign],
      ["Database design", caseStudy.databaseDesign],
      ["Security", caseStudy.security],
    ]),
    listSection("Technical challenges", caseStudy.challenges),
    listSection("Lessons learned", caseStudy.lessonsLearned),
    listSection("Future improvements", caseStudy.futureImprovements),
    listSection("Screenshots on the page", captions),
    ...snippets,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Turns the site's content into the assistant's reference document. Deterministic for the
 * same content, so the system prompt — and Claude's prompt cache — stays stable between requests.
 */
export function buildKnowledgeDocument(content: PortfolioContent) {
  const { profile, socials, skillGroups, education, experience, projects, caseStudies } = content;
  const firstName = profile.name.split(/\s+/)[0];

  const contact = lines([
    ["Email", profile.email],
    // The numbers themselves stay out: Gemini's privacy filter blocks answers that write out a
    // personal phone number, and the Contact section shows them anyway.
    [
      "Phone and WhatsApp",
      profile.phone || profile.whatsapp ? "shown in the Contact section (/#contact), which has a WhatsApp chat button" : null,
    ],
    ["Contact form", "/#contact (messages go straight to the inbox)"],
    ["Resume / CV (PDF)", profile.resumeUrl],
    ...socials.map((social): [string, string] => [social.label, social.url]),
  ]);

  const about = [
    `Journey into programming: ${profile.bioJourney}`,
    `What ${firstName} enjoys about the work: ${profile.bioEnjoy}`,
    `Hobbies and interests: ${profile.bioHobbies}`,
  ].join("\n\n");

  const skills = skillGroups
    .filter((group) => group.skills.length > 0)
    .map((group) => `- ${group.category}: ${group.skills.map((skill) => skill.name).join(", ")}`)
    .join("\n");

  const educationText = education
    .map((entry) =>
      [
        `## ${entry.degree} — ${entry.institution} (${entry.startYear} – ${entry.endYear})`,
        lines([
          ["Field", entry.field],
          ["About", entry.description],
        ]),
        listSection("Achievements", entry.achievements),
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");

  const experienceText = experience
    .map((entry) =>
      [
        `## ${entry.role} — ${entry.company} (${entry.startDate} – ${entry.endDate})`,
        entry.description,
        listSection("Highlights", entry.highlights),
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");

  const siteMap = bullets([
    "Home: /",
    ...navLinks.map((link) => `${link.label}: ${link.href}`),
    ...projects.map((project) => `${project.name}: ${projectPagePath(project)}`),
    ...caseStudies
      .filter((caseStudy) => !projects.some((project) => project.caseStudySlug === caseStudy.slug))
      .map((caseStudy) => `${caseStudy.name} case study: /case-studies/${caseStudy.slug}`),
  ]);

  return [
    section(
      "Profile",
      lines([
        ["Name", profile.name],
        ["Title", profile.designation],
        ["Based in", profile.location],
        [`Homepage headline (in ${firstName}'s own words)`, `"${profile.tagline}"`],
      ])
    ),
    section("Contact and links", contact),
    section(`About ${firstName} (written by ${firstName} in the first person)`, about),
    skills && section("Skills shown on the site", skills),
    educationText && section("Education", educationText),
    experienceText && section("Experience", experienceText),
    projects.length > 0 && section("Projects", projects.map(projectBlock).join("\n\n")),
    caseStudies.length > 0 &&
      section("Case studies (in-depth engineering write-ups)", caseStudies.map(caseStudyBlock).join("\n\n")),
    section(`More from ${firstName}'s CV`, cvFacts),
    section("About this website", siteFacts),
    section("Site map (link to these with relative paths)", siteMap),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildPageIndex(content: PortfolioContent) {
  const pages = new Map<string, string>();
  for (const project of content.projects) {
    pages.set(`/projects/${project.slug}`, `the ${project.name} project page`);
  }
  for (const caseStudy of content.caseStudies) {
    pages.set(`/case-studies/${caseStudy.slug}`, `the ${caseStudy.name} case study`);
  }
  return pages;
}

async function loadPortfolioContent(): Promise<PortfolioContent> {
  // `id` breaks ties in `order`, so the document — and the prompt cache — doesn't reshuffle.
  const [profile, socials, skillGroups, education, experience, projects, caseStudies] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.social.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
    prisma.skillGroup.findMany({
      orderBy: [{ order: "asc" }, { id: "asc" }],
      include: { skills: { orderBy: [{ order: "asc" }, { id: "asc" }] } },
    }),
    prisma.educationEntry.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
    prisma.experienceEntry.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
    prisma.project.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
    prisma.caseStudy.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
  ]);
  return { profile, socials, skillGroups, education, experience, projects, caseStudies };
}

/** Admin edits reach the assistant within this long; a conversation's burst of messages shares one load. */
const CACHE_TTL_MS = 60_000;

let cached: { knowledge: PortfolioKnowledge; expiresAt: number } | undefined;
let loading: Promise<PortfolioKnowledge> | undefined;

export function getPortfolioKnowledge(): Promise<PortfolioKnowledge> {
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.knowledge);
  loading ??= loadPortfolioContent()
    .then((content) => {
      const knowledge = {
        profile: content.profile,
        socials: content.socials,
        document: buildKnowledgeDocument(content),
        pages: buildPageIndex(content),
      };
      cached = { knowledge, expiresAt: Date.now() + CACHE_TTL_MS };
      return knowledge;
    })
    .finally(() => {
      loading = undefined;
    });
  return loading;
}
