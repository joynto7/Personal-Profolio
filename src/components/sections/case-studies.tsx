"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { caseStudies } from "@/data/case-studies";

export function CaseStudies() {
  if (caseStudies.length === 0) return null;

  return (
    <section id="case-studies" className="scroll-mt-20 bg-background py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            Case Studies
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            The Engineering Behind the Projects
          </h2>
          <p className="mt-4 text-muted-foreground">
            A closer look at how these were actually built — architecture,
            technical challenges, and the decisions in between.
          </p>
        </motion.div>

        <div className="mt-14 flex flex-col gap-8">
          {caseStudies.map((caseStudy, i) => (
            <motion.div
              key={caseStudy.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg sm:flex-row"
            >
              <div className="relative aspect-video shrink-0 overflow-hidden sm:aspect-square sm:w-64">
                <Image
                  src={caseStudy.image}
                  alt={caseStudy.name}
                  fill
                  sizes="(min-width: 640px) 16rem, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-heading text-xl font-medium text-foreground">
                  {caseStudy.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {caseStudy.tagline}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {caseStudy.techStack.slice(0, 5).map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>

                <Link
                  href={`/case-studies/${caseStudy.slug}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-caramel"
                >
                  Read Case Study
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
