// Per-game page — server shell that loads the language's fresh rounds and
// mounts the interactive client component (ported from the game prototypes).
import Link from "next/link";
import { notFound } from "next/navigation";
import { AncientVaultGame } from "@/components/games/ancient-vault-game";
import { CategorySortGame } from "@/components/games/category-sort-game";
import { MeaningRevealGame } from "@/components/games/meaning-reveal-game";
import { RealOrFakeGame } from "@/components/games/real-or-fake-game";
import { SemanticLadderGame } from "@/components/games/semantic-ladder-game";
import { ancientVaultData, categorySortData, meaningData, realOrFakeData, semanticData } from "@/lib/games/service";
import { getDictionary } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/i18n/meta";
import { localePath, type Locale } from "@/lib/i18n/core";

export const GAME_SLUGS = ["meaning-reveal", "real-or-fake", "category-sort", "semantic-ladder", "ancient-vault"] as const;
export type GameSlug = (typeof GAME_SLUGS)[number];

export function isGameSlug(value: string): value is GameSlug {
  return (GAME_SLUGS as readonly string[]).includes(value);
}

/** Title/description/hreflang per game page, shared by both route shells. */
export function gameMetadata(locale: Locale, game: GameSlug) {
  const t = getDictionary(locale);
  const meta = {
    "meaning-reveal": [t.metaMeaningRevealTitle, t.metaMeaningRevealDesc],
    "real-or-fake": [t.metaRealOrFakeTitle, t.metaRealOrFakeDesc],
    "category-sort": [t.metaCategorySortTitle, t.metaCategorySortDesc],
    "semantic-ladder": [t.metaSemanticLadderTitle, t.metaSemanticLadderDesc],
    "ancient-vault": [t.metaAncientVaultTitle, t.metaAncientVaultDesc],
  } as const;
  const [title, description] = meta[game];
  return { title, description, alternates: localizedAlternates(locale, `/games/${game}`) };
}

function Unavailable({ note }: { note: string }) {
  return (
    <div className="mb-6 rounded-2xl border border-dashed border-border bg-card px-5 py-6 text-center text-sm text-muted-foreground">
      {note}
    </div>
  );
}

export async function GamePage({ locale, game }: { locale: Locale; game: GameSlug }) {
  const t = getDictionary(locale);
  const g = t.games;

  const heads: Record<GameSlug, { emoji: string; title: string; intro: string }> = {
    "meaning-reveal": { emoji: "🧠", title: g.cardMeaningTitle, intro: g.mrIntro },
    "real-or-fake": { emoji: "🎭", title: g.cardRealOrFakeTitle, intro: g.rofIntro },
    "category-sort": { emoji: "🧩", title: g.cardCategoryTitle, intro: g.csIntro },
    "semantic-ladder": { emoji: "🔥", title: g.cardSemanticTitle, intro: g.slIntro },
    "ancient-vault": { emoji: "🏛️", title: g.cardVaultTitle, intro: g.avIntro },
  };

  // The vault renders its own header (it opens with the Antiquarium card).
  const shell = (children: React.ReactNode) => (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <Link href={localePath(locale, "/games")} className="mt-6 inline-block text-sm text-muted-foreground hover:text-accent">
        {g.backToGames}
      </Link>
      {game !== "ancient-vault" && (
        <header className="mb-6 mt-3">
          <h1 className="word-title text-3xl font-bold tracking-tight">
            {heads[game].emoji} {heads[game].title}
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">{heads[game].intro}</p>
        </header>
      )}
      {children}
    </div>
  );

  if (game === "meaning-reveal") {
    const data = await meaningData(locale);
    return shell(
      data.words.length === 0 ? <Unavailable note={g.unavailable} /> : <MeaningRevealGame locale={locale} data={data} />
    );
  }
  if (game === "real-or-fake") {
    const data = await realOrFakeData(locale);
    return shell(
      data.rounds.length === 0 ? <Unavailable note={g.unavailable} /> : <RealOrFakeGame locale={locale} data={data} />
    );
  }
  if (game === "category-sort") {
    const data = await categorySortData(locale);
    return shell(
      data.categories.length === 0 ? <Unavailable note={g.unavailable} /> : <CategorySortGame locale={locale} data={data} />
    );
  }
  if (game === "semantic-ladder") {
    const data = await semanticData(locale);
    return shell(
      data.words.length === 0 ? <Unavailable note={g.unavailable} /> : <SemanticLadderGame locale={locale} data={data} />
    );
  }
  if (game === "ancient-vault") {
    const data = await ancientVaultData(locale);
    return shell(
      <AncientVaultGame
        locale={locale}
        fusionRounds={data.fusionRounds}
        flowerRounds={data.flowerRounds}
        reverseRounds={data.reverseRounds}
        chain={data.chain}
      />
    );
  }
  notFound();
}
