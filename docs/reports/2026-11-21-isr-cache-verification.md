# ISR / read-cost change — independent verification (2026-11-21)

Scope: commit `47a1a25` — *"Cut Turso read consumption ~95%: ISR pages,
edge-cached GET APIs, hot-path indexes, aggregate cache"* (16 files, +226/−85).

Method: re-ran the four claimed checks from a clean state, then probed the
**production build** (`next start`) at runtime, because the build table alone
does not show whether a route is actually served from cache.

Result: **the change works, and every numeric claim reproduced exactly — with
one exception.** Three of the five games routes were not cached at all. That is
fixed below; the fix landed in commit `0f7fc7e`.

---

## 1. Claims reproduced

| Claim | Verified | Evidence |
|---|---|---|
| 16 files, +226/−85, uncommitted | yes | `git diff --stat` at review time; now commit `47a1a25` |
| `tsc --noEmit` clean | yes | exit 0 |
| vitest 449/449 | yes | 21 files, 449 passed, 2.19 s |
| `next build` passes, SQLITE_BUSY gone | yes | exit 0; `busy_timeout=8000` + retry in `db.ts:execDdl` |
| 5 new indexes, no manual migration | yes | all 5 present in `data/ai-neologism.db`; `revisions` is created before `idx_revisions_word` in `SCHEMA_STATEMENTS`, so ordering is safe |
| `/`, `/de`, `/es`, `/fr` ISR 5 min | yes | `s-maxage=300`, `x-nextjs-cache: HIT`, 809 ms cold → 4 ms warm |
| `/games` + `/sitemap.xml` 1 h | yes | `s-maxage=3600` HIT / sitemap HIT |
| Word pages deliberately left uncached | yes | not in the diff; still `private, no-cache, no-store` (they read the `ck` cookie) |
| e2e 162/162 | yes | 162 passed, 0 failed — run against the production build, not dev |

### Cache invalidation verified live (the riskiest claim)

Not just read from code — exercised end to end against `next start`: submit a
throwaway word → approve via `/api/admin/review` → observe → delete via
`/api/admin/words/[id]`. 20/20 checks passed:

```
baseline EN published total          2301
after approve                        2302   homepage cache=MISS, shows 2302
                                            sitemap contains the new slug
                                            /games cache=MISS
                                            /de/games/meaning-reveal cache=MISS
after delete                         2301   homepage/sitemap revert immediately
```

`revalidatePath("/", "layout")` does reach `/sitemap.xml` — that was not
obvious from the docs and is now confirmed. Test rows were deleted by the run
itself (`SELECT COUNT(*) FROM words WHERE word LIKE 'zzcheck%'` → 0).

---

## 2. The gap that was found (and fixed)

The write-up claimed *"游戏大厅 + 4 个游戏页(含各语种) → 缓存 1 小时"*. Only the
English lobby was. Runtime headers from the shipped build:

```
/games                     s-maxage=3600 ...        x-nextjs-cache=HIT    cached
/de/games                  private, no-cache, no-store  x-nextjs-cache=null   NOT cached
/games/meaning-reveal      private, no-cache, no-store  x-nextjs-cache=null   NOT cached
/de/games/meaning-reveal   private, no-cache, no-store  x-nextjs-cache=null   NOT cached
```

(Also: there are **5** games, not 4 — `GAME_SLUGS` includes `ancient-vault`.)

**Root cause.** `export const revalidate = 3600` does nothing on a route with an
unresolved dynamic param. Without `generateStaticParams`, Next renders the page
per request and sends `no-store` — the `ƒ (Dynamic)` marker in the build table.
Every sibling that *did* become static has one (`[locale]/about`,
`[locale]/criteria`, `[locale]/popularity`, `[locale]/index`,
`[locale]/words/[slug]`); the three games routes did not.

The e2e suite could not catch this: it runs against `next dev`, where
`revalidate` is not applied the same way.

**Fix** (3 files, committed in `0f7fc7e`): add `generateStaticParams` using the
already exported `GAME_SLUGS` and `UI_LOCALES`.

After the fix — `.next/prerender-manifest.json` holds 51 routes, and all 20
games routes are prerendered at `revalidate=3600`:

```
/games                     revalidate=3600      /de/games                  revalidate=3600
/games/meaning-reveal      revalidate=3600      /de/games/meaning-reveal   revalidate=3600
/games/real-or-fake        revalidate=3600      /es/games/... (5)          revalidate=3600
/games/category-sort       revalidate=3600      /fr/games/... (5)          revalidate=3600
/games/semantic-ladder     revalidate=3600
/games/ancient-vault       revalidate=3600
```

Runtime confirms it:

```
/de/games                  200  s-maxage=3600 ...  x-nextjs-cache=HIT   3 ms
/games/meaning-reveal      200  s-maxage=3600 ...  x-nextjs-cache=HIT   3 ms
/de/games/meaning-reveal   200  s-maxage=3600 ...  x-nextjs-cache=HIT   3 ms
```

