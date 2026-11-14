# Trust & credibility layer (identity, legal, structured data, share cards)

**Date:** 2026-11-14 · **Status:** shipped · **Requested by:** site owner
Owner's words: the page "gives the feeling of not knowing where it comes from" —
make it look professional and reliable, because this is becoming a commercial
project. Scope decided via options dialog: identity = **The AI Neologism
Project** (with hello@ai-neologism.com), scope = **P0+P1 in one pass**.

## Problem / goal

The design and typography were already solid; what was missing were the three
layers that make a reference site read as an institution rather than a hobby
page: identity (who is behind this), authority (why the content deserves
trust), and compliance (the pages a commercial site must have). The site's
biggest credibility asset — the per-entry novelty evidence — was hidden inside
collapsed details elements, and Google had no structured signal that these
pages are dictionary entries.

## Decided behavior

- **Identity is the project, not a person** (owner's pick): the footer's
  identity block reads "The AI Neologism Project · since 2026" with
  hello@ai-neologism.com as the contact. The public GitHub repository is
  linked as an open-source trust signal.
- **Footer becomes a four-column block**: brand/identity, Explore
  (localized links), Participate (+ GitHub ↗), Legal — replacing the one-line
  footer. All labels come from the dictionaries (new keys ×4 languages).
- **Legal pages (English, plain-language templates, marked "not legal
  advice")**: /privacy documents what the site actually does (no accounts,
  hashed fingerprints, optional contact email, functional locale cookie,
  Vercel Analytics, no ads/selling); /terms covers content ownership,
  acceptable use (mirroring the editorial line against group-targeting), and
  no-warranty for evolving novelty claims; **/impressum is German** because
  the German edition makes it legally mandatory (§ 5 DDG) — it carries
  clearly marked PLATZHALTER fields (operator name + address) that the owner
  MUST fill before commercial operation in Germany, and discloses Vercel as
  the host.
- **Homepage trust strip** under the hero: three live-from-DB stats — words
  coined and published · entries search-verified (badge `new`/`near_existing`)
  · 100% human-reviewed before publication. The metric is deliberately
  badge-based, not "query logs present" — a first probe showed only 26 of
  1552 entries carry full query logs, which would have advertised the gap.
- **Word pages emit schema.org `DefinedTerm` JSON-LD** (name, description,
  termCode, canonical URL, alternateName from the concept family,
  inDefinedTermSet) — the signal that distinguishes a dictionary entity from
  a blog post in search results.
- **Branded OG cards via `next/og`**: a site default card plus dynamic
  per-entry cards on `words/[slug]` and `[locale]/words/[slug]` (headword +
  definition in the entry's own language, brand footer line). IPA is
  deliberately left off — the default OG font can't render it reliably.
  Twitter card upgraded to `summary_large_image`.
- About gains a "Who we are" section first in the reading order; the
  `Prose` renderer now bypasses localePath for http/mailto links (the
  mailto and GitHub links must never get a locale prefix).
- Legal pages are registered in the sitemap and excluded from the
  Accept-Language locale redirect (they are EN-only by design).
- **Deferred pending owner decision**: the CC BY-SA 4.0 mentions (footer +
  About, ×4 languages) remain until the owner confirms their removal — the
  same commercial logic applies, but it was a deliberate earlier decision
  and the removal touches 8 localized strings.

## Acceptance criteria

- [x] Footer shows the identity block, contact email and GitHub link in all
      four languages
- [x] About opens with "Who we are"; mailto/GitHub links work without locale
      prefixes
- [x] /privacy, /terms, /impressum serve; /impressum carries the PLATZHALTER
      warning; legal pages never redirect by Accept-Language
- [x] Trust strip renders live numbers (locally: 1552 words coined · 1531
      search-verified — grows automatically with imports)
- [x] Word pages carry DefinedTerm JSON-LD
- [x] Dynamic OG cards render as PNG on EN and [locale] entry routes
- [x] vitest 441 · e2e 163 (6 new trust-layer checks) · tsc/eslint clean

## Implementation

- `src/components/site-footer.tsx` — four-column rewrite.
- `src/components/pages/about-page.tsx` — Who-we-are section.
- `src/components/pages/home-page.tsx` + `src/lib/words.ts` — trust strip +
  `countSearchVerified(language?)`.
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`,
  `src/app/impressum/page.tsx` — legal pages.
- `src/components/pages/word-page.tsx` — DefinedTerm JSON-LD + Prose
  http/mailto bypass.
- `src/app/opengraph-image.tsx`,
  `src/app/words/[slug]/opengraph-image.tsx`,
  `src/app/[locale]/words/[slug]/opengraph-image.tsx` — OG cards.
- `src/lib/i18n/{en,de,es,fr}.ts` — 14 new keys each (footer columns, stats,
  who-we-are prose).
- `src/app/layout.tsx` (twitter card), `src/app/sitemap.ts` (legal pages).
- `scripts/test.mjs` — 6 new e2e checks.

## Verification

- vitest 441/441 · tsc 0 errors · eslint 0 errors · e2e 163/163 (privacy/
  terms/impressum serve with expected markers, legal pages never redirect,
  DefinedTerm JSON-LD present on entry pages, OG card renders).
- Manual sweep: footer identity block in four languages, trust strip numbers,
  JSON-LD on /words/graywashing, OG card 200 image/png (~80 KB).
- Owner follow-ups outside the code: create the hello@ai-neologism.com
  mailbox, fill the Impressum placeholders, decide the CC BY-SA removal.
