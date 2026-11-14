import { GamesPage } from "@/components/pages/games-page";
import { getDictionary } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/i18n/meta";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  const t = getDictionary("en");
  return {
    title: t.metaGamesTitle,
    description: t.metaGamesDesc,
    alternates: localizedAlternates("en", "/games"),
  };
}

export default function Page() {
  return <GamesPage locale="en" />;
}
