"use client";

// Warm or Cold? — semantic ladder demo, ported from the prototype: hidden
// word, click-the-bank or type-your-own guesses, sorted ladder, reveal after 3.
// Scores are simulated (bank = seeded arc; typed guesses = hash fallback).
import { useState } from "react";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/core";
import type { SemanticData } from "@/lib/games/engine";
import { GameFooter, RulesCard } from "./ui";

/** Prototype parity: deterministic pseudo-score for typed guesses. */
function hashScore(g: string): number {
  let h = 0;
  for (const c of g) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 3 + (h % 40);
}

export function SemanticLadderGame({ locale, data }: { locale: Locale; data: SemanticData }) {
  const t = getDictionary(locale).games;
  const words = data.words;

  const [wi, setWi] = useState(0);
  const [guesses, setGuesses] = useState<{ g: string; score: number; known: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);

  if (words.length === 0) return null;
  const d = words[wi];

  const guess = () => {
    const g = input.trim().toLowerCase();
    if (!g) return;
    const known = d.scores[g] !== undefined;
    const score = known ? d.scores[g] : hashScore(g);
    if (guesses.some((x) => x.g === g)) {
      setInput("");
      return;
    }
    setGuesses((list) => [...list, { g, score, known }]);
    setInput("");
  };

  const nextWord = () => {
    setWi((wi + 1) % words.length);
    setGuesses([]);
    setRevealed(false);
    setInput("");
  };

  const list = [...guesses].sort((a, b) => b.score - a.score);
  const usedBank = new Set(guesses.map((x) => x.g));

  return (
    <div>
      <RulesCard heading={t.howToPlay} items={t.slRules} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-6">
        <div className="rounded-xl bg-accent-soft px-4 py-4 text-center text-base text-accent">
          {t.slHiddenPrefix}
          <b className="tracking-wider">{t.slLetters(d.w.length)}</b>
        </div>

        <div className="mt-4 flex gap-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") guess();
            }}
            placeholder={t.slInputPlaceholder}
            className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-[15px] focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={guess}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep"
          >
            {t.slGuess}
          </button>
        </div>

        <div className="mt-3.5 flex flex-wrap justify-center gap-2">
          {d.bank.map((w) => (
            <button
              key={w}
              type="button"
              disabled={usedBank.has(w.toLowerCase())}
              onClick={() => {
                setInput(w);
                guessWith(w);
              }}
              className={`rounded-full border px-3.5 py-2 text-[13.5px] font-semibold ${
                usedBank.has(w.toLowerCase())
                  ? "cursor-default border-border text-muted-foreground line-through opacity-40"
                  : "border-border bg-card hover:border-accent hover:text-accent"
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        <div className="mt-4 flex max-h-64 flex-col gap-1.5 overflow-auto">
          {list.map((x) => (
            <div key={x.g} className="flex items-center gap-2.5 text-sm">
              <span className={`w-32 shrink-0 break-all font-semibold ${x.score >= 75 ? "text-good" : ""}`}>{x.g}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-accent-soft">
                <div className="h-full rounded-full bg-gradient-to-r from-secondary to-primary" style={{ width: `${x.score}%` }} />
              </div>
              <span className="w-12 text-right tabular-nums text-muted-foreground">{x.score}</span>
              <span className="w-7 text-[11px] text-muted-foreground">{x.known ? "" : "sim"}</span>
            </div>
          ))}
        </div>

        {revealed && (
          <div className="mt-4 rounded-xl bg-good-soft px-5 py-4">
            <div className="text-xl font-bold">{d.w}</div>
            <div className="mt-1.5 text-[14.5px]">{d.def}</div>
            {d.why && (
              <div className="mt-1.5 text-[13px] text-muted-foreground">
                {t.whyPrefix}
                {d.why}
              </div>
            )}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={nextWord}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep"
              >
                {t.slNext}
              </button>
            </div>
          </div>
        )}

        {!revealed && (
          <div className="mt-4 text-center">
            <button
              type="button"
              disabled={guesses.length < 3}
              onClick={() => setRevealed(true)}
              className="rounded-xl border border-border bg-card px-5 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {guesses.length >= 3 ? t.slRevealReady : t.slRevealLocked}
            </button>
          </div>
        )}
      </div>

      <GameFooter note={t.slFooter} />
    </div>
  );

  // Bank click: fill + score in one step (the prototype set the input first).
  function guessWith(w: string) {
    const g = w.toLowerCase();
    const known = d.scores[g] !== undefined;
    const score = known ? d.scores[g] : hashScore(g);
    if (guesses.some((x) => x.g === g)) return;
    setGuesses((prev) => [...prev, { g, score, known }]);
    setInput("");
  }
}
