# AI Neologism

A curated public dictionary for concepts that don't have names yet. AI coins candidate English words for emerging social phenomena, novelty is verified by web search before publication, human reviewers gate every entry, and the community votes on adoption.

Feature decisions and requirement records live in [`features/`](features/).

## Run locally

```bash
npm install
npm run seed        # 3 example words + dev contribution keys (printed to console)
npm run dev         # http://localhost:3000
```

Configuration is optional — copy `.env.example` to `.env.local` to enable:

- **In-site AI coining** — any OpenAI-compatible endpoint (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`). Without it, the "Coin with AI" tab explains it's unconfigured; the manual form still works.
- **Novelty search provider** — keyless DuckDuckGo by default (best-effort, rate-limits under load); set `SEARCH_PROVIDER=tavily` + `TAVILY_API_KEY` for reliable verification runs.
- `REVIEW_THRESHOLD` — accepted words needed to unlock review rights (default 3).
- **Admin dashboard** — `ADMIN_USERNAME` + `ADMIN_PASSWORD` unlock `/admin` (review queue, word management, batch operations). Optional: `RESEND_API_KEY` + `MAIL_FROM` send rejection notices to submitters who left a contact email.

## How the gates work

1. **Submission** (web form, AI wizard, or `POST /api/words`) triggers a novelty search: quoted exact-match queries + dictionary lookup. Verdicts: `NEW` / `NEAR_EXISTING` (word exists, sense doesn't — published with caveat) / `EXISTS` (blocked) / `UNVERIFIED` (services unreachable — flagged for the reviewer).
2. **Review queue** — browser submissions go through the community review ladder; API submissions are gated to the single admin at `/admin` (login with `ADMIN_USERNAME` / `ADMIN_PASSWORD`), who can also edit, unpublish, or delete any word. Approval is one click; only rejection requires a written reason, which is emailed to the submitter when they left a contact address. Nobody can review their own words; community review rights unlock after `REVIEW_THRESHOLD` accepted words on the same contribution key.
3. **Community** — adoption votes ("I'd use this word" / "Needs work"), four popularity lenses, A–Z index, full-text search.

## API (v1: read + write)

See the About page (`/about`) for the endpoint table. Highlights:

```bash
# list published words
curl localhost:3000/api/words

# submit a word package (a contribution key is issued if you don't send one)
curl -X POST localhost:3000/api/words -H "Content-Type: application/json" \
  -d '{"word":"examplecoin","definition":"A minimal demonstration coinage for the API docs."}'

# submit with your existing key
curl -X POST localhost:3000/api/words -H "X-Contribution-Key: ck_..." ...
```

Submissions via API are gated to the admin review queue — the API is a doorway, not a bypass.

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS v4 · SQLite via **@libsql/client** — locally a file at `data/ai-neologism.db` (gitignored), in production a Turso database (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`) · pluggable OpenAI-compatible AI adapter · pluggable search adapter (DuckDuckGo / Tavily) · deployable on Vercel with a built-in cron schedule (`vercel.json`).
