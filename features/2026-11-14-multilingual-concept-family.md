# Multilingual expansion (DE/EN/ES/FR) — concept-family model

**Date:** 2026-11-14 · **Status:** phase 1 shipped (this commit); phases 2–4 planned · **Requested by:** site owner

## Requirement

As stated by the site owner: expand the site to four languages — German, English,
Spanish, French — following how multilingual sites like Wikipedia work, with every
future feature designed multilingual-aware from the start. Each word must exist in
four versions — headword *and* definition in each language ("词加释义都有四个版本").
Additionally (2026-11-14): per-language coinages must follow each language's own
grammar and use standard dictionary citation forms — never English patterns copied over.

## Problem / goal

The dictionary was English-only: no language field in the DB, no i18n routing, all
UI strings hardcoded. Machine translation would produce four skins of the same
English site; the owner wants each phenomenon to have a *native* coinage per
language. The architecture must also give every future feature an extension path:
content tables carry language, UI strings live in dictionaries, routes have a
locale pattern, APIs accept a language parameter.

## Decided behavior

Locked decisions (2026-11-14, owner):

1. **Concept-family model (Wikidata-style).** One social phenomenon = one concept.
   Each language version is a full independent entry; the four headwords are
   unrelated native coinages (graywashing → die Grauwäscherei → el lavadogris →
   le grisblanchiment), never machine translations of each other. The family link
   lives in the DB (`concepts` table + `words.concept_id`) and is established at
   coinage time — not by matching word forms.
2. **Per-language independent coinage.** AI follows each language's morphology
   (hardcoded "grammar cards" in the phase-3 prompts: DE solid Komposita with Fugen
   elements, gender inherits from the head noun, der/die/das + plural required;
   ES suffix derivation first, el/la by suffix, Spanish accentuation rules; FR
   derivation first, le/la, élision, FranceTerme nativization tradition).
   Novelty verification runs against the target language's sources; review per
   language. Gender/plural are code-validated (whitelist, like categories) and
   stored in `words.grammar_json`.
3. **Architecture first, backfill in batches.** Build the foundation now; the 765
   existing entries get DE/ES/FR siblings later through the normal review pipeline.
4. **Votes per language.** Votes attach to entries (`word_id`), so each language's
   entry accumulates its own votes; per-locale leaderboards count only that
   language's entries.
5. **Switcher = style D** (owner's pick from 4 mockups): navbar language dropdown
   for the site + an entry-page language row ("Auch auf: …") listing only languages
   that exist for that concept. No machine-translation fallback — absent languages
   simply don't appear.
6. **URLs:** English keeps the root (`/words/graywashing`; the 773 indexed URLs are
   untouched); DE/ES/FR live under `/de/ /es/ /fr/`; hreflang ×4 + x-default → EN;
   sitemap gains per-locale sections.
7. **Additive routing.** Existing root routes stay as-is; `app/[locale]/` holds thin
   de/es/fr routes rendering the same shared components. (Rejected: migrating all
   13 pages into a `[locale]` segment with middleware rewrites — disproportionate
   risk for a live, indexed site.) `localePath()` will centralize the "EN = root"
   special case.
8. **Dictionary citation forms.** German headwords capitalized, with article and
   plural (die Grauwäscherei, Pl. die Grauwäschereien); Spanish lowercase lemma +
   gender (el lavadogris; compounds pluralize invariable); French lowercase lemma +
   gender (le grisblanchiment).
9. `/admin` and `/review` stay English-only (owner-only pages).

## Acceptance criteria

Phase 1 — data foundation (this commit):
- [x] Migration runs idempotently on local and Turso: 771 words ↔ 771 concepts,
      0 unlinked words, 0 live family duplicates
- [x] Every pre-existing word anchors its own concept; all rows language='en'
- [x] One live entry per concept per language enforced by a partial unique index
      (published/in_review count; rejected exempt; concept-less rows unaffected)
- [x] `getWordFamily(conceptId)` returns published siblings ordered en→de→es→fr
- [x] Zero visible change: prod homepage, words API, search all behave as before
- [x] vitest 378 (6 new), tsc clean, eslint 0 errors, e2e 124/124

Phase 2 — i18n UI layer: dictionaries + `[locale]` thin routes + style-D switcher +
hreflang/sitemap alternates + per-locale empty states; EN root byte-identical.

Phase 3 — per-language coin pipeline: grammar-card prompts (all content fields
localized), language parameter on coin/words APIs, review queue language
badge/filter, per-language novelty verification; pilot: 10 flagship concepts × 4
languages end to end.

Phase 4 — backfill 765×3 through the existing review pipeline; sitemap ~3100 URLs
+ GSC resubmit.

## Implementation (phase 1)

- `src/lib/db.ts` — `concepts` table in SCHEMA_STATEMENTS; `words` gains
  `language` (default 'en'), `concept_id`, `grammar_json`; ensureSchema
  self-migrates: PRAGMA-guarded ALTERs, batched per-word concept backfill
  (label = headword), partial unique index
  `idx_words_concept_language_active(concept_id, language) WHERE status IN
  ('published','in_review')` created after the backfill.
- `src/lib/words.ts` — `Grammar` type; hydrate parses `grammar_json`;
  `getWordFamily(conceptId)`.
- `scripts/migrate-multilingual.mjs` — explicit `--target local|turso` runs with
  a verification report (same steps as the ensureSchema boot-time backstop).
- `tests/helpers/db.ts` — seeds carry the new columns; resetDb clears concepts.
- `tests/lib/multilingual.test.ts` — 6 tests (family order, unpublished hidden,
  empty family, uniqueness incl. in_review, cross-language/rejected allowed,
  hydrate/grammar/public shape).

## Verification

- vitest 378/378 (6 new) · tsc 0 errors · eslint 0 errors (17 pre-existing
  unused-import warnings) · e2e 124/124 against a fresh dev server.
- Migration executed on both databases: 771 words ↔ 771 concepts, 0 unlinked,
  0 live duplicates, idempotent re-run clean.
- Prod spot-check unchanged after the DB change: homepage 200, words API OK,
  search 7 hits.
