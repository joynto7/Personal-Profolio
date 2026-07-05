"use client";

import { motion } from "framer-motion";
import { Compass, Heart, Coffee } from "lucide-react";
import { profile } from "@/data/profile";

const blocks = [
  {
    icon: Compass,
    title: "My Journey",
    text: profile.bio.journey,
  },
  {
    icon: Heart,
    title: "What I Enjoy",
    text: profile.bio.enjoy,
  },
  {
    icon: Coffee,
    title: "Outside of Code",
    text: profile.bio.hobbies,
  },
];

export function About() {
  return (
    <section id="about" className="scroll-mt-20 bg-muted py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            About Me
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            The person behind the code
          </h2>
          <p className="mt-4 text-muted-foreground">
            A quick look at how I got here, the kind of work that keeps me
            engaged, and what I get up to when I&apos;m away from the
            keyboard.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {blocks.map((block, i) => (
            <motion.div
              key={block.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="rounded-2xl border border-border bg-card p-8 shadow-sm"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <block.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-heading text-xl font-medium text-foreground">
                {block.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {block.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
