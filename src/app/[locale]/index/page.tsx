import { notFound } from "next/navigation";
import { IndexPage } from "@/components/pages/index-page";
import { isLocale, UI_LOCALES } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/i18n/meta";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return UI_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "en") return {};
  const t = getDictionary(locale);
  return { title: t.metaIndexTitle, alternates: localizedAlternates(locale, "/index") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "en") notFound();
  return <IndexPage locale={locale} />;
}
