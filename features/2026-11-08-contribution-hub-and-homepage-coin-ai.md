# Contribution hub + Coin-with-AI on the homepage

**Date:** 2026-11-08 · **Status:** shipped · **Requested by:** site owner

## Requirement

As stated by the site owner:

1. "The section about using API should be moved to the contribution page
   (`/contribute`). The purpose is to let a user know all the ways they can
   contribute on one page, so the user won't miss the API option."
2. "Bring the 'Coin with AI' UI — only the UI under 'Coin with AI' on
   `/contribute` — to the front page."

## Problem / goal

- The API reference lived on `/about`, so a visitor exploring ways to
  contribute never saw it — the API is a first-class contribution channel
  (decision D22: a doorway, not a bypass) and was effectively hidden.
- The site's flagship interaction — AI coinage — was buried one level deep on
  `/contribute`, although the homepage is where "AI coins words" is the
  stated identity.

## Decided behavior

- `/contribute` becomes the **contribution hub**: three tabs —
  **"I have a word"** (manual form) · **"Coin with AI"** (wizard) ·
  **"Via API"** (the full endpoint reference, moved verbatim from `/about`,
  plus a note on key re-issuance).
- `/about` keeps an "API" heading with a one-line pointer to the hub
  (no endpoint table there anymore).
- The Coin-with-AI wizard **appears on both** the homepage and `/contribute`
  (owner confirmed via options dialog): extracted verbatim into the shared
  client component `src/components/coin-ai.tsx` so both stay in sync by
  construction. On the homepage it sits in a card between the hero band and
  Trending, under an "Other ways to contribute →" cross-link.
- Rejected alternative: moving the wizard off `/contribute` entirely —
  would contradict the hub's "all ways on one page" purpose.

## Acceptance criteria

- [x] `/contribute` shows all three contribution paths on one page.
- [x] The API endpoint table renders under the "Via API" tab; `/about` no
      longer carries the table but links to the hub.
- [x] The homepage hosts the working Coin-with-AI wizard (same three steps,
      same verification flow) without navigating away.
- [x] No behavior change to submission, verification, or key issuance —
      presentation only (manual-path and API submissions keep `input_type`
      `form` / `api`; wizard keeps `ai`).

## Implementation

- `src/components/coin-ai.tsx` (new) — `CoinAi`, the three-step wizard,
  moved unchanged from the contribute page.
- `src/app/contribute/page.tsx` — third "Via API" tab + `ApiDocs` (table +
  key note); `AiPath` removed in favor of the shared component.
- `src/app/about/page.tsx` — API section reduced to a pointer.
- `src/app/page.tsx` — homepage section with the wizard card.

## Verification

- `tsc --noEmit` clean; `eslint src` 0 problems; vitest 367/367; e2e 124/124.
- Browser-checked: homepage wizard card renders and is interactive;
  `/contribute` shows the three tabs and the full 13-endpoint table under
  "Via API"; `/about` shows the pointer. All pages 200.
