"use client";

import { motion } from "framer-motion";
import { skills, type Skill } from "@/data/skills";

function SkillChip({ skill, delay }: { skill: Skill; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay }}
      className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background px-4 py-5 text-center transition-colors hover:border-caramel"
    >
      <skill.icon
        className={`size-7 shrink-0 ${skill.monochrome ? "text-foreground" : ""}`}
        style={skill.monochrome ? undefined : { color: skill.color }}
      />
      <span className="text-sm font-medium text-foreground">{skill.name}</span>
    </motion.div>
  );
}

export function Skills() {
  return (
    <section id="skills" className="scroll-mt-20 bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            Skills
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            Tools I build with
          </h2>
          <p className="mt-4 text-muted-foreground">
            A snapshot of the languages, frameworks, and tools I reach for
            most, grouped by where they fit in the stack.
          </p>
        </motion.div>

        <div className="mt-14 flex flex-col gap-10">
          {skills.map((group) => (
            <div key={group.category}>
              <h3 className="font-heading text-xl font-medium text-foreground">
                {group.category}
              </h3>
              <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                {group.skills.map((skill, i) => (
                  <SkillChip key={skill.name} skill={skill} delay={i * 0.04} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
