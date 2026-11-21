import { notFound } from "next/navigation";
import { GamePage, gameMetadata, isGameSlug, GAME_SLUGS } from "@/components/pages/game-page";

// ISR (1 h) — game content changes only when words publish. `revalidate` alone
// is not enough on a route with an unresolved param: without generateStaticParams
// Next renders it per request and sends `no-store`, so the segment has to be
// enumerated for the cache entry to exist at all.
export const revalidate = 3600;

export function generateStaticParams() {
  return GAME_SLUGS.map((game) => ({ game }));
}

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isGameSlug(game)) return {};
  return gameMetadata("en", game);
}

export default async function Page({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isGameSlug(game)) notFound();
  return <GamePage locale="en" game={game} />;
}
