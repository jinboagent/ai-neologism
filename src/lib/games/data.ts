// Per-language lexicon loading for the games, cached briefly — the published
// words of a language drive every game payload, and the same bundle (words +
// derived morpheme families + 5-gram index) serves all game pages.
import { qAll } from "../db";
import { buildFamilies, buildGramIndex, type FamilyMap, type GameWord, type GramIndex } from "./engine";

export type LexiconBundle = {
  language: string;
  words: GameWord[];
  families: FamilyMap;
  grams: GramIndex;
  loadedAt: number;
};

const TTL_MS = 60_000;

declare global {
  var __gamesLexicon: Map<string, LexiconBundle> | undefined;
}

type Row = {
  word: string;
  part_of_speech: string;
  definition: string;
  explanation: string;
  why_this_word: string;
  pronunciation: string | null;
  related_words: string;
  categories_json: string;
};

function parseJsonArray<T>(raw: string): T[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Normalize categories: nested lists get flattened and joined (prototype parity). */
function normalizeCategories(raw: string): string[] {
  const cats: string[] = [];
  for (const c of parseJsonArray<unknown>(raw)) {
    const joined = Array.isArray(c) ? c.map(String).join(" & ") : String(c);
    if (joined.trim()) cats.push(joined.trim());
  }
  return cats;
}

export async function getLexicon(language: string): Promise<LexiconBundle> {
  const cache = (globalThis.__gamesLexicon ??= new Map<string, LexiconBundle>());
  const hit = cache.get(language);
  if (hit && Date.now() - hit.loadedAt < TTL_MS) return hit;

  const rows = await qAll<Row>(
    `SELECT word, part_of_speech, definition, explanation, why_this_word,
            pronunciation, related_words, categories_json
     FROM words WHERE status = 'published' AND language = ?`,
    [language]
  );
  const seen = new Set<string>();
  const words: GameWord[] = [];
  for (const r of rows) {
    const w = (r.word ?? "").trim();
    if (!w || seen.has(w.toLowerCase())) continue;
    seen.add(w.toLowerCase());
    words.push({
      word: w,
      pos: r.part_of_speech || "noun",
      definition: (r.definition ?? "").trim(),
      explanation: (r.explanation ?? "").trim(),
      why: (r.why_this_word ?? "").trim(),
      ipa: r.pronunciation ?? "",
      related: parseJsonArray<string>(r.related_words).map(String),
      categories: normalizeCategories(r.categories_json),
    });
  }
  words.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));

  const bundle: LexiconBundle = {
    language,
    words,
    families: buildFamilies(words),
    grams: buildGramIndex(words),
    loadedAt: Date.now(),
  };
  cache.set(language, bundle);
  return bundle;
}
