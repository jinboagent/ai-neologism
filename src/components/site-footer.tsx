"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { detectLocale, localePath } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";

export function SiteFooter() {
  const locale = detectLocale(usePathname() ?? "/");
  const t = getDictionary(locale);
  return (
    <footer className="border-t border-border bg-card mt-16">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground flex flex-wrap gap-x-8 gap-y-2 items-center">
        <span>
          <span className="word-title font-bold text-foreground">AI Neologism</span> — {t.footerTagline}
        </span>
        <span>{t.footerCc}</span>
        <Link href={localePath(locale, "/criteria")} className="hover:text-primary">
          {t.footerCriteria}
        </Link>
        <Link href="/about" className="hover:text-primary">
          {t.footerMethodology}
        </Link>
        <Link href="/admin" className="hover:text-primary">
          {t.footerAdmin}
        </Link>
      </div>
    </footer>
  );
}
