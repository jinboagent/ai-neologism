// Single source of truth for the canonical origin. Every URL that leaves the
// app (sitemap, robots, canonical tags, Open Graph) is built from this, so the
// vercel.app preview domain can never leak into search engines.
export const SITE_URL = "https://www.ai-neologism.com";

export const SITE_NAME = "AI Neologism";
