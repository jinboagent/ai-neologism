# REQUIREMENTS 03 — Novelty Gate, Anti-Abuse & Credential Management

- **Date:** 2026-09-28
- **Status:** Requirements for implemented v1 features, with gaps and proposed upgrades marked
- **Builds on:** [REVIEW-01](../docs/REVIEW-01-website-ux.md) (decisions D1–D19); Round-2 decisions D20–D23 (in conversation); implementation 2026-09-05 in `ai-neologism/`
- **Marker key:** **[IMPLEMENTED]** = in source today · **[GAP]** = required but missing · **[PROPOSED]** = recommended, awaiting user approval

---

## 1. Novelty gate — "the word must be genuinely new"

### 1.1 Requirement statement

A word may only be published if it has **never been used before with this meaning**. No system can prove a negative over the entire internet, so the site's formal, defensible claim is:

> *No usage with this meaning was found in the queried indexes and dictionaries, on the checked date; the full search evidence is published with the entry.*

The claim is enforced in depth: automatic verification before submission is accepted → collision blocked → human reviewer re-checks the evidence → dated badge → periodic re-verification (badge "★ Now in real use" when a word later spreads — graduation, not failure, D15).

### 1.2 Verdicts

| Verdict | Meaning | Gate behavior |
|---|---|---|
| **NEW** | No usage found in any queried index, on the checked date, with this meaning | Publishable, ✓ "Verified New" badge |
| **NEAR_EXISTING** | Word form exists somewhere, but not with this meaning | Publishable with ~ caveat badge **[PROPOSED: keep — see §4 decisions]** |
| **EXISTS** | Already used with this meaning | **Blocked (409)** with evidence returned |
| **UNVERIFIED** | Search/dictionary services unreachable | Enters review queue flagged; reviewer decides |

### 1.3 Implemented checks **[IMPLEMENTED]**

Source: `src/lib/verify.ts`; enforced in `POST /api/words` (all three entry paths — form, AI wizard, API — reach it).

1. **Internal corpus check** — case-insensitive duplicate against existing words → 409 `DUPLICATE_WORD`.
2. **Quoted exact-match web searches** — three queries (`"word"`, `"word" meaning`, `"word" definition`) via the pluggable search adapter (`src/lib/search.ts`; keyless DuckDuckGo HTML default, Tavily optional).
3. **Dictionary lookup** — dictionaryapi.dev; checks word-form existence and sense overlap.
4. **Same-meaning heuristic** — keyword overlap (stopword-filtered) between each result/dictionary sense and the proposed definition; ≥2 overlapping keywords ⇒ same sense.
5. **Evidence log persisted** — verdict, per-query result counts and same-sense match counts, up to 3 closest matches with notes, method string, date; rendered on the word page (collapsible full log) and in the review screen.

### 1.4 Gaps and proposed upgrades

- **[GAP] Single search index.** Only one index is queried by default. **[PROPOSED]** Query a second independent index — Google Programmable Search JSON API (100 queries/day free) and/or Brave Search API (free ~2,000/month); Bing's search API was retired (2025), so "Google or Bing" today means a named set of reachable indexes.
- **[GAP] Evidence log does not name each engine queried.** **[PROPOSED]** Record engine names + dates per query: "searched Google CSE, DuckDuckGo, dictionaryapi.dev on 2026-09-28."
- **[GAP] Re-verification (~6–12 months, D15) has no implementation** — no scheduled re-checks, no ★ graduation path.
- **[GAP] Client-supplied verification is trusted.** An API client can POST `verification: {verdict: "NEW"}` and bypass the server-side search. Reviewer is the backstop. **[PROPOSED]** Always re-run server-side verification (ignore client verdicts), or store client-supplied evidence as `UNVERIFIED` + flag for the reviewer. Decision in §4.
- **[GAP] dictionaryapi.dev unreachable from the owner's current network** (observed 2026-09-05); failures degrade to UNVERIFIED rather than false NEW — honest but reduces automated coverage.

---

## 2. Anti-abuse — rate limits and spend protection

### 2.1 Threat model

Spam can never auto-publish (every submission enters the review queue — the structural defense, D5/D17). The real cost of abuse is **operator API spend**: each submission triggers AI + search calls, and coining/verification endpoints pay per request. Rate limits therefore track *spend surfaces* first, and trust deepens with standing (participation ladder, D19).

