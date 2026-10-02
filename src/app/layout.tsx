import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SearchBox } from "@/components/search-box";

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
  title: {
    default: "AI Neologism — a dictionary of words that don't exist yet",
    template: "%s · AI Neologism",
  },
  description:
    "A curated public dictionary where AI coins new English words for emerging social phenomena, novelty is search-verified, and the community votes on adoption.",
};

const NAV = [
  { href: "/index", label: "Index" },
  { href: "/popularity", label: "Popularity" },
  { href: "/contribute", label: "Contribute" },
  { href: "/seeds", label: "Seeds" },
  { href: "/review", label: "Review" },
  { href: "/my-words", label: "My words" },
  { href: "/sources", label: "Sources" },
  { href: "/about", label: "About" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${atkinson.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:px-3 focus:py-2 focus:rounded focus:border focus:border-border"
        >
          Skip to main content
        </a>
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/" className="word-title text-xl font-bold text-primary">
              AI&nbsp;Neologism
            </Link>
            <div className="flex-1 min-w-48">
              <SearchBox compact />
            </div>
            <nav aria-label="Main" className="flex items-center gap-4 text-sm">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="border-t border-border bg-card mt-16">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground flex flex-wrap gap-x-8 gap-y-2 items-center">
            <span>
              <span className="word-title font-bold text-foreground">AI Neologism</span> — words for what we feel but
              can&apos;t name yet.
            </span>
            <span>Entries planned under CC BY-SA 4.0</span>
            <Link href="/about" className="hover:text-primary">
              Methodology &amp; API
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
