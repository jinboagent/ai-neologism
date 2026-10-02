import Link from "next/link";

export const metadata = { title: "Sources — where coinable concepts surface" };

const TIER2 = [
  { name: "r/neology", url: "https://www.reddit.com/r/neology", what: "Raw coinages with reasoning; posters often explain the gap they're filling" },
  { name: "r/words", url: "https://www.reddit.com/r/words", what: "\"Is there a word for…\" threads — the thread itself is a naming-gap announcement" },
  { name: "Urban Dictionary — newest", url: "https://www.urbandictionary.com", what: "Earliest appearances of terms; mostly jokes, but early signals live here" },
  { name: "Know Your Meme", url: "https://knowyourmeme.com", what: "Concept clusters before they solidify into slang; documentation gives ready-made context" },
  { name: "Linguists to follow", url: "https://www.scientificamerican.com/podcast/episode/etymology-nerd-adam-aleksic-on-how-internet-culture-is-transforming-the-way", what: "Adam Aleksic, #linguistiktok, Lingthusiasm — professionally filtered observations of slang in motion" },
];

const TIER3 = [
  { name: "SocArXiv / SocOpen", url: "https://socopen.org", what: "Open social-science preprints (~3,100/yr and growing); browse weekly or follow the feed" },
  { name: "SocOpen essays", url: "https://socopen.org/category/essays", what: "Public-facing versions — shorter, plainer language, ideal Coin-with-AI input" },
  { name: "Symbolic Interaction · Social Problems · New Media & Society", url: "https://socopen.org", what: "Table-of-contents scans; abstracts alone reveal placeholder-label sentences" },
  { name: "Aeon · Psyche", url: "https://aeon.co", what: "Academics writing publicly about phenomena, often noting the vocabulary gap" },
  { name: "Google Scholar alerts", url: "https://scholar.google.com", what: "Alert on \"we lack a term for\", \"as yet unnamed\", \"no satisfactory term\" — researchers flag gaps for you" },
];

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">Sources</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Where coinable concepts surface. AI Neologism lives two stages before the dictionary: slang is born in niche
        communities, amplified by algorithms, described by journalists, studied by academics — and only then codified.
        We hunt in the middle.
      </p>

      <div className="mt-6 rounded-xl border border-primary/30 bg-primary-soft p-4">
        <p className="text-sm text-primary">
          <strong>The golden signal:</strong> writing that announces a naming gap — <em>“no word for…”</em>,{" "}
          <em>“researchers have noticed a rise in…”</em>, <em>“what we here call…”</em>. Whoever wrote that sentence
          has verified the phenomenon is real and unnamed.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Tier 2 — Slang watch</h2>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          The sweet spot: spreading slang with <strong>no careful definition anywhere</strong> — write the serious
          entry. Too late: anything in a dictionary&apos;s new-word list (it will correctly hit our name-collision
          gate).
        </p>
        <ul className="mt-4 space-y-3">
          {TIER2.map((s) => (
            <li key={s.name} className="rounded-xl border border-border bg-card p-4">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                {s.name}
              </a>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.what}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Ethics: slang often originates in specific communities — name the origin community in the etymology.
          Attribution is part of the site&apos;s honesty.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Tier 3 — Academic sociology</h2>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          The abstract trick: sociology papers full of documented phenomena with placeholder names —{" "}
          <em>“what we here call ‘ambient precarity’”</em> means <em>real concept, no committed name</em>. You never
          need to read the whole paper; scan abstracts for those sentences. Always cite the paper as the entry&apos;s
          academic reference.
        </p>
        <ul className="mt-4 space-y-3">
          {TIER3.map((s) => (
            <li key={s.name} className="rounded-xl border border-border bg-card p-4">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                {s.name}
              </a>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.what}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">The weekly 30 minutes</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-6">
          <li><strong>Harvest (15 min):</strong> skim r/neology + Know Your Meme, the SocOpen feed, and your Scholar alerts; park 3–5 links below.</li>
          <li><strong>Coin (10 min):</strong> open each seed with “Coin with AI”, pick a candidate, tighten the definition.</li>
          <li><strong>Submit (5 min):</strong> send the best 1–3 through verification into the review queue. A steady drip beats a batch.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/seeds" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-deep transition-colors">
            Open your seed queue →
          </Link>
          <Link href="/contribute" className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-5 text-sm font-medium hover:border-primary transition-colors">
            Coin directly
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          The full playbook (search recipes, prompt templates, reference mapping) lives in the repository at
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5">ai-neologism/docs/SOURCING-playbook.md</code>.
        </p>
      </section>
    </div>
  );
}
