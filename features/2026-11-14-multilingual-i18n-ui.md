# Multilingual phase 2 — i18n UI layer + style-D switcher

**Date:** 2026-11-14 · **Status:** shipped · **Requested by:** site owner
Part 2 of 4 of [the multilingual concept-family feature](./2026-11-14-multilingual-concept-family.md)
(owner said "just do it": push phase 1, then build phase 2 without further asking).

## Requirement

Extend the site to German, English, Spanish and French following Wikipedia-style
multilingual design, with every future feature multilingual-aware — phase 2 is
the UI layer: localized chrome and reading pages, the style-D language switcher,
and the SEO plumbing, while the 773 indexed English URLs stay untouched.

## Problem / goal

After phase 1 the data carried language, but the site was still English-only:
no localized routes, no dictionaries, hardcoded UI strings, no hreflang, and the
switcher from the approved mockups existed only as a static HTML mock.

## Decided behavior

- **English owns the root**; DE/ES/FR live under `/[locale]/…`. Root routes became
  thin `locale="en"` wrappers around shared page components; `app/[locale]/`
  holds the de/es/fr siblings (`generateStaticParams`, invalid locale → 404,
  `/en/…` is not a route). URL set for existing pages is unchanged.
- **Four full dictionaries** (`src/lib/i18n/`): `en.ts` defines `Dictionary = typeof en`
  so a missing key in de/es/fr is a compile error, plus a runtime key-parity test.
  About & criteria long-form prose is fully translated; prose may embed
  `[[label|href]]` link tokens rendered by `splitLinks()`.
- **Style-D switcher, two layers**: navbar globe dropdown (site language;
  writes the `locale-pref` cookie so the first-visit redirect never fights a
  manual choice) + entry-page family row ("Also in: …", only published
  siblings of the concept family).
- **One-time Accept-Language redirect** (middleware): browsers preferring
  de/es/fr are redirected once, and only for paths that exist in that locale;
  cookie or no Accept-Language header (Googlebot) → untouched.
- **Per-language reads**: count/popularity/alphabet/list/search all take a
  `language` filter; the word page refuses to render another language's entry
  under a locale URL (404). German umlaut initials (ÄÖÜ) count in the A–Z.
- **hreflang/canonical**: chrome pages emit all four locales + x-default → EN;
  word pages emit only the family members that actually exist. Sitemap gains
  per-locale chrome URLs and family-based word alternates.
- **Still English by design** until phase 3: /contribute, /search, /seeds,
  /sources, /review, /admin, and the Coin-AI wizard strings. Localized nav
  shows the public reading pages only.
- The html element stays `lang="en"` at the root layout and is corrected
  client-side by `HtmlLangSync`; SEO weight rests on the server-rendered hreflang.

## Acceptance criteria

- [x] `/de`, `/es`, `/fr` serve localized home/index/popularity/about/criteria
      with localized nav, footer, search box and switcher
- [x] Switcher navigates preserving the current page and records the cookie
- [x] First visit with `Accept-Language: de-DE` on `/` → one redirect to `/de`;
      with the cookie → no redirect; `/seeds` never redirects
- [x] `/de/words/graywashing` → 404 (EN-only word), EN word page keeps
      canonical + x-default hreflang; `/en/` → 404
- [x] sitemap.xml contains localized URLs and hreflang alternates
- [x] English root byte-identical behavior (home 200, same strings)
- [x] vitest 390 (12 new) · tsc clean · eslint 0 errors · e2e 136 (11 new)

## Implementation

- `src/lib/i18n/` — `core.ts` (locales, `detectLocale`/`stripLocale`/`localePath`,
  `splitLinks`, locale cookie name), `en/de/es/fr.ts` dictionaries, `index.ts`
  (`getDictionary`), `meta.ts` (`localizedAlternates` for chrome pages,
  `familyAlternates` for entries).
- `src/components/` — `site-header` / `site-footer` / `language-switcher` /
  `html-lang-sync` (client chrome, locale from `usePathname`); `SearchBox`,
  `WordTable`, `VoteWidget` gained `locale` props.
- `src/components/pages/` — shared `home/index/popularity/word/about/criteria`
  page components; word page exports `buildWordMetadata` + family row.
- Routes — root wrappers rewritten; `app/[locale]/` added (6 routes).
- `src/middleware.ts` — one-time Accept-Language redirect with allowlist.
- `src/lib/words.ts` — language filters + `getWord` language guard.
- `src/app/sitemap.ts` — locale URLs + alternates.
- `CONVENTIONS.md` — standing working rules distilled from this build (tracked).

## Verification

- vitest 390/390 — new: i18n core (localePath/detect/strip/splitLinks),
  dictionary key parity for de/es/fr, pluralization helpers, per-language
  listing filters incl. umlaut initials and the `getWord` language guard.
- e2e 136/136 — new `testMultilingual` block: redirect-once, cookie priority,
  EN-only pages never redirect, /de /es/criteria /fr/about content assertions,
  language guard 404, canonical/x-default (matched case-insensitively — Next
  renders `hrefLang` camelCase), sitemap locales.
- Manual sweep: /de hero + building banner, /es/popularity lens, /fr/criteria,
  /de/about prose, EN home unchanged; dev server log clean.
