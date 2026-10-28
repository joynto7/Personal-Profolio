import { assistantProfile } from "@/data/chatbot";
import type { PortfolioKnowledge } from "@/lib/chat/knowledge";

/** "How do I reach Joynto?" in English, Bangla, or Bangla typed in English letters ("jogajog"). */
const CONTACT_QUESTION =
  /\b(contact|reach|get in touch|e-?mail|phone|call|whats\s?app|hire|message)\b|jogajog|যোগাযোগ|ইমেইল|ইমেল|ফোন|হোয়াটসঅ্যাপ|নম্বর|নাম্বার/i;
const BANGLA = /[\u0980-\u09FF]|jogajog/i;

export function isContactQuestion(question: string) {
  return CONTACT_QUESTION.test(question);
}

function joinEnglish(items: string[]) {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/**
 * How to reach Joynto, written from the profile rather than by the model, for when a model's
 * safety filter declines a contact question. Phone and WhatsApp stay in the Contact section,
 * like everywhere else the assistant answers from.
 */
export function contactAnswer({ profile, socials }: PortfolioKnowledge, question: string) {
  const email = `[${profile.email}](mailto:${profile.email})`;
  const links = socials.map((social) => `[${social.label}](${social.url})`);

  if (BANGLA.test(question)) {
    const elsewhere = links.length > 0 ? `; এছাড়া ${links.join(" ও ")}-এও পাওয়া যাবে` : "";
    return `${assistantProfile.firstNamePossessiveBn} সাথে ইমেইলে যোগাযোগ করতে পারেন: ${email}, অথবা এই সাইটের [যোগাযোগ ফর্ম](/#contact) থেকে সরাসরি মেসেজ পাঠাতে পারেন — মেসেজ সোজা ইনবক্সে যায়। ফোন ও WhatsApp নম্বর [Contact সেকশনে](/#contact) দেওয়া আছে${elsewhere}।`;
  }

  const firstName = profile.name.split(/\s+/)[0];
  const elsewhere = links.length > 0 ? `, and ${firstName} is also on ${joinEnglish(links)}` : "";
  return `You can reach ${firstName} by email at ${email} or through the [contact form](/#contact) on this site — messages go straight to the inbox. Phone and WhatsApp are listed in the [Contact section](/#contact)${elsewhere}.`;
}
