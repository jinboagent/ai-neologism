import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { buildWordMetadata, WordPage } from "@/components/pages/word-page";
import { KEY_COOKIE } from "@/lib/keys";
import { isLocale, UI_LOCALES } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return UI_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || locale === "en") return {};
  const jar = await cookies();
  return buildWordMetadata(slug, locale, jar.get(KEY_COOKIE)?.value);
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || locale === "en") notFound();
  const jar = await cookies();
  return <WordPage slug={slug} locale={locale} cookieKey={jar.get(KEY_COOKIE)?.value} />;
}
