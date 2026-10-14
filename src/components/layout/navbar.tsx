"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CodeXml, Menu } from "lucide-react";
import type { Profile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { navLinks } from "@/data/nav-links";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HudPanel } from "@/components/scifi/hud-panel";
import { cn } from "@/lib/utils";

// The hero (#top) is watched too, so scrolling back up clears the highlight.
const SECTION_IDS = ["top", ...navLinks.map((link) => link.href.split("#")[1])];

/** The section crossing the middle of the viewport, so the nav can light up where you are. */
function useActiveSection() {
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (section): section is HTMLElement => section !== null
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);

  return pathname === "/" ? active : null;
}

export function Navbar({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const active = useActiveSection();

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6">
      <HudPanel ticks={false} className="hex mx-auto max-w-7xl">
        <nav className="flex h-14 items-center justify-between gap-4 px-7 sm:px-9">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label={`${profile.name} — home`}>
            <CodeXml className="size-6 shrink-0 text-caramel drop-shadow-[0_0_8px_var(--caramel)] transition-transform group-hover:scale-110" />
            <span className="truncate font-heading text-sm font-semibold tracking-wide text-foreground">
              {profile.name}
            </span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const isActive = active === link.href.split("#")[1];
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    data-guide={link.guide}
                    data-guide-sound="nav"
                    aria-current={isActive ? "location" : undefined}
                    className={cn(
                      "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "text-caramel" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute inset-x-3 -bottom-0.5 h-px bg-caramel shadow-[0_0_8px_var(--caramel)]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="lg:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-3/4 border-l border-caramel/30 bg-popover/95 backdrop-blur-xl">
                  <SheetHeader>
                    <SheetTitle className="font-heading">{profile.name}</SheetTitle>
                  </SheetHeader>
                  <ul className="flex flex-col gap-1 px-4">
                    {navLinks.map((link) => (
                      <li key={link.href}>
                        <SheetClose asChild>
                          <Link
                            href={link.href}
                            data-guide={link.guide}
                            data-guide-sound="nav"
                            className="block rounded-md px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-caramel/10 hover:text-caramel"
                          >
                            {link.label}
                          </Link>
                        </SheetClose>
                      </li>
                    ))}
                  </ul>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>
      </HudPanel>
    </header>
  );
}
