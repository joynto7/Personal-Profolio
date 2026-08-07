-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "resumeUrl" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "bioJourney" TEXT NOT NULL,
    "bioEnjoy" TEXT NOT NULL,
    "bioHobbies" TEXT NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGroup" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SkillGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "monochrome" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationEntry" (
    "id" SERIAL NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "startYear" TEXT NOT NULL,
    "endYear" TEXT NOT NULL,
    "description" TEXT,
    "achievements" TEXT[],
    "order" INTEGER NOT NULL,

    CONSTRAINT "EducationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceEntry" (
    "id" SERIAL NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "highlights" TEXT[],
    "order" INTEGER NOT NULL,

    CONSTRAINT "ExperienceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "imageUrl" TEXT NOT NULL,
    "techStack" TEXT[],
    "description" TEXT,
    "liveUrl" TEXT,
    "githubUrl" TEXT,
    "challenges" TEXT[],
    "futureImprovements" TEXT[],
    "caseStudySlug" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudy" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "techStack" TEXT[],
    "liveUrl" TEXT,
    "githubUrl" TEXT,
    "overview" TEXT NOT NULL,
    "architecture" TEXT NOT NULL,
    "systemDesign" TEXT NOT NULL,
    "databaseDesign" TEXT,
    "security" TEXT,
    "challenges" TEXT[],
    "lessonsLearned" TEXT[],
    "futureImprovements" TEXT[],
    "screenshots" JSONB NOT NULL DEFAULT '[]',
    "codeSnippets" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL,

    CONSTRAINT "CaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Social" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Social_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillGroup_category_key" ON "SkillGroup"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CaseStudy_slug_key" ON "CaseStudy"("slug");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SkillGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
