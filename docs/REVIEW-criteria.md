# REVIEW CRITERIA — the canonical bar for approving or rejecting a word

- **Date:** 2026-11-08
- **Status:** Active. This page is the single rubric a reviewer loads. It consolidates the craft gate ([VALIDATION-protocol.md](VALIDATION-protocol.md)), the search rules ([REVIEW-novelty-search-rules.md](REVIEW-novelty-search-rules.md)) and the batch review method (wordstoreview manifests). Where wording differs, this page governs; procedures stay in the linked docs.
- **Applies to:** every candidate at review time — web form, AI wizard, nightly auto-coiner, editorial batches. Human and machine candidates face the same bar; only the completeness items (7–9 below) are stricter for machine coins.

## 0. The question behind every rule

> Is this a real, observable phenomenon that people reach for but cannot yet name — and does the proposed form *earn* wordhood, instead of respelling something English already says?

"Named" and "already says" are judged by evidence, not intuition: the searches in §2, the collocation test in §1.10.

## 1. Gate A — craft checklist (all ten must pass)

1. **Real phenomenon** — names an observable, describable social pattern; not a joke, not a private in-joke.
2. **Pronounceable** — a reader who sees it can say it.
3. **Length** — preferably ≤ 4 syllables.
4. **Productive morphology** — established word-formation (compound, clean-clipped blend, live affix); the morpheme boundaries must be real: the word *parses*. Compounds must additionally pass the **fusion-necessity test (§1.10)**.
5. **No brands or trademarks.**
6. **Etymology stated** — the roots and why they fit, recorded in "Why this word".
7. **IPA required** (machine-coined candidates).
8. **Related words: best effort** — an empty list must be a judgment, not an omission; links only to entries that actually exist.
9. **Categories pre-selected** from the fixed taxonomy (machine-coined).
10. **Fusion necessity** — the rule that kills respellings of existing phrases; full test in §1.10.

### §1.10 The fusion-necessity test (added 2026-11-08, user criterion)

Many candidates are two (or more) existing English words fused into one. The fusion must *do work* — otherwise the site is just re-spelling a phrase people already say.

**Fail condition — the coinage claim does not hold when both are true:**

1. **Pre-existing collocation** — the component words are habitually used together, in the same order, **before and independently of the coinage**: a frequent, natural phrase in running English ("mile marker", "sunrise alarm", "team stand-up"). Note: the absence of an indexed exact-phrase hit does not automatically save the candidate — if the juxtaposition is transparently the natural way English orders these words, treat the collocation as existing.
2. **Purely compositional meaning** — the proposed sense is exactly the sum of the parts: nothing added, no metaphor, no semantic shift, no condensation of a longer idea; the fused word would say and behave exactly like the phrase.

When the fail condition holds, the fused spelling is a **respelling, not a coinage** — it names nothing the phrase doesn't already name. The entry is **never APPROVED as submitted**:

- the phrase itself already names the described concept in active use → **REJECT** (the concept isn't unnamed; EXISTS territory — real batch-3 case: *guidancecreep*, where "guidance creep" is active in administrative-law commentary with the identical meaning);
- the collocation is natural but the concept still lacks a careful name → **REVISE** — re-derive a form that does work the phrase can't (clip it, shift the metaphor, choose a different root). Real batch-3 case: *exceptioncreep* — "exception creep" was active for the same mechanism, so the solid form was sent back.

**Passing cases** (fusion earns wordhood — where good coinages live):

- **No standing collocation** — the words are not habitually juxtaposed in this order: *synthstalgia* (synth + nostalgia; "synth nostalgia" was not a phrase), *rubblehandover*.
- **Non-compositional meaning** — the fused word means more than its parts: a metaphor or semantic shift (*sunsetting* a product is not about the sun), or a condensation no short phrase carries.
- **The form itself is transformed** — clipping or blending across boundaries, or a category shift the phrase can't perform: *workaholic* (work + clipped -aholic), *staycation*.

**Directionality:** judge collocation frequency *independent of the coinage*. A split usage that exists only as a variant spelling or back-formation of the coinage itself is not an established collocation. For never-published candidates, any found split usage is independent by definition; when re-reviewing an already-published word, check that the split phrase predates or exists apart from our entry.

**Reviewer procedure:** search the split phrase (`"word one word two"`) plus the concept context; if found, ask whether its use means what the coinage proposes (compositional) or something else; then ask whether the fused form means more than the phrase. Evidence URL required for any found collocation.

## 2. Gate B — novelty search (evidence, three layers)

| Layer | What | Detail |
|---|---|---|
| Exact form | `"word"`, `"word" meaning`, `"word" definition`, dictionary API | the `verify.ts` plan; the floor, not the ceiling |
| Source language | for non-English roots: native spelling + standard English translation | Rule 1 of REVIEW-novelty-search-rules |
| Split form | the un-fused phrase — feeds both EXISTS and the §1.10 collocation test | Rule 2 of REVIEW-novelty-search-rules |

A result counts against the candidate only when its keywords overlap the proposed **meaning** (same-meaning heuristic: ≥ 2 overlapping keywords, ≥ 1 for short definitions); finding the form in an unrelated sense does not fail it. Verdicts: **NEW / NEAR_EXISTING / EXISTS / UNVERIFIED** — definitions in VALIDATION-protocol §4.

## 3. Gate C — distinctness & sensitivity (judgment)

- **Named trends and adjacent brands** were the batch-2 killers: if an established word, a named trend, or a living brand already owns the concept or its neighborhood, the coinage is REVISE or REJECT even when the exact string is free.
- **Group-agnostic editorial line**: coinages target systems, institutions and practices — never an ethnic, religious or other protected group; no conspiracy tropes. An entry that fails this line is REJECT regardless of novelty.

## 4. Verdict mapping

| Verdict | When | After |
|---|---|---|
| **APPROVE** | all of Gate A, B, C pass with evidence | ready for JSON export |
| **REVISE** | the concept is real and unnamed but the *form* collides or does no work (§1.10 fail, emerging phrase), or a near-neighbor needs dodging | reword or re-derive |
| **REJECT** | EXISTS-grade collision (any layer of §2, or §1.10 with the phrase owning the concept), or the sensitivity line fails | never inserted |

## 5. Evidence rules

- Every non-APPROVE carries the evidence URL(s) that drove it.
- Engines are named and dated ("searched via X, checked YYYY-MM-DD").
- Raw result counts are never the verdict — the question is always *does anyone already use this meaning, under any spelling?*

## Related

- [VALIDATION-protocol.md](VALIDATION-protocol.md) — the gate, the search plan, verdict definitions
- [REVIEW-novelty-search-rules.md](REVIEW-novelty-search-rules.md) — source-language and split-form procedures
- [SOURCING-playbook.md](SOURCING-playbook.md) — what "real and unnamed" means; where concepts come from
- `wordstoreview/batch-3-manifest-2026-11-08.md` — the batch-3 application of this rubric
