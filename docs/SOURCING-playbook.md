# SOURCING PLAYBOOK — Where coinable concepts come from

- **Date:** 2026-10-02
- **Status:** Active playbook. Starting tiers chosen by the user: **Tier 2 (slang watch)** + **Tier 3 (academic)**. Tier 1 kept as background.
- **How to use:** each seed → the site's Coin-with-AI (paste text or link) → pick a candidate → novelty verification → submit → review queue. No tooling required; the workflow works today at [localhost:3000/contribute](http://localhost:3000/contribute).

---

## 0. The concept pipeline (why these tiers)

Language moves in stages: niche communities coin slang → algorithms amplify it → journalists describe the phenomenon → academics study it → dictionaries codify it. AI Neologism lives **two stages before the dictionary** — the goal is concepts that are real and observable but not yet carefully named.

The golden signal across every source: **writing that announces a naming gap** — *"no word for…"*, *"researchers have noticed a rise in…"*, *"what we here call…"*. Whoever wrote that sentence has done the hardest part: verified the phenomenon is real and unnamed.

---

## 1. Tier 2 — Slang watch (starting tier)

**The angle:** spreading slang that has **no serious definition anywhere**. The concept is real, the careful entry doesn't exist — writing that definitional entry is the site's contribution. The AI can also propose a *better coinage* for a concept currently carried by a clumsy or joke term.

### Sources