### 2.2 Implemented limits **[IMPLEMENTED]**

Source: `src/lib/ratelimit.ts` (in-memory fixed-window, per process) + `voterFingerprint` (IP + user-agent hash).

| Surface | Limit |
|---|---|
| Word submission (`POST /api/words`) | 10 / hour per contribution key |
| Word edit (`PUT`) | 30 / hour per key |
| Votes | 20 / minute per IP+device fingerprint |
| AI coining (`/api/coin/candidates`) | 10 / hour per IP fingerprint |
| Verification runs (`/api/coin/verify`) | 15 / hour per IP fingerprint |
| Review queue | gated by review rights (3 accepted words), self-review blocked |

### 2.3 Gaps **[GAP]** and proposed tiers **[PROPOSED]**

Gaps: counters are in-memory (reset on restart; per-process only), no per-IP/per-key *daily* caps, no global daily budget on expensive operations, 429 responses lack cap/reset info, no honeypot/CAPTCHA.

**Proposed tier table** (patterns borrowed: Wikipedia's per-IP/account throttles + autoconfirmed gating; Stack Exchange's new-user quotas; GitHub's legible 429s; Hacker News' submission gaps):

| Surface | Proposed limit |
|---|---|
| Web form submission | 3 / IP / day and 1 / 10 min |
| API submission (keyed) | 20 / key / day (10/hour exists) |
| AI + search operations (coin, verify) | existing hourly caps **+ global daily budget** (e.g. 100 verifications/day), hard stop with a friendly "daily quota reached" page |
| All 429 responses | include limit, remaining, reset time (GitHub-style legibility) |
| Persistence | counters in SQLite (survive restarts; no new infra for single-server) |
| Only on first abuse | Cloudflare Turnstile on the form + hidden honeypot field |

---

## 3. Credential management (LLM API keys, search keys)

### 3.1 Rules **[PROPOSED as policy; mechanics already in place]**

1. **Never in the repository.** Dev secrets live in `.env.local` (gitignored — `.env*` is in `.gitignore` today); only `.env.example` with empty values is committed. Before any push, confirm no key ever entered git history.
2. **Production secrets live in the hosting platform's environment dashboard** (Railway/Render/Fly/VPS/Vercel). GitHub supplies code; the platform injects secrets at runtime. GitHub *Actions* secrets serve CI only — they do not reach the deployed app.
3. **Blast-radius control at the provider:** monthly spend cap on the LLM key; **separate keys for dev and prod**; search (Tavily) on its own key; rotate immediately on suspicion of leak.
4. **Hosting constraint tied to our stack:** Vercel's serverless filesystem is ephemeral and breaks SQLite — a persistent-disk host (Railway/Render/Fly/VPS) is the zero-migration path; Turso (managed SQLite; URL + token as env vars) is the later scaling option.

### 3.2 Current state **[IMPLEMENTED]**

`AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`, `SEARCH_PROVIDER` / `TAVILY_API_KEY`, `REVIEW_THRESHOLD` are read from the environment (`src/lib/ai.ts`, `src/lib/search.ts`, `src/lib/keys.ts`). `.env.example` documents them with empty values. No credentials exist in source, seed data (keys are generated at runtime), or docs. The in-site AI degrades gracefully (503 with instructions) when unconfigured.

---

## 4. Decisions awaiting the user (discussed 2026-09-28)

| # | Question | Recommendation |
|---|---|---|
| 1 | Novelty-gate strictness | Keep EXISTS hard-blocked + NEAR_EXISTING caveat path; evidence log names every engine queried + date |
| 2 | Anti-abuse package | Adopt §2.3 tier table (per-IP/per-key daily caps, global daily budget, legible 429s, SQLite-persisted counters); CAPTCHA only on first abuse |
| 3 | Verification trust model | Always re-run novelty search server-side; ignore client-supplied verdicts (strongest) or store them as UNVERIFIED + reviewer flag |
| 4 | Hosting target | Persistent-disk host to keep SQLite unchanged; record §3 credential rules now |

Items marked **[IMPLEMENTED]** above are already enforced in code as of 2026-09-28; **[PROPOSED]** items await approval before implementation.
