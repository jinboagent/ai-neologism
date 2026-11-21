import { notFound } from "next/navigation";
import { GamePage, gameMetadata, isGameSlug, GAME_SLUGS } from "@/components/pages/game-page";
import { isLocale, UI_LOCALES } from "@/lib/i18n/core";

// ISR (1 h) — see src/app/games/[game]/page.tsx, including why the params have
// to be enumerated for `revalidate` to take effect.
export const revalidate = 3600;

export function generateStaticParams() {
  return UI_LOCALES.flatMap((locale) => GAME_SLUGS.map((game) => ({ locale, game })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; game: string }> }) {
  const { locale, game } = await params;
  if (!isLocale(locale) || locale === "en" || !isGameSlug(game)) return {};
  return gameMetadata(locale, game);
}

export default async function Page({ params }: { params: Promise<{ locale: string; game: string }> }) {
  const { locale, game } = await params;
  if (!isLocale(locale) || locale === "en") notFound();
  if (!isGameSlug(game)) notFound();
  return <GamePage locale={locale} game={game} />;
}
