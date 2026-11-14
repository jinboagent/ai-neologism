import { Prose } from "./word-page";
import type { Locale } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";

export async function CriteriaPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">{t.criteriaTitle}</h1>
      <div className="reading-col mt-4 space-y-10">
        <section>
          <p className="mt-2">{t.critIntro}</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.critGate1H}</h2>
          <p className="mt-2">{t.critGate1Intro}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-6">
            {t.critGate1.map((item, i) => (
              <li key={i}>
                <strong>{item.lead}</strong>
                {item.lead && item.text ? " " : ""}
                {item.text}
              </li>
            ))}
          </ol>
          <p className="mt-3">{t.critRule5}</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.critGate2H}</h2>
          <p className="mt-2">{t.critGate2Intro}</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {t.critGate2.map((item, i) => (
              <li key={i}>
                <strong>{item.lead}</strong> {item.text}
              </li>
            ))}
          </ul>
          <p className="mt-3">{t.critGate2Note}</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.critGate3H}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {t.critGate3.map((item, i) => (
              <li key={i}>{item.text}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.critVerdictsH}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {t.critVerdicts.map((item, i) => (
              <li key={i}>
                <strong>{item.lead}</strong>{" "}
                <Prose locale={locale} text={item.text} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-muted-foreground">{t.critVerdictNote}</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t.critPracticeH}</h2>
          <p className="mt-2">
            <Prose locale={locale} text={t.critPractice} />
          </p>
        </section>
      </div>
    </div>
  );
}
