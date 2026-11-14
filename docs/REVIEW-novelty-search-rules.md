# REVIEW RULES — Novelty search (source-language + decomposition)

- **Date:** 2026-11-04
- **Status:** Active review ruleset. Supersedes the single-language, exact-string-only search in `VALIDATION-protocol.md` §3 for any word with a foreign root or a compound/blend form.
- **Applies to:** the reviewing agent (human or AI) on every candidate in a batch, and to the site's `src/lib/verify.ts` plan where feasible.
- **Relates to:** [`VALIDATION-protocol.md`](VALIDATION-protocol.md) (the gate + verdicts), [`SOURCING-playbook.md`](SOURCING-playbook.md) (what "real and unnamed" means).

---

## 0. Why these two rules exist

The English exact-string search (`"word"`, `"word" meaning`, `"word" definition`) catches only the case where **the exact string already exists in English with the same meaning**. It misses two classes of collision that a good reviewer must catch:

1. **Foreign-root collisions** — a coinage built from French/German/Latin roots may already be an ordinary word or phrase in that source language (or already exist in English as a *translation* of it).
2. **Split-form collisions** — a compound or blend may already circulate as the un-compounded phrase ("run club", "windowsill farming", "velvet rope"), so the "coinage" is just a respelling of an existing term, not a naming gap.

Both rules answer the same question the site actually cares about (VALIDATION-protocol §1): *does anyone already use this meaning, under any spelling?*

---

## 1. Rule 1 — Search the source language(s)

For any candidate whose morphemes are not all English, the reviewer must search the term **in the language(s) of its roots**, plus its **standard English translation**.

### Procedure

1. **Identify the source language** of each non-English morpheme. Examples: `sans-`, `-pretexte` → French; `motor-`, `-trauer`, `wende-` → German; `thermidor-` → French; `somn-` → Latin; `algia`/`-osis`/`-cracy` → Greek.
2. **Search the native spelling** in that language — with the source language's spacing and diacritics, not the fused coinage:
   - `sanspretexte` → search `"sans prétexte"` (French, spaced, accented).
   - `thermidorized` → search `thermidoriser` / `"thermidorisé"` (the French verb).
   - `reanaloging` → search `Reanalogisierung` (German).
3. **Search the English translation / calque** — the concept may already be named in English by a *different* word:
   - `transitsublime` → *technological sublime* (David Nye).
   - `stackalgia` → *smokestack nostalgia* / *industrial nostalgia*.
   - `reanaloging` → *analog revival*.

### Verdict rule

