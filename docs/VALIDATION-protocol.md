# VALIDATION PROTOCOL — how a new word earns its place

- **Date:** 2026-10-31 — this document is the canonical, recorded validation step for the project
- **Scope:** every candidate word, from any channel (web form, AI wizard, API, nightly auto-coiner, editorial batch)
- **Related:** [REQUIREMENTS-03 §1](REQUIREMENTS-03-novelty-and-anti-abuse.md) (gate requirements), [REVIEW-01](../../docs/REVIEW-01-website-ux.md) (D5/D6/D15)

---

## 1. The claim being validated

A word may be published only if it has **never been used before with this meaning**. Because no search engine proves a negative, the site's formal claim is always dated and scoped:

> *No usage with this meaning was found in the queried indexes and dictionaries, on the checked date; the full search evidence is published with the entry.*

## 2. Craft-rule checklist (applied before any search)

Every candidate must pass all six:

1. **Real phenomenon** — names an observable, describable social pattern (not a joke, not a private in-joke).
2. **Pronounceable** — a reader who sees it can say it.
3. **Length** — preferably ≤ 4 syllables.
4. **Productive morphology** — built from established English word-formation: compounds, blends with clean clipping, or live affixes (-washing, -flation, -creep, -splaining, -poverty, micro-, synth-). The morpheme boundaries must be real: the word should *parse*. Compounds must also pass the **fusion-necessity test** (added 2026-11-08): fusing a pre-existing, frequent phrase whose meaning is purely compositional is a respelling, not a coinage — full test in [REVIEW-criteria.md](REVIEW-criteria.md) §1.10.
5. **No brands or trademarks.**
6. **Etymology stated** — the roots and the reason they fit, recorded in "Why this word."

**Completeness rules for machine-coined words** (AI wizard, nightly auto-coiner, editorial batches — stricter than the human form, where these stay optional):

7. **Pronunciation required** — every AI-coined candidate must propose an IPA transcription. The coining engine's output schema makes it mandatory.
8. **Related words: best effort** — the engine must attempt to place the coinage among existing entries (or established terms); if no meaningful relation exists, an empty list is acceptable — but absence must be a judgment, not an omission. Suggestions are stored only when they point at entries that actually exist, so no word page links into a 404.
9. **Categories pre-selected** — every AI-coined candidate must propose 1–2 categories from the fixed taxonomy. The reviewer inherits the proposal pre-selected in the edit panel and only adjusts if it's wrong — categorization is never left to the admin as fresh work.

## 3. The search plan (novelty verification)

For each candidate, the engine (`src/lib/verify.ts`) runs:

| Step | Query / check | Purpose |
|---|---|---|
| 1 | Internal corpus | not already in our dictionary |
| 2 | `"word"` (quoted, exact) | exact-form usage anywhere the index reaches |
| 3 | `"word" meaning` | definition-style pages for the exact form |
| 4 | `"word" definition` | ditto, second phrasing |
| 5 | Dictionary API | does the word form exist with an overlapping sense? |

**Same-meaning heuristic:** a result counts as a meaningful match only when its keywords overlap the proposed definition (stopwords filtered; ≥ 2 overlapping keywords, or ≥ 1 for short definitions). Finding the word form in an unrelated sense does **not** fail the check.

**Beyond the exact string:** for words with a foreign root or a compound/blend form, the reviewer must additionally search the source language(s) and the decomposed (split) phrase — see [REVIEW-novelty-search-rules.md](REVIEW-novelty-search-rules.md). The exact-string plan above is the floor, not the ceiling.

**Engines are named and dated** in every evidence log — "searched via [engine], checked YYYY-MM-DD" — because "searched the internet" is not a defensible claim.

## 4. Verdicts and gates

| Verdict | Condition | Gate |
|---|---|---|
| **NEW** | no same-meaning usage found in checked results | publishable, ✓ badge |
| **NEAR_EXISTING** | word form exists; this sense doesn't | publishable with ~ caveat badge |
| **EXISTS** | dictionary or ≥ 2 web results use this meaning | **blocked** (409 on submission; batch runs skip the word) |
| **UNVERIFIED** | search/dictionary services unreachable or throttled | enters review flagged; reviewer decides with the honest badge |

Raw result counts are never the verdict — the question is always *does anyone use this form with this meaning?*

## 5. What is recorded per word (the evidence record)

Stored in `verification_json` and rendered on the word page:

- verdict + date checked + method string (which engines)
- per-query log: query text, results checked, same-sense matches
- up to 3 closest matches with URLs and notes
- the reviewer's decision + reason (public audit trail, `reviews` table)

## 6. Batch validation (editorial runs of many words)

For large batches (e.g. the 200-word program):

1. **Candidates are authored against §2 first** — craft rules before any search.
2. Each word runs the full §3 search plan via the site pipeline; a per-word delay keeps keyless providers within polite-use limits.
3. **Honest throttling policy:** when a search provider rate-limits mid-run, remaining words are recorded as UNVERIFIED (never silently marked NEW). The batch report states how many were truly searched.
4. **Batch report** — counts per verdict, per-word list, method and date — is written to `docs/` and quoted in the review handoff.
5. Every inserted word carries `input_type` marking its channel; machine-channel words go to the **admin-only queue** (D24), where the human reviewer is the final gate.
6. Idempotency: re-runs skip words already present; no duplicates.

## 7. After publication

- **Adoption vote** (community signal) and
- **periodic re-verification** (~6–12 months, D15): if the word has spread, the badge graduates to ★ "Now in real use."
