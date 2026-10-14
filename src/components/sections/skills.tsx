"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { Database, Layers, Monitor, Server, Wrench, type LucideIcon } from "lucide-react";
import type { Prisma, Skill } from "@prisma/client";
import { ICONS } from "@/lib/icons";
import { HudPanel } from "@/components/scifi/hud-panel";
import { SectionHeader } from "@/components/scifi/section-header";
import { cn } from "@/lib/utils";

export type SkillGroupWithSkills = Prisma.SkillGroupGetPayload<{
  include: { skills: true };
}>;

const ACCENTS = ["#3b82f6", "#10b981", "#8b5cf6", "#f97316", "#d946ef"];

/** Category names are free text in the admin, so the console icon is picked by keyword. */
const GROUP_ICONS: [RegExp, LucideIcon][] = [
  [/front|ui|client/i, Monitor],
  [/back|api|server/i, Server],
  [/data|infra|cloud|devops|database/i, Database],
  [/tool/i, Wrench],
];

function groupIcon(category: string) {
  return GROUP_ICONS.find(([pattern]) => pattern.test(category))?.[1] ?? Layers;
}

/** Outer consoles turn toward the center, like a curved control desk. */
function consoleTransform(index: number, count: number) {
  if (count !== 3) return undefined;
  return [
    "md:[transform:perspective(1200px)_rotateY(14deg)_translateZ(-30px)]",
    "md:[transform:translateY(-18px)]",
    "md:[transform:perspective(1200px)_rotateY(-14deg)_translateZ(-30px)]",
  ][index];
}

function SkillRow({ skill, delay }: { skill: Skill; delay: number }) {
  const Icon = ICONS[skill.iconKey];
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.35, delay }}
      className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 transition-colors hover:border-[color:var(--sf-accent)] hover:bg-[color:var(--sf-accent)]/10"
    >
      {Icon && (
        <Icon
          className={`size-4 shrink-0 ${skill.monochrome ? "text-foreground" : ""}`}
          style={skill.monochrome ? undefined : { color: skill.color }}
        />
      )}
      <span className="text-sm font-medium text-foreground">{skill.name}</span>
    </motion.li>
  );
}

export function Skills({ skillGroups, number }: { skillGroups: SkillGroupWithSkills[]; number: number }) {
  return (
    <section id="skills" className="scroll-mt-24 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader number={number} title="Tech Stack" subtitle="Technologies I work with." />

        <div className="relative mt-14 pb-16">
          <div aria-hidden className="tech-stage hidden md:block">
            <span />
            <span />
            <span />
          </div>

          <div className="relative grid gap-6 md:grid-cols-3 md:items-end">
            {skillGroups.map((group, i) => {
              const Icon = groupIcon(group.category);
              const accent = ACCENTS[i % ACCENTS.length];
              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: "easeOut" }}
                  style={{ "--sf-accent": accent } as CSSProperties}
                >
                  <div className={cn("transition-transform duration-500", consoleTransform(i, skillGroups.length))}>
                    <HudPanel accent={accent} cut={20} className="p-5 motion-safe:animate-[sf-float_8s_ease-in-out_infinite]" style={{ animationDelay: `${-i * 2.4}s` }}>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex size-11 items-center justify-center rounded-xl text-white shadow-[0_0_20px_-4px_var(--sf-accent)]"
                          style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--sf-accent) 55%, #0b1022), var(--sf-accent))" }}
                        >
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <h3 className="font-heading text-lg font-semibold text-foreground">{group.category}</h3>
                          <p className="sf-label text-muted-foreground">{group.skills.length} technologies</p>
                        </div>
                      </div>
                      <ul className="mt-5 grid gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                        {group.skills.map((skill, j) => (
                          <SkillRow key={skill.id} skill={skill} delay={0.2 + j * 0.05} />
                        ))}
                      </ul>
                    </HudPanel>
                    <div aria-hidden className="mx-auto mt-2 h-10 w-px bg-linear-to-b from-[color:var(--sf-accent)] to-transparent opacity-70" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
