import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLangSync } from "@/components/html-lang-sync";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI Neologism — a dictionary of words that don't exist yet",
    template: "%s · AI Neologism",
  },
  description:
    "A curated public dictionary where AI coins new English words for emerging social phenomena, novelty is search-verified, and the community votes on adoption.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: "AI Neologism — a dictionary of words that don't exist yet",
    description:
      "A curated public dictionary where AI coins new English words for emerging social phenomena, novelty is search-verified, and the community votes on adoption.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${atkinson.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:px-3 focus:py-2 focus:rounded focus:border focus:border-border"
        >
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Analytics />
        <SiteFooter />
        <HtmlLangSync />
      </body>
    </html>
  );
}
