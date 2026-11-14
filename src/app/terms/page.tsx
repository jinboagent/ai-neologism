import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Use" };

// NOTE (owner): plain-language template, not legal advice — review before
// relying on it commercially.

const SECTIONS: { h: string; ps: string[] }[] = [
  {
    h: "What this service is",
    ps: [
      "AI Neologism is a curated dictionary of newly coined words for emerging social phenomena. Entries are drafted with AI assistance, checked by automated novelty search, and published only after human review. The service is provided as-is, free of charge, in German, English, Spanish and French.",
    ],
  },
  {
    h: "Content and ownership",
    ps: [
      "The dictionary, its entries and its evidence logs are the property of The AI Neologism Project. You may read, link to, and quote entries with attribution and a link. You may not republish the collection in bulk, scrape it for training data, or present it as your own without written permission.",
      "If you submit a word, you grant The AI Neologism Project the right to publish and edit that submission as part of the dictionary. You remain responsible for what you submit.",
    ],
  },
  {
    h: "Acceptable use",
    ps: [
      "Do not submit content that is unlawful, defamatory, hateful toward any group of people, or infringing. Entries that target ethnic, religious, or other groups of people are rejected regardless of novelty — this is also the editorial line of the dictionary itself.",
      "Automated access is welcome through the public API within its rate limits; abusive automated access will be blocked.",
    ],
  },
  {
    h: "No warranty",
    ps: [
      "Entries document newly coined words; by definition, usage evidence changes over time. We re-verify entries periodically but make no warranty that any entry remains accurate or current. The service is provided without warranties of any kind to the extent permitted by law.",
    ],
  },
  {
    h: "Changes",
    ps: ["These terms may change as the service evolves; the date above reflects the current version. Continued use after a change means acceptance."],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">Terms of Use</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated 2026-11-14.</p>
      <div className="reading-col mt-6 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-bold">{s.h}</h2>
            {s.ps.map((p, i) => (
              <p key={i} className="mt-2">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
