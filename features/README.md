# Feature requirements

One markdown file per shipped feature, named `YYYY-MM-DD-short-slug.md`
(date = the day the feature was committed). This folder is the project's
running record of *what was asked, what was decided, and what shipped* —
the round-based decision documents live in `docs/` (kept local); this
folder is tracked in the repository.

Each feature file records:

1. **Requirement** — what was asked, in the requester's own terms.
2. **Problem / goal** — why.
3. **Decided behavior** — the chosen design, including rejected alternatives where relevant.
4. **Acceptance criteria** — checkable statements that define "done".
5. **Implementation** — files touched, key mechanics.
6. **Verification** — how it was proven to work.

## Index

| Date | Feature | File |
|---|---|---|
| 2026-11-08 | Contribution hub (API docs on /contribute) + Coin-with-AI on the homepage | [2026-11-08-contribution-hub-and-homepage-coin-ai.md](./2026-11-08-contribution-hub-and-homepage-coin-ai.md) |

Earlier features (pre-folder) to backfill as needed: v1 wiki + submission
pipeline, seed queue, auto-coiner, admin gate & one-click approval, admin
word management, batch admin operations, dictionary-compact UI (option B),
libsql/Turso port, Vercel deployment.
