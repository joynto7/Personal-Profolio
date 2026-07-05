"use client";

import { motion } from "framer-motion";
import { projects } from "@/data/projects";
import { ProjectCard } from "@/components/sections/project-card";

export function Projects() {
  if (projects.length === 0) return null;

  return (
    <section id="projects" className="scroll-mt-20 bg-muted py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            Projects
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            Things I&apos;ve Built
          </h2>
          <p className="mt-4 text-muted-foreground">
            A selection of projects that show how I think about product,
            architecture, and the details in between.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard key={project.slug} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
