import Link from "next/link";
import { CoinAi } from "@/components/coin-ai";
import { SearchBox } from "@/components/search-box";
import { WordTable } from "@/components/word-table";
import { CATEGORIES } from "@/lib/categories";
import { alphabetWithCounts, countPublished, popularity } from "@/lib/words";
import { localePath, type Locale } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";

export async function HomePage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const total = await countPublished(locale);
  const letters = await alphabetWithCounts(locale);
  const trending = await popularity("trending", 8, locale);
  const show = trending.length > 0 ? trending : await popularity("verified", 8, locale);
  // A brand-new language edition shows the localized empty states below; this
  // banner explains WHY the list is empty and points at the English original.
  const building = locale !== "en" && total === 0;

  return (
    <div>
      {building && (
        <div className="border-b border-border bg-primary-soft">
          <p className="mx-auto max-w-6xl px-4 py-2 text-sm text-primary">
            {t.buildingNote}{" "}
            <Link href="/index" className="font-medium underline hover:no-underline">
              {t.buildingLink}
            </Link>
          </p>
        </div>
      )}

      {/* Slim hero band: title, search and actions in one compact strip so the
          dictionary itself starts almost immediately. */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-5 text-center">
          <h1 className="word-title text-2xl font-bold text-foreground">{t.homeHeroTitle}</h1>
          <p className="mx-auto mt-1 max-w-3xl text-sm text-muted-foreground">{t.homeHeroSub}</p>
          <div className="mx-auto mt-3 max-w-2xl">
            <SearchBox locale={locale} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contribute"
              className="inline-flex min-h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-deep transition-colors"
            >
              {t.homeCoinCta}
            </Link>
            <Link
              href={localePath(locale, "/index")}
              className="inline-flex min-h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium hover:border-primary transition-colors"
            >
              {t.homeBrowseCta}
            </Link>
            {total > 0 && <span className="text-sm text-muted-foreground">{t.homeCount(total)}</span>}
          </div>
        </div>
      </section>

      {/* Coin with AI — the flagship interaction. The wizard's own strings stay
          English until the per-language coin pipeline (phase 3) lands. */}
      <section className="mx-auto max-w-6xl px-4 pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">{t.homeCoinHeading}</h2>
          <Link href="/contribute" className="text-sm text-primary hover:underline">
            {t.homeCoinOther}
          </Link>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t.homeCoinDesc}</p>
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <CoinAi />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">{trending.length > 0 ? t.homeTrending : t.homeRecent}</h2>
          <Link href={localePath(locale, "/popularity")} className="text-sm text-primary hover:underline">
            {t.homeAllLenses}
          </Link>
        </div>
        {show.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-card p-5 text-muted-foreground">
            {t.homeEmptyPre}
            <Link href="/contribute" className="text-primary hover:underline">
              {t.homeEmptyLink}
            </Link>
            {t.homeEmptyPost}
          </p>
        ) : (
          <div className="mt-2">
            <WordTable words={show} locale={locale} />
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6">
        <h2 className="text-lg font-bold">{t.homeByCategory}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/search?q=${encodeURIComponent(c)}`}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      {letters.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-8">
          <h2 className="text-lg font-bold">{t.homeAz}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {letters.map((l) => (
              <Link
                key={l.letter}
                href={`${localePath(locale, "/index")}#letter-${l.letter}`}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium hover:border-primary hover:text-primary transition-colors"
              >
                {l.letter}
                <span className="ml-1 text-xs text-muted-foreground">{l.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
