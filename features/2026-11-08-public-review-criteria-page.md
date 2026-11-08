# Public review-criteria page (/criteria)

**Date:** 2026-11-08 · **Status:** shipped (uncommitted) · **Requested by:** site owner

## Requirement

As stated by the site owner: a visitor-facing statement of the review rules —
"a report for visitors that tells them the rules a word must pass" — as a new
route (folder) on the site.

## Problem / goal

The review bar (craft checklist, three-layer novelty search, verdict mapping,
evidence rules) lived only in internal working documents under `docs/`
(gitignored, local-only since the publish-prep). Visitors saw only the
six-bullet craft summary on /about. Publishing the bar gives the dictionary
credibility — readers can see what "verified" means — without exposing
internal operations.

## Decided behavior

- **Desensitized public version**, not a mirror of
  `docs/REVIEW-criteria.md`: the three gates and the fusion-necessity rule
  are stated in full; internal operations (sourcing playbook, admin queue
  mechanics, reviewer tooling, bug reports) stay out entirely.
- **New route `/criteria`** (owner asked for a new folder; in the App Router
  a folder is a route). /about keeps its summary sections and gains a
  pointer; the footer gains a "Review criteria" link; sitemap.xml lists the
  page.
- The **fusion-necessity rule** (owner criterion, 2026-11-08) is presented as
  the highlighted rule — it is the clearest public statement of "we don't
  publish respellings" (mile marker → milemarker example).
- The **honest-scoping claim** (dated, engine-named, no negative proof) is
  quoted as the site's formal statement.

## Acceptance criteria

- /criteria renders the three gates, the verdicts and the evidence
  commitment; no internal-only material appears on it.
- /about links to it (Craft rules section); the footer links to it;
  sitemap.xml includes it.
- typecheck / eslint / vitest stay green.

## Implementation

- `src/app/criteria/page.tsx` (new) — static page, metadata + canonical.
- `src/app/sitemap.ts` — /criteria added (monthly, 0.5).
- `src/app/layout.tsx` — footer link "Review criteria".
- `src/app/about/page.tsx` — cross-link under Craft rules.

## Verification

- typecheck, eslint, vitest green (run 2026-11-08, see session log).
- Page smoke-tested on the dev server (HTTP 200, title/canonical present).
