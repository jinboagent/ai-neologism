import type { MetadataRoute } from "next";
import { qAll } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { LOCALES, localePath, type Locale } from "@/lib/i18n/core";

// Regenerated on request rather than baked at build time, so words approved
// through the admin queue appear here without a redeploy.
export const dynamic = "force-dynamic";

// SQLite's datetime('now') yields "YYYY-MM-DD HH:MM:SS" in UTC with no zone
// marker; append one so Date parses it as UTC instead of the server's locale.
function toUtcDate(sqlite: string): Date {
  return new Date(`${sqlite.replace(" ", "T")}Z`);
}

// Chrome pages that exist in every locale (the action/owner pages stay EN-only).
const CHROME: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/index", changeFrequency: "daily", priority: 0.9 },
  { path: "/popularity", changeFrequency: "daily", priority: 0.7 },
  { path: "/games", changeFrequency: "daily", priority: 0.7 },
  { path: "/seeds", changeFrequency: "daily", priority: 0.6 },
  { path: "/contribute", changeFrequency: "weekly", priority: 0.6 },
  { path: "/sources", changeFrequency: "weekly", priority: 0.5 },
  { path: "/criteria", changeFrequency: "monthly", priority: 0.5 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
];
const LOCALIZED = new Set(["/", "/index", "/popularity", "/games", "/criteria", "/about"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await qAll<{ slug: string; language: string; concept_id: number | null; updated_at: string }>(
    "SELECT slug, language, concept_id, updated_at FROM words WHERE status = 'published' ORDER BY id"
  );

  const entries: MetadataRoute.Sitemap = [];
  for (const page of CHROME) {
    const base = { changeFrequency: page.changeFrequency, priority: page.priority };
    if (LOCALIZED.has(page.path)) {
      // All four locales + x-default → EN.
      const languages: Record<string, string> = { "x-default": `${SITE_URL}${page.path}` };
      for (const l of LOCALES) languages[l] = `${SITE_URL}${localePath(l, page.path)}`;
      entries.push({ url: `${SITE_URL}${localePath("en", page.path)}`, ...base, alternates: { languages } });
      for (const l of ["de", "es", "fr"] as Locale[]) {
        entries.push({ url: `${SITE_URL}${localePath(l, page.path)}`, ...base, alternates: { languages } });
      }
    } else {
      entries.push({ url: `${SITE_URL}${page.path}`, ...base });
    }
  }

  // Word entries: EN at the root, localized siblings under /{locale}. hreflang
  // languages come from each entry's concept family (only published members).
  const byConcept = new Map<number, typeof rows>();
  for (const r of rows) {
    if (r.concept_id == null) continue;
    const list = byConcept.get(r.concept_id) ?? [];
    list.push(r);
    byConcept.set(r.concept_id, list);
  }
  for (const r of rows) {
    const url = r.language === "en" ? `${SITE_URL}/words/${r.slug}` : `${SITE_URL}/${r.language}/words/${r.slug}`;
    const family = r.concept_id != null ? (byConcept.get(r.concept_id) ?? []) : [];
    const entry: MetadataRoute.Sitemap[number] = {
      url,
      lastModified: toUtcDate(r.updated_at),
      changeFrequency: "weekly",
      priority: 0.8,
    };
    if (family.length > 0) {
      const languages: Record<string, string> = {};
      for (const m of family) {
        languages[m.language] = m.language === "en" ? `${SITE_URL}/words/${m.slug}` : `${SITE_URL}/${m.language}/words/${m.slug}`;
      }
      languages["x-default"] = `${SITE_URL}/words/${(family.find((m) => m.language === "en") ?? family[0]).slug}`;
      entry.alternates = { languages };
    }
    entries.push(entry);
  }

  return entries;
}
