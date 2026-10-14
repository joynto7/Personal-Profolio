"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, BadgeCheck, Box, Cpu, Download, Mail } from "lucide-react";
import type { Profile, Social } from "@prisma/client";
import { HudPanel } from "@/components/scifi/hud-panel";
import { AnimatedCounter } from "@/components/scifi/animated-counter";
import { SceneFallback } from "@/components/hero/scene-fallback";
import { navLinks } from "@/data/nav-links";

// three.js only loads in the browser, after the page is interactive.
const HeroScene = dynamic(() => import("@/components/hero/hero-scene"), {
  ssr: false,
  loading: () => <SceneFallback />,
});

/** Shown after the designation from the profile. */
const ROLES = ["AI Enthusiast", "Problem Solver"];

export function Hero({
  profile,
  socials,
  projectCount,
  techCount,
}: {
  profile: Profile;
  socials: Social[];
  projectCount: number;
  techCount: number;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const words = profile.name.trim().split(/\s+/);
  const lastName = words.length > 1 ? words.pop() : undefined;
  const github = socials.find((social) => social.iconKey === "social-github")?.url;
  const projectsGuide = navLinks.find((link) => link.href === "/#projects")?.guide;

  const stats = [
    { icon: Box, value: projectCount, suffix: "+", label: "Projects" },
    { icon: Cpu, value: techCount, suffix: "+", label: "Technologies" },
    { icon: BadgeCheck, value: 100, suffix: "%", label: "Passion" },
  ];

  return (
    <section id="top" className="relative mx-auto w-full max-w-7xl px-4 pt-6 pb-8 sm:px-6 lg:pt-10">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10"
        >
          <HudPanel cut={26} className="p-7 sm:p-10">
            <p className="text-lg text-muted-foreground">Hi, I&apos;m</p>
            <h1 className="mt-2 font-heading text-5xl leading-[1.04] font-bold tracking-tight text-foreground sm:text-6xl xl:text-7xl">
              {words.join(" ")} {lastName && <span className="sf-gradient-text">{lastName}</span>}
            </h1>
            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/85 sm:text-base">
              {[profile.designation, ...ROLES].map((role, i) => (
                <span key={role} className="flex items-center gap-3">
                  {i > 0 && <span aria-hidden className="size-1 rounded-full bg-caramel shadow-[0_0_6px_var(--caramel)]" />}
                  {role}
                </span>
              ))}
            </p>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{profile.tagline}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/#projects"
                data-guide={projectsGuide}
                data-guide-sound="nav"
                className="group inline-flex h-11 items-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 via-blue-500 to-violet-500 px-5 text-sm font-semibold text-white shadow-[0_0_28px_-6px_rgba(34,211,238,0.85)] transition hover:brightness-110"
              >
                View My Projects
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/#contact"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-caramel/45 bg-caramel/5 px-5 text-sm font-semibold text-foreground transition hover:border-caramel hover:bg-caramel/10"
              >
                <Mail className="size-4" />
                Get in Touch
              </Link>
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:text-caramel"
              >
                <Download className="size-4" />
                Résumé
              </a>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2 rounded-2xl border border-caramel/20 bg-foreground/[0.03] p-3 sm:gap-4 sm:p-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-caramel/40 bg-caramel/10 text-caramel shadow-[0_0_14px_-4px_var(--caramel)]">
                    <stat.icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-heading text-lg leading-tight font-semibold text-foreground">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    </span>
                    <span className="block text-xs text-muted-foreground">{stat.label}</span>
                  </span>
                </div>
              ))}
            </div>
          </HudPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
          className="relative h-[380px] overflow-hidden rounded-[28px] bg-[radial-gradient(120%_90%_at_60%_20%,#1e1b4b,#050a1a_70%)] sm:h-[480px] lg:-mr-4 lg:h-[600px] dark:overflow-visible dark:bg-none"
        >
          <HeroScene reduceMotion={reduceMotion} />

          <span className="sf-label pointer-events-none absolute top-4 left-5 flex items-center gap-2 text-cyan-300">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] motion-safe:animate-[sf-pulse_2.4s_ease-in-out_infinite]" />
            System online
          </span>

          {github && (
            <a
              href={github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile — build, deploy, improve"
              className="sf-glass group absolute [--sf-glass:rgba(9,16,38,0.66)] top-10 right-3 hidden w-36 -rotate-6 rounded-2xl p-4 text-white sm:block motion-safe:animate-[sf-float_7s_ease-in-out_infinite]"
            >
              <span className="block font-mono text-xs leading-relaxed text-cyan-100">
                Build •<br />
                Deploy •<br />
                Improve
              </span>
              <span className="absolute -right-3 bottom-3 flex size-8 items-center justify-center rounded-full border border-cyan-300/60 bg-[#050a1a]/90 text-cyan-300 shadow-[0_0_14px_-2px_#22d3ee] transition-transform group-hover:scale-110">
                <ArrowUpRight className="size-4" />
              </span>
            </a>
          )}

          <Link
            href="/#projects"
            aria-label="Turning ideas into real-world solutions — see the projects"
            className="sf-glass group absolute [--sf-glass:rgba(9,16,38,0.66)] right-2 bottom-20 hidden w-44 rounded-2xl p-4 text-white sm:block motion-safe:animate-[sf-float_8s_ease-in-out_infinite_-2s]"
          >
            <span className="block text-sm leading-snug font-medium text-cyan-50">Turning ideas into real-world solutions</span>
            <span className="mt-3 flex size-8 items-center justify-center rounded-full border border-cyan-300/60 text-cyan-300 transition-transform group-hover:translate-x-1">
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </motion.div>
      </div>

      <a
        href="#projects"
        aria-label="Scroll to the projects"
        className="mx-auto mt-8 flex w-fit flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-caramel"
      >
        <span className="sf-label">Scroll</span>
        <span className="relative h-9 w-6 rounded-full border border-current">
          <span className="absolute top-2 left-1/2 h-2 w-0.5 -translate-x-1/2 rounded-full bg-current motion-safe:animate-[sf-scroll_1.8s_ease-in-out_infinite]" />
        </span>
      </a>
    </section>
  );
}
