"use client";

// Real or Fake? — Balderdash v0, ported from the prototype: one word, four
// definitions (one real, three decoys), why-box after answering.
import { useState } from "react";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/core";
import type { RealOrFakeData } from "@/lib/games/engine";
import { GameFooter, RulesCard, shuffle } from "./ui";

const LETTERS = ["A", "B", "C", "D"];

type Option = { text: string; real: boolean };

export function RealOrFakeGame({ locale, data }: { locale: Locale; data: RealOrFakeData }) {
  const t = getDictionary(locale).games;
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const rounds = data.rounds;
  const [options] = useState(() =>
    rounds.map((r) => shuffle<Option>([{ text: r.real, real: true }, ...r.fakes.map((f) => ({ text: f, real: false }))]))
  );

  if (rounds.length === 0) return null;
  const r = rounds[idx];
  const opts = options[idx];

  const pick = (isReal: boolean, n: number) => {
    if (answered) return;
    setAnswered(true);
    setPickedIdx(n);
    if (isReal) setCorrect((c) => c + 1);
  };

  const nextRound = () => {
    if (idx < rounds.length - 1) {
      setIdx(idx + 1);
      setAnswered(false);
      setPickedIdx(null);
    } else {
      setFinished(true);
    }
  };

  return (
    <div>
      <RulesCard heading={t.howToPlay} items={t.rofRules} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{t.rofRound(idx + 1, rounds.length)}</span>
          <span>{t.rofCorrect(correct)}</span>
        </div>

        <div className="text-center">
          <div className="word-title break-all text-3xl font-bold tracking-tight sm:text-[38px]">{r.word}</div>
          <div className="mt-6 flex flex-col gap-2.5 text-left">
            {opts.map((o, n) => {
              const showReal = answered && o.real;
              const showFake = answered && pickedIdx === n && !o.real;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={answered}
                  onClick={() => pick(o.real, n)}
                  className={`rounded-xl border px-4 py-3 text-[15px] leading-relaxed transition-colors ${
                    showReal
                      ? "border-good bg-good-soft"
                      : showFake
                        ? "border-bad bg-bad-soft"
                        : "border-border bg-card hover:border-accent"
                  } ${answered ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span className="mr-2.5 inline-block h-6 w-6 rounded-md bg-accent-soft text-center text-xs font-bold leading-6 text-accent">
                    {LETTERS[n]}
                  </span>
                  {o.text}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="mt-5 rounded-r-xl border-l-4 border-accent bg-accent-soft px-4 py-3 text-left text-sm text-muted-foreground">
              <b className="text-accent">{t.whyPrefix}</b>
              {r.why}
              {pickedIdx !== null && !opts[pickedIdx].real ? (
                <span className="font-semibold text-bad"> — {t.rofGotYou}</span>
              ) : (
                <span className="font-semibold text-good"> — {t.rofCalledIt}</span>
              )}
            </div>
          )}

          {finished ? (
            <div className="px-2 py-4 text-center text-base font-semibold">{t.rofEnd(correct, rounds.length)}</div>
          ) : (
            <button
              type="button"
              disabled={!answered}
              onClick={nextRound}
              className="mt-5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              {idx === rounds.length - 1 ? t.rofSeeResult : t.rofNext}
            </button>
          )}
        </div>
      </div>

      <GameFooter note={t.rofFooter} />
    </div>
  );
}
