import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review criteria",
  description:
    "The three gates every candidate word passes before publication: a ten-point craft checklist, a three-layer novelty search, and the editorial line. Nothing is published just because an AI coined it.",
  alternates: { canonical: "/criteria" },
};

export default function CriteriaPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">The bar every word passes</h1>
      <div className="reading-col mt-4 space-y-10">
        <section>
          <p className="mt-2">
            Nothing lands in this dictionary just because a machine coined it. Every candidate — human-submitted or
            AI-coined — faces the same three gates, in order, before publication. This page is the public statement of
            that bar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">Gate 1 — the craft checklist</h2>
          <p className="mt-2">All ten must hold before any search even runs:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-6">
            <li>
              <strong>Names a real phenomenon</strong> — an observable, describable social pattern. Not a joke, not a
              private in-joke.
            </li>
            <li>
              <strong>Pronounceable</strong> — a reader who sees it can say it.
            </li>
            <li>
              <strong>Short</strong> — preferably four syllables or fewer.
            </li>
            <li>
              <strong>Real word-formation</strong> — built from productive English patterns: compounds, clean blends,
              live affixes (-washing, -flation, -creep, micro-). The morpheme boundaries must be real: the word parses.
            </li>
            <li>
              <strong>The fusion must do work</strong> — see below.
            </li>
            <li>
              <strong>Never a brand or trademark.</strong>
            </li>
            <li>
              <strong>Etymology stated</strong> — the roots and why they fit, on every entry.
            </li>
            <li>
              <strong>Machine-coined entries carry more, not less</strong> — a proposed IPA pronunciation,
              related-entry placement (empty by judgment, never by omission), and pre-selected categories.
            </li>
          </ol>
          <p className="mt-3">
            Rule 5 is the one that kills the most candidates. If two words already form a natural, everyday phrase —
            and the coinage means exactly what that phrase means — we don&apos;t publish it. Fusing{" "}
            <em>mile marker</em> into <em>milemarker</em> adds nothing: that is respelling, not naming. A fusion earns
            its place only when the phrase doesn&apos;t already exist, the meaning is more than the sum of its parts,
            or the form itself is transformed — clipped, blended across boundaries, shifted in grammar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">Gate 2 — the novelty search</h2>
          <p className="mt-2">Three layers, because exact-string search alone misses most collisions:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>The exact form</strong> — quoted searches for the word alone, plus &quot;meaning&quot; and
              &quot;definition&quot; phrasings, plus dictionary checks.
            </li>
            <li>
              <strong>The source language</strong> — a word built on foreign roots is searched in its own language and
              its standard English translation, not just the fused English spelling.
            </li>
            <li>
              <strong>The split phrase</strong> — every compound is searched unfused, because &quot;run club&quot;
              doesn&apos;t stop existing because someone spelled it <em>runclub</em>.
            </li>
          </ul>
          <p className="mt-3">
            No search engine proves a negative, so our claim is always dated and scoped:{" "}
            <em>no usage with this meaning was found in the queried indexes, on the checked date</em> — and the
            evidence is published with the entry. A result only counts against a candidate when it means what the
            candidate means; finding the form in an unrelated sense does not fail it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">Gate 3 — distinctness and the editorial line</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              An established word, a <strong>named trend</strong>, or a living brand already owning the concept or its
              neighborhood blocks the coinage — even when the exact string is free.
            </li>
            <li>
              Words here target <strong>systems, institutions and practices</strong> — never an ethnic, religious, or
              other group of people. No conspiracy narratives. An entry that crosses this line is rejected regardless
              of novelty.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">What happens to a verdict</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>Approved</strong> — published with its verification badge (the badge meanings are on the{" "}
              <Link href="/about" className="text-primary hover:underline">
                about page
              </Link>
              ).
            </li>
            <li>
              <strong>Revise</strong> — the phenomenon is real and unnamed but the form collides or does no work: the
              form is reworked, not the idea.
            </li>
            <li>
              <strong>Rejected</strong> — never inserted, with the evidence that drove the decision kept on record.
            </li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            Every non-approval carries the evidence that drove it, with the search engine and date named. Raw result
            counts are never the verdict — the question is always whether anyone already uses this meaning, under any
            spelling.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">See it in practice</h2>
          <p className="mt-2">
            The pipeline, the badges and the participation ladder are on the{" "}
            <Link href="/about" className="text-primary hover:underline">
              about page
            </Link>
            . Think you&apos;ve spotted a phenomenon with no name?{" "}
            <Link href="/contribute" className="text-primary hover:underline">
              Coin a word →
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
