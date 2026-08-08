import { Resend } from "resend";
import { getProfile } from "@/lib/prisma";
import type { ContactFormValues } from "@/lib/contact-schema";

export async function sendContactEmail({ name, email, message }: ContactFormValues) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.CONTACT_TO_EMAIL || (await getProfile()).email;

  return resend.emails.send({
    from: "Portfolio Contact Form <onboarding@resend.dev>",
    to,
    replyTo: email,
    subject: `New portfolio message from ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });
}
