"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Phone, MessageCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema } from "@/lib/contact-schema";
import { profile } from "@/data/profile";

type FormState = {
  name: string;
  email: string;
  message: string;
};

const initialState: FormState = { name: "", email: "", message: "" };

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

export function Contact() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

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
    <section id="contact" className="scroll-mt-20 bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-sm font-semibold tracking-widest text-caramel uppercase">
            Contact
          </span>
          <h2 className="mt-3 font-heading text-3xl font-medium text-foreground sm:text-4xl">
            Let&apos;s Work Together
          </h2>
          <p className="mt-4 text-muted-foreground">
            Have a role, project, or just want to say hi? My inbox is always
            open.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
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
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-caramel"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <method.icon className="size-5" />
                </span>
                <span>
                  <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {method.label}
                  </span>
                  <span className="block text-sm font-medium text-foreground">
                    {method.value}
                  </span>
                </span>
              </a>
            ))}
          </motion.div>

          <motion.form
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            <div>
              <Input
                placeholder="Your name"
                aria-label="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div>
              <Input
                type="email"
                placeholder="you@example.com"
                aria-label="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div>
              <Textarea
                placeholder="Tell me a bit about what you have in mind…"
                aria-label="Message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
              {errors.message && (
                <p className="mt-1.5 text-xs text-destructive">{errors.message}</p>
              )}
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="self-start">
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {submitting ? "Sending..." : "Send Message"}
            </Button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
