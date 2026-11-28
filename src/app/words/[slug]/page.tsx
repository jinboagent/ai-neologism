import { buildWordMetadata, WordPage } from "@/components/pages/word-page";

// ISR: word pages are rendered published-only (no cookies() here), cached at
// the edge and revalidated every 5 minutes — this is the fix for the Vercel
// quota outage of 2026-11-23..28, where ~5.5k dynamic word pages × Googlebot
// burns of function execution took the whole account down (402
// DEPLOYMENT_DISABLED). Contributor/admin previews of unpublished words live
// in /my-words and the admin review queue, which stay dynamic.
// Content changes flow through bustPublicCache() → revalidatePath("/", "layout"),
// which marks these pages stale immediately on approve/edit/delete.
export const revalidate = 300;

// Explicit empty params + default dynamicParams=true = on-demand ISR: the
// first visitor renders the word, Next caches it for 300s, subsequent hits
// come from cache. Without this export Next treats the bare [slug] segment
// as fully dynamic (no-store) — unlike the [locale] variant, which gets its
// ISR from the locale-level generateStaticParams.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildWordMetadata(slug, "en");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <WordPage slug={slug} locale="en" />;
}