| Source | What to harvest |
|---|---|
| [r/neology](https://www.reddit.com/r/neology) | Raw coinages with reasoning; posters often explain the gap they're filling |
| [r/words](https://www.reddit.com/r/words) | "Is there a word for…" threads — the thread itself is a naming-gap announcement |
| Urban Dictionary — newest submissions | Earliest appearances of terms; mostly jokes, but early signals live here |
| [Know Your Meme](https://knowyourmeme.com) | Concept clusters *before* they solidify into slang; the documentation gives you ready-made context |
| Linguist-following: Adam Aleksic ([Scientific American interview](https://www.scientificamerican.com/podcast/episode/etymology-nerd-adam-aleksic-on-how-internet-culture-is-transforming-the-way)), #linguistiktok, Lingthusiasm podcast | Curated, professionally-filtered observations of slang *in motion* — the highest signal-to-noise in this tier |

### The sweet spot and the too-late line

- **Sweet spot:** a term appearing in a few communities with growing frequency, no dictionary entry, no careful definition anywhere. Confirm with a quoted search and a Merriam-Webster/Wiktionary check — our novelty search does this automatically at submission.
- **Too late:** anything in Merriam-Webster's new-word lists (e.g. the [September 2026 additions](https://nypost.com/2026/09/16/lifestyle/were-vocab-maxxing-merriam-webster-adds-1400-new-words) — "looksmaxxing" is finished), or slang with established press coverage. Those will (correctly) hit our **EXISTS gate**.
- **Joke filter:** Urban Dictionary is full of prank entries. Don't pre-filter manually — coin a *concept* entry only if a real communicative need is visible (the term is used to say something people couldn't say before). The reviewer applies this test again.

### Ethics note

Slang often originates in specific communities (notably African American English, gaming, fandoms — see the [origin research](https://languagestreets.com/the-origins-of-internet-slang-and-how-it-evolved)). When an entry draws on such a term, name the origin community in the etymology and "Why this word" — attribution is part of the site's honesty, and mocking or extractive entries won't pass review.

---

## 2. Tier 3 — Academic sociology (starting tier)

**The angle:** sociology is full of carefully-documented phenomena whose "names" are temporary placeholders. Abstracts literally say *"what we here call 'ambient precarity'"* — that sentence means: real concept, no committed name. The placeholder is a coinage candidate in its own right, or proof the concept deserves one.

### Sources

| Source | What to harvest |
|---|---|
| [SocArXiv / SocOpen](https://socopen.org) (preprints; ~3,100 papers in 2025, growing 20%/yr — [background](https://en.wikipedia.org/wiki/SocArXiv)) | Newest social-science work before journal branding; browse weekly or follow [@socarxiv](https://x.com/socarxiv) |
| [SocOpen essays](https://socopen.org/category/essays) | Public-facing versions — shorter, plainer language, ideal Coin-with-AI input |
| Public-facing journals: *Symbolic Interaction*, *Social Problems*, *New Media & Society* | Table-of-contents scans; abstracts only are enough to spot placeholder-label sentences |
| [Aeon](https://aeon.co) and [Psyche](https://psyche.co) | Academics writing publicly — essays about phenomena, often explicitly noting the vocabulary gap |
| Google Scholar **alerts** | Create alerts for the gap phrases: `"we lack a term for"`, `"as yet unnamed"`, `"has yet to be named"`, `"no satisfactory term"`. The academics flag the gaps for you, by email, forever |

### The abstract trick (fastest academic workflow)

You don't need to read papers. Scan abstracts for:
1. **Placeholder labels** — "what we call…", "the so-called…", "for lack of a better term" → coinage candidate + guaranteed academic reference.
2. **Named phenomena without labels** — a paper about a trend that gestures at it with a phrase ("the practice of abandoning group chats") → paste the abstract into Coin-with-AI and let it coin the name.

Always cite the paper as the entry's **academic reference** (type: `academic`) — it's the strongest evidence a reviewer can wish for.

---

## 3. The weekly routine (30 minutes)

1. **Harvest (≈15 min, one sitting):** skim r/neology + Know Your Meme (Tier 2) and the SocOpen new-papers feed + Scholar alerts (Tier 3). Collect 3–5 promising links/snippets in a notes file. Discard anything already in a dictionary — the gate will catch it anyway, but save the time.
2. **Coin (≈10 min):** for each seed, Coin-with-AI → review the 3–5 candidates → pick one, tighten the definition. Run each source through only once — the per-IP coining limit (10/hour) comfortably covers a week's harvest.
3. **Submit (≈5 min):** send the best 1–3 through verification and into the review queue. A steady drip of 1–3 words per week beats a batch of ten mediocre ones — the collection's credibility is the product.

---

## 4. Coin-with-AI prompt templates by source type

**Slang term (Tier 2):**
> Context: the slang term "<term>" is spreading in <community/platform>. Usage examples: <2–3 real quotes>. It seems to name <your one-line guess at the concept>. Propose coinages for a serious dictionary entry that captures this concept — the existing term may be kept as a candidate if it is pronounceable and not a joke.

**Paper abstract (Tier 3):**
> This is the abstract of a sociology paper: <paste abstract>. The authors use a placeholder label or describe an unnamed practice. Propose coinages naming this concept for a general dictionary of social life; keep the register academic but accessible.

**Reference mapping for submissions:**

| Seed type | Reference type | Fields to fill |
|---|---|---|
| Reddit thread / UD entry / KYM page | `social` | platform, title, URL, date, excerpt |
| Paper or preprint | `academic` | author, title, year, URL/DOI, excerpt = the placeholder-label sentence |
| Essay (Aeon/Psyche/SocOpen essays) | `essay` | author, title, site, date, excerpt |

---

## 5. Implemented 2026-10-02 (was deferred)

- **Sources page on the site:** `/sources` — the guide above as contributor-facing content, linked from the nav and the Contribute page.
- **Seed-queue feature:** `/seeds` + `GET/POST /api/seeds`, `DELETE/PATCH /api/seeds/{id}` — a private per-key harvest list; each pending seed has a one-click **Coin with AI** button (fetches the page, proposes candidates inline, refine & submit reuses the shared WordForm; submission runs server-side novelty verification and marks the seed coined). Seeds are validated with the same SSRF guard as the fetch path; 30 adds/hour, 50 pending cap, duplicates ignored.

## 6. Still deferred

- **Tier 1 — news hunt in detail:** BBC Worklife / Guardian lifestyle / Atlantic / Vox / Psyche trend sections with gap-phrase queries ("no name for", "increasingly common among") — the easiest daily tier, deliberately left for later.
- **Automated trend scout:** scheduled pulls from RSS/Scholar alerts into the seed queue (v2 territory).
