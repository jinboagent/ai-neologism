import { notFound } from "next/navigation";
import { buildWordMetadata, WordPage } from "@/components/pages/word-page";
import { isLocale, UI_LOCALES } from "@/lib/i18n/core";

// ISR, published-only — see the root words/[slug]/page.tsx header for the
// rationale (Vercel quota outage 2026-11-23..28: dynamic word pages ×
// Googlebot = 402 DEPLOYMENT_DISABLED). Unpublished-word previews live in
// /my-words and the admin queue; bustPublicCache() marks these stale on
// approve/edit/delete.
export const revalidate = 300;

export function generateStaticParams() {
  return UI_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || locale === "en") return {};
  return buildWordMetadata(slug, locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || locale === "en") notFound();
  return <WordPage slug={slug} locale={locale} />;
}
