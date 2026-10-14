"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { CaseStudy } from "@prisma/client";
import { SectionHeader } from "@/components/scifi/section-header";
import { TechBadge } from "@/components/scifi/tech-badge";
import { projectMeta } from "@/lib/project-icons";

export function CaseStudies({ caseStudies, number }: { caseStudies: CaseStudy[]; number: number }) {
  if (caseStudies.length === 0) return null;

  return (
    <section id="case-studies" className="scroll-mt-24 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          number={number}
          title="Case Studies"
          subtitle="The engineering behind the projects: architecture, technical challenges and the decisions in between."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {caseStudies.map((caseStudy, i) => (
            <motion.div
              key={caseStudy.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              data-guide={`${caseStudy.name} case study. ${caseStudy.tagline.replace(/[.!?]$/, "")}.`}
              style={{ "--sf-accent": projectMeta(caseStudy.slug, i).accent } as CSSProperties}
              className="holo-card group/card relative flex flex-col overflow-hidden rounded-[22px] sm:flex-row"
            >
              <span aria-hidden className="sf-sweep" style={{ "--sweep-delay": `${i * 2.2}s` } as CSSProperties} />
              <div className="relative aspect-video shrink-0 overflow-hidden sm:aspect-auto sm:w-56">
                <Image
                  src={caseStudy.imageUrl}
                  alt={caseStudy.name}
                  fill
                  sizes="(min-width: 640px) 14rem, 100vw"
                  className="object-cover transition-transform duration-700 group-hover/card:scale-105"
                />
                <span aria-hidden className="holo-scanlines" />
              </div>

              <div className="relative flex flex-1 flex-col p-6">
                <p className="sf-label text-[color:var(--sf-accent)]">Case study</p>
                <h3 className="mt-1 font-heading text-xl font-semibold text-foreground">{caseStudy.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{caseStudy.tagline}</p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {caseStudy.techStack.slice(0, 5).map((tech) => (
                    <TechBadge key={tech} name={tech} />
                  ))}
                </div>

                <Link
                  href={`/case-studies/${caseStudy.slug}`}
                  className="group/link mt-5 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-foreground transition-colors hover:text-[color:var(--sf-accent)]"
                >
                  Read Case Study
                  <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
