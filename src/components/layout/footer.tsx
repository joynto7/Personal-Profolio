import Link from "next/link";
import { profile } from "@/data/profile";
import { socials } from "@/data/socials";
import { navLinks } from "@/data/nav-links";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-espresso text-warm-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <span className="font-heading text-xl font-medium">
            {profile.name}
            <span className="text-caramel">.</span>
          </span>
          <p className="mt-3 text-sm text-latte">{profile.tagline}</p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-latte">Quick Links</span>
          <ul className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-warm-white/80 transition-colors hover:text-caramel"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-latte">Connect</span>
          <div className="flex gap-3">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="flex size-9 items-center justify-center rounded-full bg-warm-white/10 text-warm-white transition-colors hover:bg-caramel hover:text-espresso"
              >
                <social.icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-warm-white/10">
        <p className="mx-auto max-w-6xl px-6 py-5 text-center text-xs text-warm-white/60 sm:text-left">
          &copy; {year} {profile.name}. Built with Next.js &amp; Tailwind CSS.
        </p>
      </div>
    </footer>
  );
}
