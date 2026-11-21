import { notFound } from "next/navigation";
import { GamesPage } from "@/components/pages/games-page";
import { isLocale, UI_LOCALES } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/i18n/meta";

// ISR (1 h) — see src/app/games/page.tsx. The locale param must be enumerated
// or Next renders the page per request and sends `no-store`.
export const revalidate = 3600;

export function generateStaticParams() {
  return UI_LOCALES.map((locale) => ({ locale }));
}

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
