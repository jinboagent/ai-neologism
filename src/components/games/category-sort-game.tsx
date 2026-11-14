"use client";

// Sort the Lexicon — Connections-style board, ported from the prototype:
// select 4 → submit, group bars lock in, 4 lives, shake on failure.
import { useMemo, useState } from "react";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/core";
import type { CategorySortData } from "@/lib/games/engine";
import { GameFooter, RulesCard, shuffle } from "./ui";

const GROUP_STYLES = ["bg-primary", "bg-good", "bg-warn", "bg-accent"];

export function CategorySortGame({ locale, data }: { locale: Locale; data: CategorySortData }) {
  const t = getDictionary(locale).games;
  const cats = data.categories;

  const [sel, setSel] = useState<string[]>([]);
  const [livesLeft, setLivesLeft] = useState(4);
  const [solvedCount, setSolvedCount] = useState(0);
  const [remaining, setRemaining] = useState<string[]>(() => shuffle(cats.flatMap((c) => c.words)));
  const [msg, setMsg] = useState("");
  const [shakeWords, setShakeWords] = useState<string[]>([]);
  const [done, setDone] = useState<null | "perfect" | "out">(null);
  const [gameKey, setGameKey] = useState(0);

  const solvedBars = useMemo(() => cats.slice(0, solvedCount), [cats, solvedCount]);

  const toggle = (w: string) => {
    if (done) return;
    setSel((s) => (s.includes(w) ? s.filter((x) => x !== w) : s.length >= 4 ? s : [...s, w]));
  };

  const submit = () => {
    const chosen = cats.find((c) => sel.every((w) => c.words.includes(w)));
    if (chosen) {
      setRemaining((rem) => rem.filter((w) => !chosen.words.includes(w)));
      setSolvedCount((s) => s + 1);
      setSel([]);
      setMsg(t.csLocked(chosen.name));
      if (solvedCount + 1 === 4) {
        setMsg(t.csPerfect);
        setDone("perfect");
      }
    } else {
      const lives = livesLeft - 1;
      setLivesLeft(lives);
      setMsg(t.csWrong);
      setShakeWords(sel);
      setTimeout(() => setShakeWords([]), 400);
      setSel([]);
      if (lives === 0) {
        const names = cats
          .filter((c) => c.words.some((w) => remaining.includes(w)))
          .map((c) => c.name)
          .join(" · ");
        setMsg(t.csOutOfLives(names));
        setDone("out");
      }
    }
  };

  const restart = () => {
    setSel([]);
    setLivesLeft(4);
    setSolvedCount(0);
    setRemaining(shuffle(cats.flatMap((c) => c.words)));
    setMsg("");
    setDone(null);
    setGameKey((k) => k + 1);
  };

  return (
    <div>
      <RulesCard heading={t.howToPlay} items={t.csRules} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{t.csSelected(sel.length)}</span>
          <span className="tracking-[0.3em]">{"● ".repeat(livesLeft).trim()}</span>
        </div>

        <div className="mb-4 flex flex-col gap-2.5">
          {solvedBars.map((c) => (
            <div key={c.name} className={`rounded-xl px-4 py-3.5 text-white ${GROUP_STYLES[solvedBars.indexOf(c) % 4]}`}>
              <div className="text-[15px] font-bold">{c.name}</div>
              <div className="break-words text-[13px] opacity-90">{c.words.join(" · ")}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {remaining.map((w) => {
            const isSel = sel.includes(w);
            const shake = shakeWords.includes(w);
            return (
              <button
                key={`${gameKey}-${w}`}
                type="button"
                onClick={() => toggle(w)}
                className={`flex min-h-16 items-center justify-center break-words rounded-xl border px-2 py-3.5 text-center text-sm font-semibold leading-snug ${
                  isSel ? "border-accent bg-accent-soft text-accent" : "border-border bg-card hover:border-accent"
                } ${shake ? "game-shake" : ""}`}
              >
                {w}
              </button>
            );
          })}
        </div>

        <div className="mt-4 min-h-5 text-center text-sm text-muted-foreground">{msg}</div>

        <div className="mt-3 flex justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setSel([])}
            className="rounded-xl border border-border bg-card px-5 py-2 text-sm hover:border-accent"
          >
            {t.csClear}
          </button>
          {done === null && (
            <button
              type="button"
              disabled={sel.length !== 4}
              onClick={submit}
              className="rounded-xl border border-primary bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.csSubmit}
            </button>
          )}
          {done !== null && (
            <button
              type="button"
              onClick={restart}
              className="rounded-xl border border-border bg-card px-5 py-2 text-sm hover:border-accent"
            >
              {t.csPlayAgain}
            </button>
          )}
        </div>
      </div>

      <GameFooter note={t.csFooter} />
    </div>
  );
}
