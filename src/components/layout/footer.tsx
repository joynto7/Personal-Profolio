import Link from "next/link";
import { CodeXml } from "lucide-react";
import type { Profile, Social } from "@prisma/client";
import { navLinks } from "@/data/nav-links";
import { ICONS } from "@/lib/icons";
import { HudPanel } from "@/components/scifi/hud-panel";

export function Footer({ profile, socials }: { profile: Profile; socials: Social[] }) {
  const year = new Date().getFullYear();

  return (
    // The bottom padding keeps the copyright line clear of Nova's fixed pill.
    <footer className="mt-auto px-3 pb-24 sm:px-6">
      <HudPanel cut={22} className="mx-auto max-w-7xl">
        <div className="grid gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[1.1fr_1.3fr_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <CodeXml className="mt-1 size-9 shrink-0 text-caramel drop-shadow-[0_0_10px_var(--caramel)]" />
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">{profile.name}</p>
              <p className="sf-label mt-1 text-caramel">Build · Learn · Improve</p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{profile.tagline}</p>
            </div>
          </div>

          <nav aria-label="Footer">
            <p className="sf-label text-muted-foreground">Quick links</p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    data-guide={link.guide}
                    data-guide-sound="nav"
                    className="text-sm text-foreground/80 transition-colors hover:text-caramel"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-4 lg:items-end">
            <div className="flex gap-3">
              {socials.map((social) => {
                const Icon = ICONS[social.iconKey];
                return (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex size-10 items-center justify-center rounded-full border border-caramel/40 bg-caramel/5 text-foreground shadow-[0_0_16px_-6px_var(--caramel)] transition-colors hover:bg-caramel hover:text-primary-foreground"
                  >
                    {Icon && <Icon className="size-4" />}
                  </a>
                );
              })}
            </div>
            <p className="text-right text-sm leading-snug text-muted-foreground">
              <span className="text-caramel">●</span> Better Systems.
              <br />
              Brighter Future.
            </p>
          </div>
        </div>

        <div className="border-t border-caramel/15">
          <p className="px-6 py-4 text-center text-xs text-muted-foreground sm:px-10 sm:text-left">
            &copy; {year} {profile.name}. Built with Next.js, Three.js &amp; Tailwind CSS.
          </p>
        </div>
      </HudPanel>
    </footer>
  );
}
