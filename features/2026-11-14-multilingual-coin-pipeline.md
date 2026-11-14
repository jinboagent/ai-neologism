# Multilingual phase 3 — per-language coin pipeline

**Date:** 2026-11-14 · **Status:** shipped · **Requested by:** site owner
Part 3 of 4 of [the multilingual concept-family feature](./2026-11-14-multilingual-concept-family.md)
(owner: "do it").

## Requirement

The coining pipeline must work per language: a German visitor on /de coins a
GERMAN word following German word-formation (not an English pattern copied
over), with each language's own grammar — gender, plural, orthography — in
standard dictionary form. Submissions, novelty verification and review all run
per language, and the whole chain is proven end to end with a pilot before the
765×3 backfill (phase 4).

## Problem / goal

After phase 2 the UI was localized but the pipeline was still English-only: one
English prompt, no grammar facts, one search plan, slugs that strip umlauts, a
review queue with no language awareness. Coining from /de would have produced
English words.

## Decided behavior

- **One coining prompt per language** (`src/lib/ai.ts`): each hardcodes the
  language's morphology — the grammar cards agreed with the owner — and FORBIDS
  copying English affixes (-washing, -ism). DE: solid Komposita with Fugen
  elements first, productive suffixes, gender inherits from the head noun,
  nouns capitalized; ES: suffix derivation first (-ción/-ismo/-dad…), then
  prefixes, prepositional compounds, solid compounds last, Spanish accentuation
  rules; FR: derivation first (-age/-isme/-tion…), hyphenated compounds,
  élision awareness, FranceTerme nativization tradition. The English prompt is
  verbatim unchanged.
- **Grammar facts are code-validated, never trusted to the model**: the model
  must return `gender` + `plural` for non-English candidates; `gender` must hit
  the per-language whitelist (der|die|das / el|la / le|la) and `plural` must be
  non-empty, otherwise the candidate is DROPPED (same mechanism as the category
  filter). EN candidates have grammar stripped.
- **APIs take language**: `/api/coin/candidates` and `/api/coin/verify` accept
  `locale`; `POST /api/words` accepts `language`, `concept_id` and `grammar`
  (invalid values → 400, never silently remapped; concept must exist;
  `(concept_id, language)` uniqueness violation → 409 CONCEPT_LANGUAGE_TAKEN,
  not a 500). `GET /api/words`, `/api/search` and `/api/popularity` accept
  `?language=`. The intent gate is language-agnostic; only its visitor-facing
  `reason` is written in the site language.
- **Localized slugs**: `slugify(word, locale)` transliterates per Duden
  (ä→ae, ö→oe, ü→ue, ß→ss) for German and NFD-strips diacritics for ES/FR —
  slugs stay ASCII and URL-safe (Grauwäscherei → grauwaescherei).
- **Localized novelty search**: per-language query plans (`"${word}" Bedeutung/
  Duden`, `significado/diccionario`, `définition/dictionnaire`), diacritic
  folding on both sides of the word-form matcher, a Latin-extended keyword
  charset, DE/ES/FR stopwords, and the dictionary API used for EN only (it is
  EN-only; the other editions rely on the localized web plan).
- **Review language awareness**: the review queue gains language filter pills
  (All/EN/DE/ES/FR with counts) and language chips; the admin lists show chips.
- **Operator bypass** added to `/api/coin/candidates` (x-cron-secret), mirroring
  the long-standing bypass on `/api/coin/verify`, so owner batch runs aren't
  strangled by the per-identity cap; the global COIN_DAILY_CAP still applies.
- **Coin-AI wizard passes the page locale**: on /de the wizard proposes German
  candidates and submits a German entry with its grammar. Wizard UI strings
  remain English for now (listed for the phase-4 polish).
- The pilot is owner tooling in `local/` (gitignored): 10 flagship concepts ×
  DE/ES/FR through the dev API, then `local/sync-to-turso.mjs` pushes the
  in_review entries to the live queue. Nothing publishes without human review.

## Acceptance criteria

- [x] locale=de/es/fr selects the corresponding grammar-card prompt; invalid
      gender or missing plural drops the candidate (code, not prompt, decides)
- [x] POST /api/words stores language/concept_id/grammar_json and
      transliterates the slug; unknown language / invalid grammar / unknown
      concept → 400; second live entry for the same concept+language → 409
- [x] Novelty verification runs the localized search plan and folds diacritics
- [x] Review queue filters by language with counts; chips on review + admin
- [x] Pilot: 30/30 (10 flagship × 3 languages) submitted in_review and pushed
      to the live queue; family links surface after publication
- [x] vitest 409 (19 new) · tsc clean · eslint 0 errors · e2e 139 (3 new)

## Implementation

- `src/lib/ai.ts` — PROMPTS per locale, `isValidGender`, `generateCandidates`
  and `assessCoiningIntent` take locale, `parseCandidates(text, locale)`.
- `src/lib/words.ts` — `slugify(word, locale)`.
- `src/lib/verify.ts` — SEARCH_PLANS, `fold()`, localized stopwords, EN-only
  dictionary check, `verifyNovelty(word, definition, locale)`.
- Routes — coin/candidates + coin/verify (locale + bypass), words (POST family
  fields + 409, GET ?language), search + popularity (?language).
- `src/components/coin-ai.tsx` (+ `word-form` Candidate type) — locale prop,
  grammar passthrough; `home-page` passes locale.
- `src/app/review/page.tsx`, `src/app/admin/page.tsx` — language pills + chips.
- `scripts/test.mjs` — phase-3 e2e checks.
- `local/pilot-multilingual.mjs` (gitignored owner tooling) — the pilot runner.

## Verification

- vitest 409/409 — new: prompt selection per locale, gender/plural whitelist
  enforcement, localized gate reason, POST family-field validation (language/
  concept/grammar/409 incl. the libsql quirk that reports COLUMN names rather
  than the index name), GET language filter, slugify per language, localized
  verify plans + diacritic folding.
- e2e 139/139 — new: German submission → 202 with Duden slug, unknown language
  → 400, grammar-less German submission → 400.
- Pilot (live AI + live search attempt): 30/30 submitted; quality mixed as
  expected from a first pass — strong German compounds (Moralwäscher,
  Parkplatzgedächtnis, Feedschmerz), one real collision caught for review
  (canonique is an existing French word), a mistranslation (Kanongewinn) and a
  few wrong plurals — exactly what the human review gate exists to catch. All
  pilot entries carry the unverified badge because local DDG scraping was
  rate-limited during the run; novelty should be re-run at review time.
- Note: the local schema had drifted two columns ahead of Turso
  (`funny_level`, `novelty_level` from the batch-4 session); both were added to
  Turso via ALTER before syncing.
