"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBox } from "./search-box";
import { LanguageSwitcher } from "./language-switcher";
import { detectLocale, localePath, type Locale } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";

type NavLabelKey = "navIndex" | "navPopularity" | "navContribute" | "navSeeds" | "navReview" | "navMyWords" | "navSources" | "navAbout";

// Links to pages that exist in every locale (href gets the locale prefix) vs.
// pages still served in English only (action/owner tools — localized in later
// phases).
const NAV_ITEMS: { href: string; labelKey: NavLabelKey; localized: boolean }[] = [
  { href: "/index", labelKey: "navIndex", localized: true },
  { href: "/popularity", labelKey: "navPopularity", localized: true },
  { href: "/contribute", labelKey: "navContribute", localized: false },
  { href: "/seeds", labelKey: "navSeeds", localized: false },
  { href: "/review", labelKey: "navReview", localized: false },
  { href: "/my-words", labelKey: "navMyWords", localized: false },
  { href: "/sources", labelKey: "navSources", localized: false },
  { href: "/about", labelKey: "navAbout", localized: true },
];

/** Locale-aware site header. Locale comes from the URL — no layout changes needed. */
export function SiteHeader() {
  const pathname = usePathname();
  const locale = detectLocale(pathname ?? "/");
  const t = getDictionary(locale);
  // Localized sites show the public reading paths only; owner tools stay on the
  // English root.
  const items = locale === "en" ? NAV_ITEMS : NAV_ITEMS.filter((i) => i.localized || i.href === "/contribute");

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href={localePath(locale, "/")} className="word-title text-xl font-bold text-primary">
          AI&nbsp;Neologism
        </Link>
        <div className="flex-1 min-w-48">
          <SearchBox compact locale={locale} />
        </div>
        <nav aria-label={t.navAria} className="flex items-center gap-4 text-sm">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.localized ? localePath(locale, item.href) : item.href}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t[item.labelKey]}
            </Link>
          ))}
        </nav>
        <LanguageSwitcher locale={locale} />
      </div>
    </header>
  );
}

export type { Locale };
