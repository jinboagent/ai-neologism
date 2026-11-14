"use client";

// The Antiquarium — five ancient mechanics, ported from the prototype:
//   A Sator square (static Latin, light-up readings) · B fusion riddle (Lihe) ·
//   C flower order (Feihualing, 45s timer) · D reverse riddle · E word chain.
// Sections render only when the language's published data can fuel them.
import { useEffect, useRef, useState } from "react";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/core";
import type { ChainData, FlowerRound, FusionRound, ReverseRound } from "@/lib/games/engine";
import { GameFooter, shuffle } from "./ui";

const SATOR = "SATORAREPOTENETOPERAROTAS";

const TILE =
  "rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold hover:border-accent hover:text-accent";
const TILE_USED = "rounded-xl border border-accent bg-accent px-3.5 py-2.5 text-sm font-semibold text-white";
const TILE_BAD = "rounded-xl border border-bad bg-bad-soft px-3.5 py-2.5 text-sm font-semibold text-bad";

function EraBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2.5 inline-block rounded-full bg-warn-soft px-3 py-1 text-xs font-semibold tracking-wide text-warn">
      {children}
    </span>
  );
}

function VaultCard({ children }: { children: React.ReactNode }) {
  return <div className="mb-7 rounded-2xl border border-border bg-card p-6">{children}</div>;
}

// ═══════════ A. Sator square ═══════════

