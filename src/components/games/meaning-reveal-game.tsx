"use client";

// What does it mean? — the core daily loop, ported from the prototype
// (game/gamesite/templates/meaning-reveal.html): morpheme hint, guess box,
// click-to-reveal, honest self-scoring.
import { useState } from "react";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/core";
import type { MeaningData } from "@/lib/games/engine";
import { GameFooter, RulesCard } from "./ui";

export function MeaningRevealGame({ locale, data }: { locale: Locale; data: MeaningData }) {
  const t = getDictionary(locale).games;
  const [i, setI] = useState(data.dailyIndex ?? 0);
  const [hintShown, setHintShown] = useState(false);
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [scoreNote, setScoreNote] = useState("");

  const d = data.words[i];
  if (!d) return null;

  const nextWord = () => {
    setI((i + 1) % data.words.length);
    setHintShown(false);
    setGuess("");
    setRevealed(false);
    setScoreNote("");
  };

  return (
    <div>
      <RulesCard heading={t.howToPlay} items={t.mrRules} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
        <div className="word-title break-all text-4xl font-bold tracking-tight sm:text-[42px]">{d.w}</div>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-medium">
          {d.pos && <span className="rounded-full bg-accent-soft px-3 py-1 text-accent">{d.pos}</span>}
          {d.ipa && <span className="rounded-full bg-accent-soft px-3 py-1 text-accent">{d.ipa}</span>}
          {d.cat && <span className="rounded-full bg-accent-soft px-3 py-1 text-accent">{d.cat}</span>}
        </div>

        {d.morphemes ? (
          <>
            <button
              type="button"
              onClick={() => setHintShown(!hintShown)}
              className="mt-5 rounded-xl border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent"
            >
              {hintShown ? t.mrHideHint : t.mrShowHint}
            </button>
            {hintShown && <div className="mt-4 text-base font-semibold text-accent">{d.morphemes}</div>}
          </>
        ) : null}

        <textarea
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          disabled={revealed}
          placeholder={t.mrGuessPlaceholder}
          className="mt-5 min-h-20 w-full resize-y rounded-xl border border-border bg-card px-4 py-3 text-[15px] focus:border-accent focus:outline-none disabled:opacity-60"
        />

        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-3 block w-full rounded-xl bg-primary px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-deep"
          >
            {t.mrReveal}
          </button>
        ) : (
          <div className="mt-6 text-left">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">{t.mrRevealedHeading}</h3>
            <p className="mb-4 text-lg font-semibold">{d.def}</p>
            {d.why && (
              <div className="rounded-r-xl border-l-4 border-accent bg-accent-soft px-4 py-3 text-sm text-muted-foreground">
                <b className="text-accent">{t.whyPrefix}</b>
                {d.why}
              </div>
            )}
            <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-widest text-accent">{t.mrHowClose}</h3>
            <div className="flex flex-wrap gap-2.5">
              {[
                { emoji: "🟢", label: t.mrNailed },
                { emoji: "🟡", label: t.mrWarm },
                { emoji: "⚪", label: t.mrNoIdea },
              ].map(({ emoji, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setScoreNote(t.mrScored(emoji))}
                  className="min-w-32 flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm hover:border-accent"
                >
                  {label}
                </button>
              ))}
            </div>
            {scoreNote && <div className="mt-4 min-h-5 text-center text-sm text-muted-foreground">{scoreNote}</div>}
            <button
              type="button"
              onClick={nextWord}
              className="mx-auto mt-4 block rounded-xl border border-border bg-card px-5 py-2 text-sm hover:border-accent hover:text-accent"
            >
              {t.mrNext}
            </button>
          </div>
        )}
      </div>

      <GameFooter note={t.mrFooter} />
    </div>
  );
}