Re-verified after the fix: `tsc --noEmit` clean, vitest 449/449, `next build`
exit 0, e2e 162/162, and the 20-check cache-bust probe (a publish now also
invalidates the newly cached games pages — `cache=MISS` on all of them).

**Impact was smaller than it looked.** `src/lib/games/data.ts` already caps the
lexicon query with a 60 s in-process TTL, so those pages were never the big DB
reader. What was lost was per-request render cost and any edge caching.

---

## 3. Caveat the write-up did not mention: multi-instance staleness

`bustPublicCache()` clears the in-process aggregate cache **only in the instance
that handled the write**, while `revalidatePath` invalidates ISR **globally**. On
Vercel the regeneration can land on a different warm lambda holding up to 60 s of
stale aggregates — and that stale HTML is then edge-cached for up to 5 minutes.

So "批准一个词，首页立刻更新" is guaranteed on a single instance (which is what
the local verification shows). In production there is a window where the
homepage counts and Trending can lag. Not a correctness bug, and the TTL is
short, but it is a behavioural difference from before.

---

## 4. Superseded while this review was running

Two things changed in the repo during the review:

1. **`47a1a25` was committed and pushed to `origin/master`** mid-review (at the
   start of the review all 16 files were still unstaged), so the games gap above
   was briefly live on the pushed commit. A second commit, **`0f7fc7e` "Reads now
   require a free contribution key"**, then landed while this review was being
   written up and swept the 3-file games fix in along with its own 14 files; it
   is also pushed. The fix is therefore live, but `git log` does not describe it
   anywhere — `0f7fc7e`'s message is about the read key only. Both commits use
   single-line messages rather than the four-section format the global QWEN.md
   rules require. History was left as-is: rewriting a pushed commit to fix a
   message is not worth the risk.

2. **A separate uncommitted change gates the public read APIs behind a
   contribution key** (`readGate()` in `src/lib/keys.ts`, applied to
   `/api/words`, `/api/popularity`, `/api/search`). It reverts claim C:

   ```
   -  Cache-Control: public, s-maxage=60, stale-while-revalidate=300
   +  Cache-Control: private, no-store        (+ 401 KEY_REQUIRED without a key)
   ```

   The stated reason is sound — Vercel's CDN does not vary on custom headers, so
   a `public` entry could be served to a keyless caller. Consequence: the read
   saving now rests on ISR pages + the 60 s aggregate cache rather than on edge
   caching of the JSON APIs. **This review does not cover that change**; it was
   not on disk when the production build under test was compiled.

3. **The repo was being edited concurrently throughout this review.** By mtime:
   `src/lib/keys.ts` 06:56 UTC (during the e2e run), `tests/api/words.test.ts`
   07:04, `scripts/test.mjs` 07:31 — i.e. *after* the 162/162 e2e result was
   produced. So that e2e number reflects the `scripts/test.mjs` of commit
   `47a1a25`, not the current working-tree copy, and it was run against a
   compiled `.next` that predates the read-gate work.

   The three games files touched by the fix below are isolated from all of it
   (`git diff --numstat` → 9/2, 7/2, 8/3, all `generateStaticParams`
   additions), so there is no overlap to merge. Re-run the four checks once the
   read-gate change settles, since `/api/words` becoming key-gated changes what
   the e2e suite has to send.

---

## 5. Not verified

- **"Turso reads drop ≥95%"** is a projection. Only the Turso console → Usage
  curve after deploy can confirm it. Expected shape: the daily climb flattens to
  a near-constant line, with movement only from scheduled revalidation and real
  user interaction.
- The aggregate cache's behaviour under **multiple concurrent lambdas** (see §3)
  cannot be reproduced locally with a single `next start` process.

---

## 6. Reproducing

```bash
npm run typecheck          # tsc --noEmit
npm test                   # vitest, 449 tests
npm run build              # then inspect .next/prerender-manifest.json
npm run start              # production server on :3000

# Is a route actually cached? Look for x-nextjs-cache and cache-control:
node -e "fetch('http://localhost:3000/de/games').then(async r=>{await r.text();
  console.log(r.headers.get('x-nextjs-cache'), '|', r.headers.get('cache-control'))})"
# cached     -> HIT | s-maxage=3600, stale-while-revalidate=31532400
# not cached -> null | private, no-cache, no-store, max-age=0, must-revalidate

npm run test:e2e           # 162 assertions; needs a server on :3000.
                           # Spends real AI tokens (live novelty search +
                           # /api/cron/coin) and writes coined words to the DB.
```

The cache-bust check (submit → approve → assert homepage/sitemap/games flip to
`MISS` and show the new total → delete → assert revert) needs an admin session
from `.env.local`; it mirrors section J of `scripts/test.mjs` and cleans up its
own rows.
