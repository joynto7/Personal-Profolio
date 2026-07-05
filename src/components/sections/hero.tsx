"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { profile } from "@/data/profile";
import { socials } from "@/data/socials";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function Hero() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-12 px-6 py-20 md:flex-row md:py-28">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col items-center text-center md:items-start md:text-left"
      >
        <motion.span
          variants={item}
          className="text-sm font-semibold tracking-widest text-caramel uppercase"
        >
          {profile.designation}
        </motion.span>

        <motion.h1
          variants={item}
          className="mt-4 font-heading text-4xl font-medium text-foreground sm:text-5xl md:text-6xl"
        >
          Hi, I&apos;m {profile.name}
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-5 max-w-lg text-lg text-muted-foreground"
        >
          {profile.tagline}
        </motion.p>

        <motion.div variants={item} className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
          <Button size="lg" asChild>
            <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
              <Download className="size-4" />
              View Resume
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/#contact">Get in Touch</Link>
          </Button>
        </motion.div>

        <motion.div variants={item} className="mt-8 flex gap-3">
          {socials.map((social) => (
            <Tooltip key={social.label}>
              <TooltipTrigger asChild>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-caramel hover:bg-caramel hover:text-white"
                >
                  <social.icon className="size-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent>{social.label}</TooltipContent>
            </Tooltip>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative flex flex-1 items-center justify-center"
      >
        <div className="absolute size-72 rounded-full bg-latte/50 blur-2xl sm:size-[28rem]" />
        <div className="relative size-64 overflow-hidden rounded-full border-4 border-background shadow-xl sm:size-96">
          <Image
            src={profile.avatarSrc}
            alt={profile.name}
            fill
            sizes="(min-width: 640px) 24rem, 16rem"
            className="object-cover"
            priority
          />
        </div>
      </motion.div>
    </section>
  );
}
