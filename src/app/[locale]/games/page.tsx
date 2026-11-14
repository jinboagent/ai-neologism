import { notFound } from "next/navigation";
import { GamesPage } from "@/components/pages/games-page";
import { isLocale } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/i18n/meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "en") return {};
  const t = getDictionary(locale);
  return {
    title: t.metaGamesTitle,
    description: t.metaGamesDesc,
    alternates: localizedAlternates(locale, "/games"),
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "en") notFound();
  return <GamesPage locale={locale} />;
}
