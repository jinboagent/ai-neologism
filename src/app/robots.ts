import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Gated, personalized or non-content routes: nothing here for a
        // crawler to index, and /search query combinations are a crawl trap.
        disallow: ["/admin", "/api/", "/my-words", "/review", "/search"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
