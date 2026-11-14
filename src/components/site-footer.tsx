"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { detectLocale, localePath } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";

const GITHUB_URL = "https://github.com/jinboagent/ai-neologism";
const CONTACT_EMAIL = "hello@ai-neologism.com";

/** Multi-column footer with the identity block — the site's "who is behind
 * this" signal. Identity is the project, not a person (owner decision). */
export function SiteFooter() {
  const locale = detectLocale(usePathname() ?? "/");
  const t = getDictionary(locale);

  const explore = [
    { href: localePath(locale, "/index"), label: t.navIndex },
    { href: localePath(locale, "/popularity"), label: t.navPopularity },
    { href: localePath(locale, "/criteria"), label: t.footerCriteria },
    { href: "/about", label: t.navAbout },
  ];
  const participate = [
    { href: "/contribute", label: t.navContribute },
    { href: "/sources", label: t.navSources },
    { href: GITHUB_URL, label: t.footerOpenSource, external: true },
  ];
  const legal = [
    { href: "/privacy", label: t.footerPrivacy },
    { href: "/terms", label: t.footerTerms },
    { href: "/impressum", label: t.footerImpressum },
  ];

  return (
    <footer className="border-t border-border bg-card mt-16">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4 text-sm">
        <div>
          <p className="word-title font-bold text-foreground text-base">AI&nbsp;Neologism</p>
          <p className="mt-2 text-muted-foreground">{t.footerTagline}</p>
          <p className="mt-3 text-muted-foreground">
            <span className="font-medium text-foreground">The AI Neologism Project</span> · {t.footerSince}
          </p>
          <p className="mt-1">
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {t.footerContact}: {CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground">{t.footerExplore}</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            {explore.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-foreground">{t.footerParticipate}</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            {participate.map((l) => (
              <li key={l.href}>
                {l.external ? (
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    {l.label} ↗
                  </a>
                ) : (
                  <Link href={l.href} className="hover:text-primary">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-foreground">{t.footerLegal}</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            {legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground/70">{t.footerCc}</p>
        </div>
      </div>
    </footer>
  );
}
