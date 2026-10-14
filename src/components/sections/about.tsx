"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Compass, Heart, MapPin, Sparkles } from "lucide-react";
import type { Profile } from "@prisma/client";
import { HudPanel } from "@/components/scifi/hud-panel";
import { SectionHeader } from "@/components/scifi/section-header";

export function About({ profile, number }: { profile: Profile; number: number }) {
  const blocks = [
    { icon: Compass, title: "My Journey", text: profile.bioJourney, accent: "#22d3ee" },
    { icon: Heart, title: "What I Enjoy", text: profile.bioEnjoy, accent: "#a78bfa" },
    { icon: Sparkles, title: "Outside of Code", text: profile.bioHobbies, accent: "#f472b6" },
  ];

  return (
    <section id="about" className="scroll-mt-24 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          number={number}
          title="About Me"
          subtitle="How I got here, the work that keeps me engaged, and life away from the keyboard."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <HudPanel cut={24} className="h-full p-6 sm:p-8">
              <div className="relative mx-auto aspect-square w-full max-w-72">
                <span aria-hidden className="absolute inset-0 rounded-full border border-dashed border-caramel/40 motion-safe:animate-[sf-spin_30s_linear_infinite]" />
                <span aria-hidden className="absolute inset-3 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--caramel)_35%,transparent),transparent_70%)]" />
                <div className="absolute inset-6 overflow-hidden rounded-full border-2 border-caramel/60 shadow-[0_0_40px_-8px_var(--caramel)]">
                  <Image src={profile.avatarUrl} alt={profile.name} fill sizes="18rem" className="object-cover" />
                  <span aria-hidden className="holo-scanlines" />
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="font-heading text-xl font-semibold text-foreground">{profile.name}</p>
                <p className="sf-label mt-1 text-caramel">{profile.designation}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  {profile.location}
                </p>
              </div>
            </HudPanel>
          </motion.div>

          <div className="grid gap-5">
            {blocks.map((block, i) => (
              <motion.div
                key={block.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="sf-glass relative overflow-hidden rounded-2xl p-6"
                style={{ "--sf-accent": block.accent } as CSSProperties}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-[color:var(--sf-accent)]/50 bg-[color:var(--sf-accent)]/10 text-[color:var(--sf-accent)]">
                    <block.icon className="size-5" />
                  </span>
                  <h3 className="font-heading text-lg font-semibold text-foreground">{block.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{block.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
