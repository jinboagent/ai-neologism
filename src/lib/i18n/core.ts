// Locale plumbing — shared by server pages, client chrome and middleware.
// Client-safe: no server-only imports here.

export const LOCALES = ["en", "de", "es", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

/** Locales served under /{locale}/ — English owns the root instead. */
export const UI_LOCALES = ["de", "es", "fr"] as const satisfies readonly Locale[];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
};

/** Cookie that records a visitor's manual (or redirected) language choice. */
export const LOCALE_COOKIE = "locale-pref";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** "/de/words/x" → "de"; anything unprefixed is English (EN owns the root). */
export function detectLocale(pathname: string): Locale {
  const m = pathname.match(/^\/(de|es|fr)(\/|$)/);
  return m ? (m[1] as Locale) : "en";
}

/** "/de/words/x" → "/words/x" (the locale-neutral path). */
export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(de|es|fr)(?=\/|$)/, "");
}

/**
 * Locale-aware URL. English paths stay at the root (the 773 indexed URLs are
 * never re-prefixed); everything else lives under /{locale}. This helper is the
 * ONE place that knows about that special case.
 */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return locale === "en" ? clean : `/${locale}${clean === "/" ? "" : clean}`;
}

const LINK_TOKEN = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;

export type Segment = { kind: "text"; value: string } | { kind: "link"; label: string; href: string };

/**
 * Prose in the dictionaries may embed links as [[label|href]] so translations
 * keep their sentence flow; this splits such a string into renderable segments.
 */
export function splitLinks(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) segments.push({ kind: "text", value: text.slice(last, start) });
    segments.push({ kind: "link", label: m[1], href: m[2] });
    last = start + m[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", value: text.slice(last) });
  return segments;
}
