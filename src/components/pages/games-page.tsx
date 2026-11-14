// Games hub — stats band + one card per game, greyed out when the language's
// published data can't fuel it yet.
import Link from "next/link";
import { gamesOverview } from "@/lib/games/service";
import { getDictionary } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/i18n/core";

export async function GamesPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const g = t.games;
  const { stats, availability } = await gamesOverview(locale);

  const cards = [
    {
      slug: "meaning-reveal",
      emoji: "🧠",
      title: g.cardMeaningTitle,
      desc: g.cardMeaningDesc,
      origin: g.cardMeaningOrigin,
      cta: g.playCta,
      ok: availability.meaning,
    },
    {
      slug: "real-or-fake",
      emoji: "🎭",
      title: g.cardRealOrFakeTitle,
      desc: g.cardRealOrFakeDesc,
      origin: g.cardRealOrFakeOrigin,
      cta: g.playCta,
      ok: availability.realOrFake,
    },
    {
      slug: "category-sort",
      emoji: "🧩",
      title: g.cardCategoryTitle,
      desc: g.cardCategoryDesc,
      origin: g.cardCategoryOrigin,
      cta: g.playCta,
      ok: availability.categorySort,
    },
    {
      slug: "semantic-ladder",
      emoji: "🔥",
      title: g.cardSemanticTitle,
      desc: g.cardSemanticDesc,
      origin: g.cardSemanticOrigin,
      cta: g.playCta,
      ok: availability.semantic,
    },
    {
      slug: "ancient-vault",
      emoji: "🏛️",
      title: g.cardVaultTitle,
      desc: g.cardVaultDesc,
      origin: g.cardVaultOrigin,
      cta: g.enterVaultCta,
      ok: true, // the Sator square is history, not data — always available
    },
  ];

  return (
    <div>
      <section className="border-b border-border bg-primary-soft">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <h1 className="word-title text-3xl font-bold">{g.hubTitle}</h1>
          <p className="mx-auto mt-2 max-w-3xl text-[15px] text-muted-foreground">{g.hubSub}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[13px] font-semibold text-primary">
            <span className="rounded-full border border-primary/30 bg-card px-3.5 py-1">{g.statWords(stats.words)}</span>
            <span className="rounded-full border border-primary/30 bg-card px-3.5 py-1">{g.statFamilies(stats.families)}</span>
            <span className="rounded-full border border-primary/30 bg-card px-3.5 py-1">{g.statCategories(stats.categories)}</span>
            <span className="rounded-full border border-primary/30 bg-card px-3.5 py-1">{g.statDaily}</span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.slug}
            className={`flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-6 ${
              c.ok ? "transition-shadow hover:shadow-md" : "opacity-70"
            }`}
          >
            <div className="text-3xl">{c.emoji}</div>
            <h2 className="text-xl font-bold tracking-tight">{c.title}</h2>
            <p className="text-sm text-muted-foreground">{c.desc}</p>
            <div className="text-xs text-muted-foreground">{c.origin}</div>
            {c.ok ? (
              <Link
                href={localePath(locale, `/games/${c.slug}`)}
                className="mt-auto inline-block rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-deep"
              >
                {c.cta}
              </Link>
            ) : (
              <div className="mt-auto rounded-xl border border-dashed border-border px-4 py-2.5 text-center text-sm text-muted-foreground">
                {g.unavailable}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
