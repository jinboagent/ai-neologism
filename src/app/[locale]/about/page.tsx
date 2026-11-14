import { notFound } from "next/navigation";
import { AboutPage } from "@/components/pages/about-page";
import { isLocale, UI_LOCALES } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/i18n/meta";

export function generateStaticParams() {
  return UI_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "en") return {};
  const t = getDictionary(locale);
  return { title: t.metaAboutTitle, alternates: localizedAlternates(locale, "/about") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "en") notFound();
  return <AboutPage locale={locale} />;
}
