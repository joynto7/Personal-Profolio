"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Phone, MessageCircle, Loader2, Send } from "lucide-react";
import type { Profile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema } from "@/lib/contact-schema";
import { HudPanel } from "@/components/scifi/hud-panel";
import { SectionHeader } from "@/components/scifi/section-header";

type FormState = {
  name: string;
  email: string;
  message: string;
};

const initialState: FormState = { name: "", email: "", message: "" };

export function Contact({ profile, number }: { profile: Profile; number: number }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const contactMethods = [
    {
      icon: Mail,
      label: "Email",
      value: profile.email,
      href: `mailto:${profile.email}`,
    },
    {
      icon: Phone,
      label: "Phone",
      value: profile.phone,
      href: `tel:${profile.phone.replace(/\s+/g, "")}`,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: profile.whatsapp,
      href: `https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`,
    },
  ];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FormState;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) throw new Error("Request failed");

      toast.success("Message sent — I'll get back to you soon.");
      setForm(initialState);
    } catch {
      toast.error("Something went wrong. Please try again or email me directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="contact" className="scroll-mt-24 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          number={number}
          title="Let's Work Together"
          subtitle="Have a role, a project, or just want to say hi? My inbox is always open."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4"
          >
            {contactMethods.map((method) => (
              <a
                key={method.label}
                href={method.href}
                target={method.label === "WhatsApp" ? "_blank" : undefined}
                rel={method.label === "WhatsApp" ? "noopener noreferrer" : undefined}
                className="sf-glass group flex items-center gap-4 rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5 hover:border-caramel"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-caramel/40 bg-caramel/10 text-caramel shadow-[0_0_16px_-6px_var(--caramel)]">
                  <method.icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="sf-label block text-muted-foreground">{method.label}</span>
                  <span className="mt-0.5 block truncate text-sm font-medium text-foreground">{method.value}</span>
                </span>
              </a>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <HudPanel cut={24} className="p-6 sm:p-8">
              <p className="sf-label text-caramel">Transmission</p>
              <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-5">
                <div>
                  <Input
                    placeholder="Your name"
                    aria-label="Name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-11 bg-foreground/[0.03] focus-visible:shadow-[0_0_18px_-6px_var(--caramel)]"
                  />
                  {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>}
                </div>

                <div>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    aria-label="Email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="h-11 bg-foreground/[0.03] focus-visible:shadow-[0_0_18px_-6px_var(--caramel)]"
                  />
                  {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>}
                </div>

                <div>
                  <Textarea
                    placeholder="Tell me a bit about what you have in mind…"
                    aria-label="Message"
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="bg-foreground/[0.03] focus-visible:shadow-[0_0_18px_-6px_var(--caramel)]"
                  />
                  {errors.message && <p className="mt-1.5 text-xs text-destructive">{errors.message}</p>}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="h-11 self-start rounded-xl border-0 bg-linear-to-r from-cyan-500 via-blue-500 to-violet-500 px-5 font-semibold text-white shadow-[0_0_24px_-6px_rgba(34,211,238,0.85)] hover:brightness-110"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {submitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </HudPanel>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
