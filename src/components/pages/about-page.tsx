import Link from "next/link";
import { Prose } from "./word-page";
import { localePath, type Locale } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";

const SOURCE_SHELF = [
  "Zygmunt Bauman — liquid modernity",
  "Byung-Chul Han — burnout society, psychopolitics",
  "Shoshana Zuboff — surveillance capitalism",
  "Alvin Toffler — future shock",
  "Richard Louv — nature-deficit disorder",
  "Pew Research — social-trend studies",
  "Oxford Word of the Year archive — how words enter language",
];

export async function AboutPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">{t.aboutTitle}</h1>
      <div className="reading-col mt-4 space-y-10">
        <section>
          <h2 className="text-xl font-bold">{t.aboutWhoH}</h2>
          <p className="mt-2">
            <Prose locale={locale} text={t.aboutWhoP} />
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.aboutWhatH}</h2>
          <p className="mt-2">{t.aboutWhatP1}</p>
          <p className="mt-2">{t.aboutWhatP2}</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.aboutPipelineH}</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-6">
            {t.aboutPipeline.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.aboutCraftH}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {t.aboutCraft.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground">
            <Prose locale={locale} text={t.aboutCraftNote} />
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.aboutShelfH}</h2>
          <p className="mt-2 text-muted-foreground">{t.aboutShelfIntro}</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {SOURCE_SHELF.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.aboutBadgesH}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {t.aboutBadges.map((b) => (
              <li key={b.name}>
                <strong>{b.name}</strong> — {b.text}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.aboutLadderH}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {t.aboutLadder.map((item, i) => (
              <li key={i}>
                <strong>{item.name}</strong> {item.text}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground">{t.aboutLadderNote}</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.aboutApiH}</h2>
          <p className="mt-2">
            <Prose locale={locale} text={t.aboutApiP} />
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.aboutLicenseH}</h2>
          <p className="mt-2">
            <Prose locale={locale} text={t.aboutLicenseP} />
          </p>
          <p className="mt-2">
            <Link href={localePath(locale, "/contribute") || "/contribute"} className="text-primary hover:underline">
              {t.aboutCoinCta}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
