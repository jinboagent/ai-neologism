import Link from "next/link";
import { WordTable } from "@/components/word-table";
import { popularity, type PopularityLens } from "@/lib/words";
import { localePath, type Locale } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";

export async function PopularityPage({
  locale,
  lens: raw,
}: {
  locale: Locale;
  lens?: string;
}) {
  const t = getDictionary(locale);
  const LENSES: { key: PopularityLens; label: string; blurb: string }[] = [
    { key: "trending", label: t.lensTrending, blurb: t.lensTrendingBlurb },
    { key: "endorsed", label: t.lensEndorsed, blurb: t.lensEndorsedBlurb },
    { key: "contested", label: t.lensContested, blurb: t.lensContestedBlurb },
    { key: "verified", label: t.lensVerified, blurb: t.lensVerifiedBlurb },
  ];
  const lens = (LENSES.some((l) => l.key === raw) ? raw : "trending") as PopularityLens;
  const active = LENSES.find((l) => l.key === lens)!;
  const words = await popularity(lens, 10, locale);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="word-title text-2xl font-bold">{t.popTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.popSub}</p>

      <nav aria-label={t.popTitle} className="mt-4 flex flex-wrap gap-1.5">
        {LENSES.map((l) => (
          <Link
            key={l.key}
            href={`${localePath(locale, "/popularity")}?lens=${l.key}`}
            aria-current={l.key === lens ? "page" : undefined}
            className={`min-h-9 rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              l.key === lens
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <p className="mt-3 text-sm text-muted-foreground">{active.blurb}</p>

      {words.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-border bg-card p-5 text-muted-foreground">{t.popEmpty}</p>
      ) : (
        <div className="mt-4">
          <WordTable words={words} numbered locale={locale} />
        </div>
      )}
    </div>
  );
}
