import { notFound } from "next/navigation";
import { HomePage } from "@/components/pages/home-page";
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
  return {
    title: { absolute: t.metaHomeTitle },
    description: t.metaHomeDesc,
    alternates: localizedAlternates(locale, "/"),
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "en") notFound();
  return <HomePage locale={locale} />;
}
