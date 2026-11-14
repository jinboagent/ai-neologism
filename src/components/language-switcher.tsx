"use client";

import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, localePath, stripLocale, type Locale } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";

/**
 * Style-D switcher, navbar half: a globe dropdown that switches the SITE's
 * language, preserving the current page. The entry-level half ("Auch auf: …")
 * is the family row on word pages — the two layers each manage one thing.
 * Choosing a language records the cookie, so the Accept-Language first-visit
 * redirect never fights a manual choice.
 */
export function LanguageSwitcher({ locale: current }: { locale: Locale }) {
  const pathname = usePathname() || "/";
  const t = getDictionary(current);
  const neutral = stripLocale(pathname) || "/";

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:border-primary transition-colors">
        <span aria-hidden="true">🌐</span> {LOCALE_NAMES[current]} <span aria-hidden="true">▾</span>
        <span className="sr-only">{t.langAria}</span>
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-border bg-card py-1 shadow-md">
        {LOCALES.map((l) => {
          const isCurrent = l === current;
          return (
            <a
              key={l}
              href={localePath(l, neutral)}
              aria-current={isCurrent ? "true" : undefined}
              onClick={(e) => {
                document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${365 * 24 * 3600}; samesite=lax`;
                e.currentTarget.closest("details")?.removeAttribute("open");
              }}
              className={`block px-3 py-1.5 text-sm transition-colors ${
                isCurrent ? "font-bold text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary-soft"
              }`}
            >
              {LOCALE_NAMES[l]}
              {isCurrent && " ✓"}
            </a>
          );
        })}
      </div>
    </details>
  );
}