- A source-language form **or** its standard translation already carrying the proposed meaning = **EXISTS** (blocked), same as the English gate.
- The form exists in the source language but only as an everyday phrase (not as a coined term) → **REVISE** (the form isn't novel even if the specific metaphor is).
- No source-language use, and no established English name for the concept → pass Rule 1; continue to Rule 2.

---

## 2. Rule 2 — Decompose, then check the split words

For every compound, blend, or affixed coinage, break it into its **roots + affixes**, recover the **un-fused phrase**, and check two things: (a) does the split phrase already carry the meaning, and (b) do the parts have prior use/popularity?

### Procedure

1. **Strip the affixes** and recover the base. Live affixes include: `-ing`, `-ism`, `-cracy`, `-algia`, `-maxxing`, `-flation`, `-lag`, `-core`, `-osis`, `-nesia`, `-washing`, `-splaining`, `-creep`, `-poverty`, `-punk`, `re-`, `pre-`, `micro-`, `synth-`.
2. **Reassemble the source phrase with spaces/hyphens**, and search it quoted:
   - `runclubbing` → `"run clubbing"` / `"run club"`.
   - `sillfarming` → `"windowsill farming"` / `"sill farming"`.
   - `favorledger` → `"favor ledger"`.
   - `concessioncapital` → `"concession capital"` / `"concessional capital"`.
   - `velvetroping` → `"velvet rope"` (then re-apply `-ing`).
   - `simleague` → `"sim league"` / `"SimLeague"`.
   - `walkcasting` → `"walkcast"` / `"walk-cast"`.
   - `niche-lympics` → `"niche olympics"` / `"niche-lympics"`.
3. **Check popularity of the parts**, not just existence:
   - Does a **dictionary** have the split form with the same sense? (e.g. "dumbphone", "velvet rope" are dictionary/well-documented.)
   - Does the split phrase have **≥ 2 independent same-meaning web usages**? (mirrors the §4 "EXISTS" threshold).
   - Is any part a **live trademark**? → fails the no-brands rule outright (e.g. `notionizing` ← *Notion*; `wellthletics` ← the brand *Wellthletics*).
   - Is any part itself an **established portmanteau**? (e.g. `wellth` = wealth+health already exists).

### Verdict rule

- Same-meaning hit on the split phrase (dictionary OR ≥ 2 uses) = **EXISTS** — it's a respelling, not a coinage.
- Split phrase is established but the **specific affixed/verb form** is new → **REVISE** or APPROVE-with-note (the novelty is thin; decide whether the affix adds a real concept).
- Only a single obscure one-off hit → note it, do **not** block (matches the pipeline's "unrelated/one-off sense does not fail" heuristic).

### Principle — an affix is not novelty

Attaching a live suffix (`-maxxing`, `-core`, `-flation`, `-washing`, `-splaining`) to a base that **already names the concept** produces a respelling, not a naming gap. The test is always: *does the concept already have a name?* — not *is this exact string unclaimed?*. If the base phrase already carries the meaning, the new string is only a cosmetic variation.

---

## 3. Verdict mapping

| Finding | Rule | Verdict | Batch action |
|---|---|---|---|
| Same-meaning use in English, source language, or split form | 1 or 2 | **EXISTS → REJECT** | not inserted (batch-coin gate) |
| Form exists (other language / other sense / trademark) but this sense doesn't | 1 or 2 | **NEAR_EXISTING → REVISE** | reword or re-derive before export |
| Split form established; only the affix/verbing is new | 2 | **REVISE** (or APPROVE + note) | reviewer judgment; record caveat in "why this word" |
| No same-meaning use anywhere | 1 + 2 | **NEW → APPROVE** | export to the batch JSON |

This maps onto `VALIDATION-protocol.md` §4; the multilingual and split-form hits are additional evidence feeding the same four verdicts.

---

## 4. Worked examples (from batch 2)

**Rule 1 — source language caught it:**

| Word | Source form found | Outcome |
|---|---|---|
| `thermidorized` | French *thermidoriser* (CNRTL, Balzac 1830) | REJECT |
| `sanspretexte` | French *sans prétexte* (ordinary phrase, live hashtag) | REVISE |
| `reanaloging` | German *Reanalogisierung* (2017) | REVISE |
| `transitsublime` | English *technological sublime* (Nye) — concept already named | REVISE |
| `stackalgia` | English *smokestack nostalgia* — concept already named | REVISE |
| `motortrauer`, `wendejetlag` | German compounds; no same-meaning German term | APPROVE |

**Rule 2 — decomposition caught it:**

| Word | Split form found | Outcome |
|---|---|---|
| `runclubbing` | *run clubbing* (named social-running trend) | REJECT |
| `simleague` | *SimLeague / sim league* (WhatIfSports, RoboCup, ISFL) | REJECT |
| `walkcasting` | *walkcast* (walking-recorded podcast) | REJECT |
| `opticsmaxxing` | *opticsmaxxing* (live slang, same meaning) | REJECT |
| `notionizing` | *Notion* — live trademark | REJECT |
| `sillfarming` | *windowsill farming* (established) | REVISE |
| `favorledger` | *FavorLedger* (Android app) | REVISE |
| `concessioncapital` | *concessional capital* (finance term) | REVISE |
| `wellthletics` | *wellth* (established) + *Wellthletics* (brand) | REVISE |
| `velvetroping` | *velvet rope* established; verbing novel | APPROVE + note |
| `niche-lympics` | one-off Jeopardy "Nichelympics" | APPROVE + note |

---

## 5. Reviewer checklist (run per candidate)

1. ☐ Exact English string searched (quoted, + `meaning`, + `definition`).
2. ☐ Source language(s) of every non-English morpheme identified.
3. ☐ Native-spelling and accented forms searched in that language.
4. ☐ Standard English translation of the concept searched (is it already *named*?).
5. ☐ Affixes stripped; base compound/blend recovered as a spaced/hyphenated phrase.
6. ☐ Split phrase searched quoted; dictionary checked; ≥ 2-usage threshold applied.
7. ☐ Live trademarks and established portmanteaus in the parts flagged.
8. ☐ Verdict assigned per §3 and recorded with URLs.
