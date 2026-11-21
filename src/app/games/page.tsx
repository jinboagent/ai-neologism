import { GamesPage } from "@/components/pages/games-page";
import { getDictionary } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/i18n/meta";

// ISR (1 h): game content changes only when words publish; getLexicon already
// has its own in-process TTL underneath this.
export const revalidate = 3600;

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
