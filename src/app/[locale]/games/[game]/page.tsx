import { notFound } from "next/navigation";
import { GamePage, gameMetadata, isGameSlug } from "@/components/pages/game-page";
import { isLocale } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

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