function SatorSquare({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).games;
  const [lit, setLit] = useState<Set<number>>(new Set());
  const [readings, setReadings] = useState<string[]>([]);
  const [doneDir, setDoneDir] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cellsOf = (sel: (r: number, c: number) => boolean): number[] => {
    const out: number[] = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (sel(r, c)) out.push(r * 5 + c);
    return out;
  };

  const light = (mode: "row" | "col" | "rowrev" | "colrev") => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const dirIndex = { row: 0, col: 1, rowrev: 2, colrev: 3 }[mode];
    setDoneDir(dirIndex);
    let list: number[] = [];
    const read: string[] = [];
    if (mode === "row") {
      for (let r = 0; r < 5; r++) {
        list = list.concat(cellsOf((r2) => r2 === r));
        read.push(SATOR.slice(r * 5, r * 5 + 5));
      }
    } else if (mode === "col") {
      for (let c = 0; c < 5; c++) {
        list = list.concat(cellsOf((_r, c2) => c2 === c));
        read.push([0, 1, 2, 3, 4].map((r) => SATOR[r * 5 + c]).join(""));
      }
    } else if (mode === "rowrev") {
      for (let r = 0; r < 5; r++) {
        list = list.concat(cellsOf((r2) => r2 === r).reverse());
        read.push(SATOR.slice(r * 5, r * 5 + 5).split("").reverse().join(""));
      }
    } else {
      for (let c = 0; c < 5; c++) {
        list = list.concat(cellsOf((_r, c2) => c2 === c).reverse());
        read.push(
          [0, 1, 2, 3, 4]
            .map((r) => SATOR[r * 5 + c])
            .join("")
            .split("")
            .reverse()
            .join("")
        );
      }
    }
    setLit(new Set());
    setReadings([]);
    list.forEach((idx, n) => {
      timers.current.push(
        setTimeout(() => {
          setLit((prev) => new Set(prev).add(idx));
        }, n * 45)
      );
    });
    timers.current.push(setTimeout(() => setReadings(read), list.length * 45));
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const dirs: { label: string; mode: "row" | "col" | "rowrev" | "colrev" }[] = [
    { label: t.avRows, mode: "row" },
    { label: t.avCols, mode: "col" },
    { label: t.avRowsRev, mode: "rowrev" },
    { label: t.avColsRev, mode: "colrev" },
  ];

  return (
    <VaultCard>
      <EraBadge>{t.avEraSator}</EraBadge>
      <h2 className="text-xl font-bold tracking-tight">{t.avSatorTitle}</h2>
      <p className="mb-4 mt-1 text-[14.5px] text-muted-foreground">{t.avSatorDesc}</p>
      <div className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-[13.5px]">
        <b className="text-accent">{t.avSatorRules}</b>
      </div>
      <div className="mx-auto grid max-w-[340px] grid-cols-5 gap-1.5">
        {SATOR.split("").map((ch, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-lg text-xl font-bold uppercase transition-colors ${
              lit.has(i) ? "bg-accent text-white" : "bg-accent-soft text-accent"
            }`}
          >
            {ch}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {dirs.map((d, n) => (
          <button
            key={d.mode}
            type="button"
            onClick={() => light(d.mode)}
            className={`rounded-xl border px-3.5 py-2 text-[13.5px] ${
              doneDir === n ? "border-good bg-card text-good" : "border-border bg-card hover:border-accent hover:text-accent"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="mt-3.5 min-h-5 text-center text-sm text-muted-foreground">
        {readings.length > 0 && readings.map((r, i) => (
          <span key={i}>
            {i > 0 && " · "}
            <b className="tracking-[0.2em] text-accent">{r}</b>
          </span>
        ))}
      </div>
      <div className="mt-3 text-center text-[13px] text-muted-foreground">{t.avSatorHist}</div>
    </VaultCard>
  );
}

// ═══════════ B. Fusion riddle ═══════════

function FusionRiddle({ locale, rounds }: { locale: Locale; rounds: FusionRound[] }) {
  const t = getDictionary(locale).games;
  const [idx, setIdx] = useState(0);
  const [built, setBuilt] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [shaking, setShaking] = useState<string | null>(null);
  const [tiles, setTiles] = useState(() => shuffleTiles(rounds[0]));

  function shuffleTiles(r: FusionRound) {
    return shuffle([...r.parts.map((p, n) => ({ t: p, ok: true, n })), ...r.decoys.map((d) => ({ t: d, ok: false, n: -1 }))]);
  }

  const renderRound = (i: number) => {
    setIdx(i);
    setBuilt([]);
    setSolved(false);
    setRevealed(false);
    setTiles(shuffleTiles(rounds[i]));
  };

  const pick = (f: { t: string; ok: boolean; n: number }) => {
    if (solved) return;
    const r = rounds[idx];
    if (f.ok && f.n === built.length) {
      const next = [...built, f.t];
      setBuilt(next);
      if (next.length === r.parts.length) {
        setSolved(true);
        setTimeout(() => setRevealed(true), 450); // brief pause before the reveal box, prototype parity
      }
    } else {
      setShaking(f.t);
      setTimeout(() => setShaking(null), 400);
    }
  };

  const r = rounds[idx];
  const complete = built.length === r.parts.length;

  return (
    <VaultCard>
      <EraBadge>{t.avEraFusion}</EraBadge>
      <h2 className="text-xl font-bold tracking-tight">{t.avFusionTitle}</h2>
      <p className="mb-4 mt-1 text-[14.5px] text-muted-foreground">{t.avFusionDesc}</p>
      <div className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-[13.5px]">
        <b className="text-accent">{t.avFusionRules}</b>
      </div>
      <div className="mb-3.5 text-center text-[15px] italic text-muted-foreground">{r.def}</div>
      <div className="flex min-h-11 flex-wrap justify-center gap-2">
        {tiles.map((f, i) => {
          const used = built.includes(f.t) && f.ok;
          return (
            <button
              key={`${idx}-${i}`}
              type="button"
              disabled={used}
              onClick={() => pick(f)}
              className={shaking === f.t && !used ? `${TILE_BAD} game-shake` : used ? TILE_USED : TILE}
            >
              {f.t}
            </button>
          );
        })}
      </div>
      <div className="mt-3.5 min-h-6 text-center text-[17px] font-bold tracking-wide">
        {complete || built.length > 0 ? (
          built.join(" + ") + (built.length < r.parts.length ? " + …" : "")
        ) : (
          <span className="font-normal tracking-normal text-border">{t.avBuiltHint}</span>
        )}
      </div>
      {revealed && (
        <div className="mt-3.5 rounded-xl bg-good-soft px-5 py-3.5 text-center">
          <div className="text-[19px] font-bold">{r.word}</div>
          {r.why && (
            <div className="mt-1 text-[13px] text-muted-foreground">
              {t.whyPrefix}
              {r.why}
            </div>
          )}
        </div>
      )}
      <div className="mt-3.5 flex justify-center gap-2">
        {!solved && (
          <button
            type="button"
            onClick={() => {
              setSolved(true);
              setRevealed(true);
            }}
            className={TILE}
          >
            {t.avSurrender}
          </button>
        )}
        {revealed && (
          <button type="button" onClick={() => renderRound((idx + 1) % rounds.length)} className={TILE}>
            {t.avNextRiddle}
          </button>
        )}
      </div>
    </VaultCard>
  );
}

// ═══════════ C. Flower order ═══════════

function FlowerOrder({ locale, rounds }: { locale: Locale; rounds: FlowerRound[] }) {
  const t = getDictionary(locale).games;
  const [active, setActive] = useState<FlowerRound | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [shaking, setShaking] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ended, setEnded] = useState<null | { early: boolean; missed: string[] }>(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [order, setOrder] = useState<string[]>([]);
  const [roundKey, setRoundKey] = useState(0);

  const start = (r: FlowerRound) => {
    setActive(r);
    setFound([]);
    setEnded(null);
    setMsg(t.avClickEvery);
    setTimeLeft(45);
    setOrder(shuffle([...r.words, ...r.distractors]));
    setRoundKey((k) => k + 1);
  };

  const finish = (early: boolean, foundList: string[] = found) => {
    if (!active) return;
    const missed = active.words.filter((w) => !foundList.includes(w));
    setEnded({ early, missed });
    setMsg(null);
  };

  useEffect(() => {
    if (!active || ended) return;
    let left = 45;
    const id = setInterval(() => {
      left -= 1;
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        finish(false); // timer callback, not a synchronous effect update
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ended, roundKey]);

  const pick = (w: string) => {
    if (!active || ended || timeLeft <= 0 || found.includes(w)) return;
    if (!w.includes(active.label)) {
      setShaking(w);
      setTimeout(() => setShaking(null), 500);
      setMsg(t.avWrongTile(w));
      return;
    }
    const next = [...found, w];
    setFound(next);
    setMsg(t.avFoundTile(w, active.defs[w] ?? ""));
    if (next.length === active.words.length) finish(true, next);
  };

  return (
    <VaultCard>
      <EraBadge>{t.avEraFlower}</EraBadge>
      <h2 className="text-xl font-bold tracking-tight">{t.avFlowerTitle}</h2>
      <p className="mb-4 mt-1 text-[14.5px] text-muted-foreground">{t.avFlowerDesc}</p>
      <div className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-[13.5px]">
        <b className="text-accent">{t.avFlowerRules}</b>
      </div>

      <div className="mb-3.5 flex flex-wrap justify-center gap-2">
        {rounds.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => start(r)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
              active?.key === r.key ? "border-accent bg-accent text-white" : "border-border bg-card hover:border-accent"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!active ? (
        <div className="min-h-5 text-center text-[13px] text-muted-foreground">{t.avPickMorpheme}</div>
      ) : (
        <div key={roundKey}>
          <div className="mb-2.5 flex items-center justify-between text-[13.5px] text-muted-foreground">
            <span>
              {t.avMorphRequired} <b className="text-accent">{active.label}</b>
            </span>
            <span className="font-bold tabular-nums text-warn">{timeLeft}s</span>
          </div>
          <div className="flex min-h-11 flex-wrap justify-center gap-2">
            {order.map((w, i) => {
              const isFound = found.includes(w);
              const isMissed = !!ended && active.words.includes(w) && !found.includes(w);
              return (
                <button
                  key={`${roundKey}-${i}`}
                  type="button"
                  disabled={isFound || !!ended}
                  onClick={() => pick(w)}
                  style={isMissed ? { outline: "2px solid var(--color-good)" } : undefined}
                  className={shaking === w && !isFound ? `${TILE_BAD} game-shake` : isFound ? TILE_USED : TILE}
                  title={active.words.includes(w) ? active.defs[w] ?? "" : ""}
                >
                  {w}
                </button>
              );
            })}
          </div>
          {msg && <div className="mt-2 min-h-5 text-center text-[13px] text-muted-foreground">{msg}</div>}
          {ended && (
            <div className="mt-3 rounded-xl bg-warn-soft px-4 py-2.5 text-[13.5px] text-warn">
              {ended.early ? (
                <b>{t.avPerfect(timeLeft)}</b>
              ) : (
                <>
                  {t.avTimeUp(found.length, active.words.length)}{" "}
                  {ended.missed.length > 0 && <b>{t.avMissed(ended.missed.join(", "))}</b>}
                </>
              )}
            </div>
          )}
          <div className="mt-3.5 flex justify-center gap-2">
            <button type="button" onClick={() => start(active)} className={TILE}>
              {t.avRestartRound}
            </button>
          </div>
        </div>
      )}
    </VaultCard>
  );
}

// ═══════════ D. Reverse riddle ═══════════

function ReverseRiddle({ locale, rounds }: { locale: Locale; rounds: ReverseRound[] }) {
  const t = getDictionary(locale).games;
  const [idx, setIdx] = useState(0);
  const [mine, setMine] = useState("");
  const [compared, setCompared] = useState(false);

  const r = rounds[idx];
  const next = () => {
    setIdx((idx + 1) % rounds.length);
    setMine("");
    setCompared(false);
  };

  return (
    <VaultCard>
      <EraBadge>{t.avEraReverse}</EraBadge>
      <h2 className="text-xl font-bold tracking-tight">{t.avReverseTitle}</h2>
      <p className="mb-4 mt-1 text-[14.5px] text-muted-foreground">{t.avReverseDesc}</p>
      <div className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-[13.5px]">
        <b className="text-accent">{t.avReverseRules}</b>
      </div>
      <div className="mb-3.5 text-center text-[15px] italic text-muted-foreground">{r.def}</div>
      <div className="my-3.5 text-center text-base font-bold tracking-widest text-accent">{r.morph}</div>
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {r.sugg.map((s) => (
          <button key={s} type="button" onClick={() => setMine(s)} className={TILE} disabled={compared}>
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={mine}
          onChange={(e) => setMine(e.target.value)}
          disabled={compared}
          placeholder={t.avCoinagePlaceholder}
          className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3.5 py-2.5 text-[15px] focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => mine.trim() && setCompared(true)}
          disabled={compared}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-50"
        >
          {t.avCompare}
        </button>
      </div>
      {compared && (
        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="rounded-xl bg-accent-soft px-4 py-3.5">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t.avYouCoined}</div>
            <div className="break-all text-[17px] font-bold">{mine.trim()}</div>
          </div>
          <div className="rounded-xl bg-good-soft px-4 py-3.5">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t.avAiCoined}</div>
            <div className="break-all text-[17px] font-bold">{r.ai}</div>
            {r.why && <div className="mt-1.5 text-[12.5px] text-muted-foreground">{r.why}</div>}
          </div>
          <div className="flex justify-center sm:col-span-2">
            <button type="button" onClick={next} className={TILE}>
              {t.avNextRiddle}
            </button>
          </div>
        </div>
      )}
    </VaultCard>
  );
}

// ═══════════ E. Word chain ═══════════

function WordChain({ locale, chain }: { locale: Locale; chain: ChainData }) {
  const t = getDictionary(locale).games;
  const [pos, setPos] = useState(0);
  const [lives, setLives] = useState(3);
  const [done, setDone] = useState<null | "win" | "snap">(null);
  const [shaking, setShaking] = useState<string | null>(null);
  const [cands, setCands] = useState(() => shuffle([chain.links[0].next, ...chain.links[0].dists]));

  const restart = () => {
    setPos(0);
    setLives(3);
    setDone(null);
    setCands(shuffle([chain.links[0].next, ...chain.links[0].dists]));
  };

  const pick = (w: string) => {
    if (done) return;
    const cur = chain.links[pos];
    if (w === cur.next) {
      const nextPos = pos + 1;
      setPos(nextPos);
      if (nextPos >= chain.links.length) {
        setDone("win");
      } else {
        setTimeout(() => setCands(shuffle([chain.links[nextPos].next, ...chain.links[nextPos].dists])), 350);
      }
    } else {
      const l = lives - 1;
      setLives(l);
      setShaking(w);
      setTimeout(() => setShaking(null), 600);
      if (l <= 0) setDone("snap");
    }
  };

  // On a win, pos === links.length — clamp so the "current word" read stays safe.
  const cur = chain.links[Math.min(pos, chain.links.length - 1)];

  return (
    <VaultCard>
      <EraBadge>{t.avEraChain}</EraBadge>
      <h2 className="text-xl font-bold tracking-tight">{t.avChainTitle}</h2>
      <p className="mb-4 mt-1 text-[14.5px] text-muted-foreground">{t.avChainDesc}</p>
      <div className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-[13.5px]">
        <b className="text-accent">{t.avChainRules}</b>
      </div>

      <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2">
        {chain.links.slice(0, pos).map((l) => (
          <span key={l.w} className="flex items-center gap-2">
            <span className="rounded-xl bg-accent-soft px-3.5 py-2 text-sm font-bold text-accent">{l.w}</span>
            <span className="text-xs text-muted-foreground">
              — <b className="text-warn">{l.via}</b> →
            </span>
          </span>
        ))}
        {done !== "win" ? (
          <span className="rounded-xl bg-accent-soft px-3.5 py-2 text-sm font-bold text-accent outline outline-2 outline-accent">
            {cur.w}
          </span>
        ) : (
          <span className="rounded-xl bg-good-soft px-3.5 py-2 text-sm font-bold text-good">
            {chain.links[chain.links.length - 1].w}
          </span>
        )}
      </div>

      {!done ? (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            {cands.map((w, i) => (
              <button
                key={`${pos}-${i}`}
                type="button"
                onClick={() => pick(w)}
                title={chain.defs[w] ?? ""}
                className={shaking === w ? `${TILE_BAD} game-shake` : TILE}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="mt-2.5 text-center text-[13.5px] tracking-[0.3em] text-muted-foreground">
            {"● ".repeat(lives).trim()}
          </div>
        </>
      ) : done === "win" ? (
        <div className="text-center text-sm font-semibold text-good">{t.avChainWin}</div>
      ) : (
        <div className="text-center text-[13.5px] text-muted-foreground">{t.avChainSnap(chain.links.map((x) => x.w).join(" → "))}</div>
      )}

      {done && (
        <div className="mt-3.5 flex justify-center">
          <button type="button" onClick={restart} className={TILE}>
            {t.avChainAgain}
          </button>
        </div>
      )}
    </VaultCard>
  );
}

// ═══════════ Page assembly ═══════════

export function AncientVaultGame({
  locale,
  fusionRounds,
  flowerRounds,
  reverseRounds,
  chain,
}: {
  locale: Locale;
  fusionRounds: FusionRound[];
  flowerRounds: FlowerRound[];
  reverseRounds: ReverseRound[];
  chain: ChainData | null;
}) {
  const t = getDictionary(locale).games;
  const hasMorphemeGames = fusionRounds.length > 0 || flowerRounds.length > 0 || reverseRounds.length > 0;

  return (
    <div>
      <VaultCard>
        <h1 className="text-2xl font-bold tracking-tight">🏛️ {t.cardVaultTitle}</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">{t.avIntro}</p>
      </VaultCard>

      <SatorSquare locale={locale} />
      {fusionRounds.length > 0 && <FusionRiddle locale={locale} rounds={fusionRounds} />}
      {flowerRounds.length > 0 && <FlowerOrder locale={locale} rounds={flowerRounds} />}
      {reverseRounds.length > 0 && <ReverseRiddle locale={locale} rounds={reverseRounds} />}
      {chain && <WordChain locale={locale} chain={chain} />}
      {!hasMorphemeGames && (
        <div className="mb-7 rounded-2xl border border-dashed border-border bg-card px-5 py-4 text-center text-sm text-muted-foreground">
          {t.avMorphemeNote}
        </div>
      )}

      <GameFooter note={t.avFooter} />
    </div>
  );
}
