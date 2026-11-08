# Coin-with-AI intent gate

**Date:** 2026-11-08 · **Status:** shipped (uncommitted) · **Requested by:** site owner

## Requirement

As stated by the site owner: before the site spends its AI + search budget on a
"Coin with AI" request, an AI pass should first analyze the submitted material
and decide whether it actually looks like a request to coin a new word — the
material must center on something a word could be coined *for*, with enough
substance to work from, not just anything pasted to hit the 60-character floor.

## Problem / goal

`POST /api/coin/candidates` accepted any material ≥ 60 characters and sent it
straight to candidate generation. A product listing, a shopping list, or an
unrelated dump burned the (expensive) generation call and returned candidates
that could never name anything — wasted quota, noisy review queue.

## Decided behavior

- **Hard gate, server-side** (owner chose "hard" via options dialog): a gate
  verdict of "no" returns **422 `INTENT_REJECTED`** with concrete feedback and
  produces no candidates. The visitor edits the material and retries.
- **No new intent field** (owner chose this): the AI judges the material itself
  — whether it centers on a specific, nameable social phenomenon with enough
  substance — instead of asking the visitor to describe intent up front.
- **Gate lives in the endpoint**, so both the web wizard and external API
  callers pass through it; there is no UI-only bypass.
- **Prompt-injection guard**: the gate prompt instructs the model to treat the
  material strictly as data and ignore any instructions embedded in it.
- **Fail-open on gate failure**: if the gate call errors or returns an
  unreadable verdict, the request proceeds exactly as before — the novelty
  check and human review remain the downstream gates. Only a *clean* "no"
  blocks. (Unit tests pin this: an unreadable verdict or transport error must
  NOT surface as 502.)
- **Bonus reuse**: on a pass, the gate's one-line `phenomenon` summary is fed
  into the generation prompt as a focus hint, sharpening candidate relevance.
- **Not gated**: the nightly auto-coiner (`src/lib/autocoin.ts`) — its seed
  material is curated/trusted; a gate call there would be wasted spend.
- Language-agnostic: material in any language may pass; the coined word is
  English.

## Acceptance criteria

- [x] Product-listing-style material → 422 `INTENT_REJECTED` + actionable
      reason; no generation call is made (verified: only one AI call fired).
- [x] Phenomenon-bearing material → 200 with candidates; the generation
      request body contains the gate's phenomenon summary.
- [x] Unreadable gate verdict or gate transport error → still 200 with
      candidates (fail-open), never 502.
- [x] Existing behavior preserved when the AI is unconfigured (503) and the
      10/hour rate limit still applies before anything runs.

## Implementation

- `src/lib/ai.ts` — new `assessCoiningIntent(material)` (strict-JSON gate
  prompt, temperature 0.2, max_tokens 300, fence-tolerant parsing) +
  `generateCandidates(material, focusHint?)` gains the focus parameter.
- `src/app/api/coin/candidates/route.ts` — gate call before generation;
  422 path; separate try/catch so a gate error fails open while a generation
  error still 502s.
- Tests: 8 lib-level (parsing, default reason, fences, bad-format,
  transport) + 4 route-level (422 + no second call; pass + focus hint in
  request body; two fail-open paths) = 12 new.

## Verification

- vitest 379/379 (12 new), e2e 124/124, tsc clean, eslint 0.
- Live end-to-end against the dev server through a scripted OpenAI-compatible
  mock endpoint: junk listing → 422 with reason; phenomenon article → 200 with
  candidates carrying the focus. (The real AI key is not configured in local
  `.env.local` — the mock proves the full HTTP path; production behavior
  identical once `AI_API_KEY` is set on Vercel.)
