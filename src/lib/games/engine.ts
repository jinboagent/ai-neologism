// Game engine — a faithful port of the gamesite prototype (game/gamesite/lexicon.py).
// Pure core: no db/i18n imports here, everything takes its word list as input so
// the whole engine is testable offline against synthetic fixtures.
//
// What it computes, per language:
//   morphemes (parsed from why_this_word) → morpheme families → fusion / flower /
//   reverse-riddle rounds;  5-gram index → word chains;  category index →
//   Connections boards;  deterministic Daily Word;  demo semantic-ladder board.

export type GameWord = {
  word: string;
  pos: string;
  definition: string;
  explanation: string;
  why: string;
  ipa: string;
  related: string[];
  categories: string[];
};

export type FamilyMap = Record<string, string[]>;

export type GramIndex = {
  gramsOf: Map<string, Set<string>>; // word -> its 5-grams
  wordsWith: Map<string, Set<string>>; // 5-gram -> words containing it
};

// ---------- randomness (Math.random for live rounds; seeded for demo boards) ----------

export type Rng = () => number;

/** mulberry32 — tiny deterministic PRNG for the daily semantic board. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Sample k items without replacement (Python random.sample). */
export function sample<T>(arr: T[], k: number, rng: Rng = Math.random): T[] {
  const pool = arr.slice();
  const n = Math.min(k, pool.length);
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

function randInt(maxExclusive: number, rng: Rng): number {
  return Math.floor(rng() * maxExclusive);
}

// ---------- why_this_word parsing ----------

const CUT = /[;—–:(]/;
const COMPONENT_OK = /^[A-Za-z][A-Za-z\s\-']{0,24}$/;

/** Extract raw components from "A + B (+C); reason…" style strings. */
export function parseComponents(why: string): string[] {
  if (!why) return [];
  const parts = why.split("+", 3); // Python split("+", maxsplit=2)
  const out: string[] = [];
  for (const raw of parts) {
    let p = raw.split(CUT)[0] ?? "";
    p = p
      .replace(/\*/g, " ")
      .replace(/'/g, " ")
      .replace(/^[\s._\-’"]+|[\s._\-’"]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (p && COMPONENT_OK.test(p)) out.push(p.toLowerCase());
  }
  return out;
}

export function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Components whose compact concatenation rebuilds the word exactly. Parity with
 * the prototype: the comparison is against the raw lowercased word, so
 * hyphenated coinages never validate (they stay out of fusion/reverse).
 */
export function validatedComponents(w: GameWord): string[] | null {
  const comps = parseComponents(w.why);
  if (comps.length < 2) return null;
  if (comps.map(compact).join("") === w.word.toLowerCase()) return comps;
  return null;
}

// ---------- morpheme families ----------

export function buildFamilies(words: GameWord[]): FamilyMap {
  const fam = new Map<string, Set<string>>();
  for (const w of words) {
    for (const c of new Set(parseComponents(w.why))) {
      const key = compact(c);
      if (key.length < 3) continue;
      if (!fam.has(key)) fam.set(key, new Set());
      fam.get(key)!.add(w.word);
    }
  }
  // Substring sweep: a known morpheme found inside any other word grows its family.
  const keys = [...fam.keys()];
  for (const key of keys) {
    const set = fam.get(key)!;
    for (const w of words) if (w.word.toLowerCase().includes(key)) set.add(w.word);
  }
  const out: FamilyMap = {};
  for (const [k, v] of fam) if (v.size >= 3) out[k] = [...v].sort();
  return out;
}

export function bigFamilies(families: FamilyMap, minSize = 3): FamilyMap {
  const out: FamilyMap = {};
  for (const [k, v] of Object.entries(families)) if (v.length >= minSize) out[k] = v;
  return out;
}

// ---------- 5-grams & word chains ----------

export function buildGramIndex(words: GameWord[]): GramIndex {
  const gramsOf = new Map<string, Set<string>>();
  const wordsWith = new Map<string, Set<string>>();
  for (const w of words) {
    const wl = w.word.toLowerCase();
    const g = new Set<string>();
    for (let i = 0; i + 5 <= wl.length; i++) g.add(wl.slice(i, i + 5));
    gramsOf.set(w.word, g);
    for (const gram of g) {
      if (!wordsWith.has(gram)) wordsWith.set(gram, new Set());
      wordsWith.get(gram)!.add(w.word);
    }
  }
  return { gramsOf, wordsWith };
}

/** Longest common substring — the chain's "via" display. */
export function longestSharedRun(a: string, b: string): string {
  const A = a.toLowerCase();
  const B = b.toLowerCase();
  let best = "";
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B.length; j++) {
      let k = 0;
      while (i + k < A.length && j + k < B.length && A[i + k] === B[j + k]) k++;
      if (k > best.length) best = A.slice(i, i + k);
    }
  }
  return best;
}

function intersectSize(a: Set<string> | undefined, b: Set<string> | undefined): number {
  if (!a || !b) return 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  let n = 0;
  for (const x of small) if (big.has(x)) n++;
  return n;
}

export type ChainLink = { w: string; next: string; via: string; dists: string[] };
export type ChainData = { links: ChainLink[]; final: string; defs: Record<string, string> };

/**
 * Word-chain links: each link = current word, next word (shares a ≥5-gram), the
 * shared run, and safe distractors (share NO 5-gram with the current word).
 */
export function chainRound(
  words: GameWord[],
  gi: GramIndex,
  opts: { length?: number; distractors?: number; rng?: Rng } = {}
): ChainData | null {
  const { length = 6, distractors = 3, rng = Math.random } = opts;
  const byWord = new Map(words.map((w) => [w.word, w]));
  for (let attempt = 0; attempt < 30; attempt++) {
    const used = new Set<string>();
    let cur = pick(words, rng).word;
    const links: ChainLink[] = [];
    let ok = true;
    for (let step = 0; step < length - 1; step++) {
      const cands = new Set<string>();
      for (const g of gi.gramsOf.get(cur) ?? []) {
        for (const w of gi.wordsWith.get(g) ?? []) cands.add(w);
      }
      for (const u of used) cands.delete(u);
      cands.delete(cur);
      if (cands.size === 0) {
        ok = false;
        break;
      }
      const nxt = pick([...cands].sort(), rng);
      const via = longestSharedRun(cur, nxt);
      if (via.length < 5) {
        ok = false;
        break;
      }
      const pool = words.filter(
        (w) => w.word !== cur && w.word !== nxt && !used.has(w.word) && intersectSize(gi.gramsOf.get(w.word), gi.gramsOf.get(cur)) === 0
      );
      const ds = sample(pool.map((w) => w.word), Math.min(distractors, pool.length), rng);
      links.push({ w: cur, next: nxt, via, dists: ds });
      used.add(cur);
      cur = nxt;
    }
    if (ok && links.length === length - 1) {
      used.add(cur);
      const defs: Record<string, string> = {};
      for (const w of used) {
        const entry = byWord.get(w);
        if (entry) defs[w] = entry.definition;
      }
      return { links, final: cur, defs };
    }
  }
  return null;
}

// ---------- Daily Word ----------

const DAYS_BEFORE_1970 = 719163; // date(1970-01-01).toordinal()

function todayOrdinal(): number {
  const now = new Date();
  const utc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(utc / 86_400_000) + DAYS_BEFORE_1970;
}

/** Deterministic per date — the same Daily Word for every player of a language. */
export function dailyIndex(len: number, ordinal = todayOrdinal()): number {
  return len > 0 ? ordinal % len : 0;
}

// ---------- shared payload shapes ----------

export type WordPayload = {
  w: string;
  pos: string;
  ipa: string;
  cat: string;
  morphemes: string;
  def: string;
  why: string;
};

export function morphemesOf(w: GameWord): string {
  const comps = parseComponents(w.why);
  if (comps.length) return comps.join(" + ");
  return compact(w.why.split(";")[0]).slice(0, 40);
}

export function wordPayload(w: GameWord): WordPayload {
  return {
    w: w.word,
    pos: w.pos,
    ipa: w.ipa,
    cat: w.categories[0] ?? "—",
    morphemes: morphemesOf(w),
    def: w.definition,
    why: w.why.replace(/\*/g, ""),
  };
}

export type MeaningData = { words: WordPayload[]; dailyIndex: number; dailyWord: string };

/** meaning-reveal: 11 random words + today's Daily Word (same for everyone). */
export function meaningPayload(words: GameWord[], nExtra = 11, rng: Rng = Math.random): MeaningData {
  if (words.length === 0) return { words: [], dailyIndex: 0, dailyWord: "" };
  const pool = words.filter((w) => w.definition);
  const daily = words[dailyIndex(words.length)];
  const rest = pool.filter((w) => w.word !== daily.word);
  const chosen = sample(rest, Math.min(nExtra, rest.length), rng);
  const payloadWords = chosen.map(wordPayload);
  const insertAt = randInt(payloadWords.length + 1, rng);
  payloadWords.splice(insertAt, 0, wordPayload(daily));
  return { words: payloadWords, dailyIndex: insertAt, dailyWord: daily.word };
}

export type RealOrFakeData = { rounds: { word: string; real: string; why: string; fakes: string[] }[] };

/** Balderdash v0: real definition + decoys that are definitions of OTHER real words. */
export function realOrFakePayload(words: GameWord[], n = 5, rng: Rng = Math.random): RealOrFakeData {
  const pool = words.filter((w) => w.definition);
  const allDefs = pool.map((w) => w.definition);
  const rounds: RealOrFakeData["rounds"] = [];
  for (const w of sample(pool, Math.min(n, pool.length), rng)) {
    const fakes: string[] = [];
    let guard = 0;
    while (fakes.length < 3 && guard < 200) {
      guard++;
      const cand = pick(allDefs, rng);
      if (cand !== w.definition && !fakes.includes(cand)) fakes.push(cand);
    }
    rounds.push({ word: w.word, real: w.definition, why: w.why.replace(/\*/g, ""), fakes });
  }
  return { rounds };
}

export type CategorySortData = { categories: { name: string; words: string[] }[] };

export function categorySortPayload(words: GameWord[], rng: Rng = Math.random): CategorySortData {
  const catIndex = new Map<string, string[]>();
  for (const w of words) {
    for (const c of w.categories) {
      if (!catIndex.has(c)) catIndex.set(c, []);
      catIndex.get(c)!.push(w.word);
    }
  }
  const eligible = [...catIndex.entries()].filter(([, ws]) => ws.length >= 4).map(([c]) => c);
  const chosen = sample(eligible, Math.min(4, eligible.length), rng);
  return { categories: chosen.map((c) => ({ name: c, words: sample(catIndex.get(c)!, 4, rng) })) };
}

// ---------- ancient vault: fusion / reverse / flower ----------

export type FusionRound = { def: string; parts: string[]; decoys: string[]; word: string; why: string };

/** Fusion (Lihe): rebuild the coinage from its real morphemes (+ decoy morphemes). */
export function fusionRound(words: GameWord[], rng: Rng = Math.random): FusionRound | null {
  const pool = words.filter((w) => validatedComponents(w));
  if (!pool.length) return null;
  const w = pick(pool, rng);
  const comps = validatedComponents(w)!;
  const real = comps.map(compact);
  const decoyPool = new Set<string>();
  for (const x of words) {
    if (x.word === w.word) continue;
    for (const c of parseComponents(x.why)) decoyPool.add(compact(c));
  }
  for (const r of real) decoyPool.delete(r);
  const filtered = [...decoyPool].filter((d) => d.length >= 3 && !w.word.toLowerCase().includes(d));
  const decoys = sample(filtered, Math.min(2, filtered.length), rng);
  return { def: w.definition, parts: real, decoys, word: w.word, why: w.why.replace(/\*/g, "") };
}

export function fusionPayload(words: GameWord[], n = 5, rng: Rng = Math.random): FusionRound[] {
  const seen = new Set<string>();
  const rounds: FusionRound[] = [];
  for (let i = 0; i < n * 6; i++) {
    const r = fusionRound(words, rng);
    if (r && !seen.has(r.word)) {
      seen.add(r.word);
      rounds.push(r);
    }
    if (rounds.length >= n) break;
  }
  return rounds;
}

export type ReverseRound = { def: string; morph: string; ai: string; sugg: string[]; why: string };

/** Reverse riddle: player coins a word for a definition, then compares with the AI's. */
export function reverseRound(words: GameWord[], rng: Rng = Math.random): ReverseRound | null {
  const pool = words.filter((w) => {
    const c = validatedComponents(w);
    return c !== null && c.length === 2;
  });
  if (!pool.length) return null;
  const w = pick(pool, rng);
  const comps = validatedComponents(w)!;
  const [a, b] = comps.map(compact);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [w.word, b + a, a + "er", b + "ly", a + "ful"]) {
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return { def: w.definition, morph: comps.join(" + "), ai: w.word, sugg: out.slice(0, 5), why: w.why.replace(/\*/g, "") };
}

export function reversePayload(words: GameWord[], n = 4, rng: Rng = Math.random): ReverseRound[] {
  const seen = new Set<string>();
  const rounds: ReverseRound[] = [];
  for (let i = 0; i < n * 6; i++) {
    const r = reverseRound(words, rng);
    if (r && !seen.has(r.ai)) {
      seen.add(r.ai);
      rounds.push(r);
    }
    if (rounds.length >= n) break;
  }
  return rounds;
}

export type FlowerRound = { key: string; label: string; words: string[]; distractors: string[]; defs: Record<string, string> };

/** Flower Order (Feihualing): a morpheme family + tiles that hide it + safe distractors. */
export function flowerPayload(words: GameWord[], families: FamilyMap, n = 3, rng: Rng = Math.random): FlowerRound[] {
  const byWord = new Map(words.map((w) => [w.word, w]));
  const fams: [string, string[]][] = Object.entries(bigFamilies(families, 4)).filter(([k]) => k.length >= 4);
  if (fams.length < n) {
    for (const [k, v] of Object.entries(bigFamilies(families, 3))) {
      if (k.length >= 4 && !fams.some(([fk]) => fk === k)) fams.push([k, v]);
    }
  }
  if (!fams.length) return [];
  const chosen = sample(fams, Math.min(n, fams.length), rng);
  const rounds: FlowerRound[] = [];
  for (const [key, members] of chosen) {
    const distractorPool = words.filter((w) => !w.word.toLowerCase().includes(key)).map((w) => w.word);
    const ds = sample(distractorPool, Math.min(5, distractorPool.length), rng);
    const defs: Record<string, string> = {};
    for (const m of members) {
      const entry = byWord.get(m);
      if (entry) defs[m] = entry.definition;
    }
    rounds.push({ key, label: key, words: members, distractors: ds, defs });
  }
  return rounds;
}

// ---------- semantic ladder (demo board; real version needs word embeddings) ----------

export type SemanticBoard = { w: string; def: string; why: string; bank: string[]; scores: Record<string, number> };
export type SemanticData = { words: SemanticBoard[] };

export const SEMANTIC_BOARD_SIZE = 4;

/**
 * Demo board, deterministic per (language, day): the hidden words and the
 * closeness arc are seeded, so everyone solving on the same day sees the same
 * ladder. Scores are simulated — the real version needs word embeddings.
 */
export function semanticPayload(words: GameWord[], bank: string[], locale: string, ordinal = todayOrdinal()): SemanticData {
  const pool = words.filter((w) => w.definition);
  if (pool.length < SEMANTIC_BOARD_SIZE) return { words: [] };
  const rng = mulberry32((hashString(locale) ^ ordinal) >>> 0);
  const chosen = sample(pool, SEMANTIC_BOARD_SIZE, rng);
  const arc = [88, 83, 78, 73, 69, 65, 61, 57, 52, 47, 11, 6];
  const out = chosen.map((w) => {
    const brng = mulberry32(hashString(w.word));
    const order = sample(bank, bank.length, brng);
    const scores: Record<string, number> = {};
    order.forEach((b, i) => {
      scores[b] = arc[i] ?? 20;
    });
    return { w: w.word, def: w.definition, why: w.why.replace(/\*/g, ""), bank, scores };
  });
  return { words: out };
}

// ---------- stats & per-language availability ----------

export type GameStats = { words: number; families: number; categories: number; categoriesList: string[] };

export function stats(words: GameWord[], families: FamilyMap): GameStats {
  const cats = new Set<string>();
  for (const w of words) for (const c of w.categories) cats.add(c);
  return { words: words.length, families: Object.keys(families).length, categories: cats.size, categoriesList: [...cats].sort() };
}

export type GameAvailability = {
  meaning: boolean;
  realOrFake: boolean;
  categorySort: boolean;
  semantic: boolean;
  fusion: boolean;
  reverse: boolean;
  flower: boolean;
  chain: boolean;
};

/**
 * Which games a language's published data can actually support right now.
 * Morpheme games need why_this_word — languages light them up automatically
 * once their entries carry the field.
 */
export function availability(words: GameWord[], families: FamilyMap, gi: GramIndex): GameAvailability {
  const withDef = words.filter((w) => w.definition).length;
  const fusionPool = words.filter((w) => validatedComponents(w)).length;
  const reversePool = words.filter((w) => {
    const c = validatedComponents(w);
    return c !== null && c.length === 2;
  }).length;
  const flowerFams = Object.entries(bigFamilies(families, 3)).filter(([k]) => k.length >= 4).length;
  const catIndex = new Map<string, number>();
  for (const w of words) for (const c of w.categories) catIndex.set(c, (catIndex.get(c) ?? 0) + 1);
  const eligibleCats = [...catIndex.values()].filter((n) => n >= 4).length;
  return {
    meaning: withDef >= 4,
    realOrFake: withDef >= 4,
    categorySort: eligibleCats >= 1, // payload samples min(4, eligible) — fewer groups still play
    semantic: withDef >= SEMANTIC_BOARD_SIZE,
    fusion: fusionPool >= 3,
    reverse: reversePool >= 3,
    flower: flowerFams >= 2,
    chain: chainRound(words, gi, { length: 4 }) !== null,
  };
}
