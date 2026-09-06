// Novelty verification: search-verified evidence that a word (with this meaning) is new.
// Verdicts: NEW | NEAR_EXISTING (word exists, this sense doesn't) | EXISTS | UNVERIFIED.

import { searchWeb, type SearchOutcome } from "./search";
import type { Verification, VerificationQuery } from "./words";

const STOPWORDS = new Set(
  "the a an of to in on for with and or is are be being been that this these those it its as by at from not no but if when who whom which what their there more most other such only own same so than too very can will just should now new one two also into over under about after before between during through against without within along across behind beyond plus per via etc".split(
    " "
  )
);

function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  );
}

function containsWord(haystack: string, word: string): boolean {
  const w = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!w) return false;
  const re = new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`, "i");
  return re.test(haystack.toLowerCase());
}

async function dictionaryCheck(word: string): Promise<{ exists: boolean; senses: string[]; ok: boolean }> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (res.status === 404) return { exists: false, senses: [], ok: true };
    if (!res.ok) return { exists: false, senses: [], ok: false };
    const data = (await res.json()) as { meanings?: { definitions?: { definition: string }[] }[] }[];
    const senses = (data ?? []).flatMap((e) =>
      (e.meanings ?? []).flatMap((m) => (m.definitions ?? []).map((d) => d.definition))
    );
    return { exists: true, senses, ok: true };
  } catch {
    return { exists: false, senses: [], ok: false };
  }
}

export async function verifyNovelty(word: string, definition: string): Promise<Verification> {
  const defKeys = keywords(definition);
  const queries: VerificationQuery[] = [];
  const closest: { url?: string; note: string }[] = [];
  let meaningful = 0;
  let appearances = 0;
  let totalChecked = 0;
  let searchSuccesses = 0;

  const searchPlan = [
    `"${word}"`,
    `"${word}" meaning`,
    `"${word}" definition`,
  ];

  for (const q of searchPlan) {
    let outcome: SearchOutcome = { results: [], ok: false };
    try {
      outcome = await searchWeb(q, 8);
    } catch {
      outcome = { results: [], ok: false };
    }
    const results = outcome.results;
    // A search that ran and found nothing is evidence; a search that never ran is not.
    if (outcome.ok) searchSuccesses += 1;
    totalChecked += results.length;
    let matchesThisQuery = 0;
    for (const r of results) {
      const blob = `${r.title} ${r.snippet}`;
      if (!containsWord(blob, word)) continue;
      appearances += 1;
      const snippetKeys = keywords(r.snippet);
      let overlap = 0;
      for (const k of snippetKeys) if (defKeys.has(k)) overlap += 1;
      const sameSense = overlap >= 2 || (overlap >= 1 && defKeys.size <= 6);
      if (sameSense) {
        meaningful += 1;
        matchesThisQuery += 1;
      }
      if (closest.length < 3) {
        closest.push({
          url: r.url,
          note: sameSense
            ? `uses "${word}" in a possibly related sense: ${r.snippet.slice(0, 140)}`
            : `contains "${word}" in another sense: ${r.snippet.slice(0, 140)}`,
        });
      }
    }
    queries.push({ query: q, results_checked: results.length, meaningful_matches: matchesThisQuery });
  }

  const dict = await dictionaryCheck(word);
  let dictSameSense = false;
  if (dict.exists) {
    for (const sense of dict.senses) {
      const senseKeys = keywords(sense);
      let overlap = 0;
      for (const k of senseKeys) if (defKeys.has(k)) overlap += 1;
      if (overlap >= 2) {
        dictSameSense = true;
        break;
      }
    }
  }

  const checked_at = new Date().toISOString().slice(0, 10);
  const method = "quoted exact-match web search + dictionary lookup (dictionaryapi.dev)";

  let verdict: Verification["verdict"];
  let note: string;
  if (dictSameSense || meaningful >= 2) {
    verdict = "EXISTS";
    note = dict.exists
      ? "Established dictionary sense overlaps this definition."
      : "Multiple web results already use this word with the same meaning.";
  } else if (searchSuccesses === 0) {
    // The primary evidence channel produced nothing at all. Falling through to NEW here
    // would assert novelty from zero checked results — the exact failure this gate exists
    // to prevent. Positive dictionary evidence is still handled by the EXISTS branch above.
    verdict = "UNVERIFIED";
    note = dict.ok
      ? "Web search was unreachable or blocked, so novelty could not be established."
      : "Search and dictionary services were unreachable; novelty not established.";
  } else if (meaningful === 1 || (dict.exists && !dictSameSense) || appearances >= 3) {
    verdict = "NEAR_EXISTING";
    note = "The word form appears elsewhere (or exists in the dictionary) but not with this meaning — published with caveat.";
  } else {
    verdict = "NEW";
    note = `No established usage of "${word}" with this meaning found in ${totalChecked} checked results.`;
  }

  return { verdict, checked_at, method, queries, closest_matches: closest, note };
}

export function badgeFromVerdict(v: Verification["verdict"]): string {
  switch (v) {
    case "NEW":
      return "new";
    case "NEAR_EXISTING":
      return "near_existing";
    case "EXISTS":
      return "collision";
    default:
      return "unverified";
  }
}
