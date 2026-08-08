import { cache } from "react";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * The profile is a singleton read by the root layout, its generateMetadata, the homepage
 * and the OG image. `cache` collapses those into a single query per request.
 * Throws if the seed has not run — failing loudly beats silently rendering a blank site.
 */
export const getProfile = cache(() =>
  prisma.profile.findUniqueOrThrow({ where: { id: 1 } })
);

export const getProjectBySlug = cache((slug: string) =>
  prisma.project.findUnique({ where: { slug } })
);

export const getCaseStudyBySlug = cache((slug: string) =>
  prisma.caseStudy.findUnique({ where: { slug } })
);

/**
 * Socials are read by both the root layout (Navbar/Footer) and the homepage (Hero).
 * `cache` collapses those into a single query per request.
 */
export const getSocials = cache(() =>
  prisma.social.findMany({ orderBy: { order: "asc" } })
);
