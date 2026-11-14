// hreflang / canonical helpers for the localized pages.
import type { Metadata } from "next";
import { LOCALES, localePath, type Locale } from "./core";

type FamilyMember = { language: string; slug: string };

/**
 * hreflang set for a PAGE that exists in all four locales (chrome pages):
 * each locale plus x-default → English.
 */
export function localizedAlternates(locale: Locale, path: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localePath(l, path);
  languages["x-default"] = localePath("en", path);
  return { canonical: localePath(locale, path), languages };
}

/**
 * hreflang set for a WORD entry: only the languages whose family member is
 * actually published — pointing at a 404 would be worse than pointing at
 * nothing. x-default always lands on the English original.
 */
export function familyAlternates(locale: Locale, slug: string, family: FamilyMember[]): Metadata["alternates"] {
  const languages: Record<string, string> = { en: `/words/${slug}` };
  for (const m of family) {
    if (m.language !== "en") languages[m.language] = `/${m.language}/words/${m.slug}`;
  }
  languages["x-default"] = `/words/${slug}`;
  return { canonical: localePath(locale, `/words/${slug}`), languages };
}
