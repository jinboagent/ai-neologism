import type { MetadataRoute } from "next";
import { qAll } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

// Regenerated on request rather than baked at build time, so words approved
// through the admin queue appear here without a redeploy.
export const dynamic = "force-dynamic";

// SQLite's datetime('now') yields "YYYY-MM-DD HH:MM:SS" in UTC with no zone
// marker; append one so Date parses it as UTC instead of the server's locale.
function toUtcDate(sqlite: string): Date {
  return new Date(`${sqlite.replace(" ", "T")}Z`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await qAll<{ slug: string; updated_at: string }>(
    "SELECT slug, updated_at FROM words WHERE status = 'published' ORDER BY id"
  );

  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/index`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/popularity`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/seeds`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/contribute`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/sources`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/criteria`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];

  return [
    ...pages,
    ...rows.map((r) => ({
      url: `${SITE_URL}/words/${r.slug}`,
      lastModified: toUtcDate(r.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
