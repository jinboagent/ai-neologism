import { notFound } from "next/navigation";
import { GamePage, gameMetadata, isGameSlug } from "@/components/pages/game-page";

// ISR (1 h) — game content changes only when words publish.
export const revalidate = 3600;

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
