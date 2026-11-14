import { notFound } from "next/navigation";
import { GamePage, gameMetadata, isGameSlug } from "@/components/pages/game-page";

export const dynamic = "force-dynamic";

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
