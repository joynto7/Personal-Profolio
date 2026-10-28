import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Noto_Sans_Bengali } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { getProfile, getSocials } from "@/lib/prisma";
import "./globals.css";

// Every page reads live content from Postgres — nothing here may be prerendered.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

// Bangla text in the AI assistant. Not preloaded: the file only downloads once Bangla is on screen.
const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: {
      default: `${profile.name} — ${profile.designation}`,
      template: `%s — ${profile.name}`,
    },
    description: profile.tagline,
    openGraph: {
      title: `${profile.name} — ${profile.designation}`,
      description: profile.tagline,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.name} — ${profile.designation}`,
      description: profile.tagline,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [profile, socials] = await Promise.all([getProfile(), getSocials()]);

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${notoSansBengali.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <Navbar profile={profile} />
            {children}
            <Footer profile={profile} socials={socials} />
            <ChatWidget name={profile.name} avatarUrl={profile.avatarUrl} email={profile.email} />
            {/* Raised so toasts stack above the assistant's launcher instead of covering it. */}
            <Toaster offset={{ bottom: 88 }} mobileOffset={{ bottom: 80 }} />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
