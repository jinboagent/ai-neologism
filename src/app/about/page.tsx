import Link from "next/link";

export const metadata = { title: "About & Methodology" };

const SOURCE_SHELF = [
  "Zygmunt Bauman — liquid modernity",
  "Byung-Chul Han — burnout society, psychopolitics",
  "Shoshana Zuboff — surveillance capitalism",
  "Alvin Toffler — future shock",
  "Richard Louv — nature-deficit disorder",
  "Pew Research — social-trend studies",
  "Oxford Word of the Year archive — how words enter language",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">About &amp; methodology</h1>
      <div className="reading-col mt-4 space-y-10">
        <section>
          <h2 className="text-xl font-bold">What this is</h2>
          <p className="mt-2">
            AI Neologism is a curated public dictionary for concepts that don&apos;t have names yet. AI coins candidate
            English words for emerging social phenomena, novelty is verified by web search before publication, human
            reviewers gate every entry, and the community votes on adoption — whether people would actually use the
            word.
          </p>
          <p className="mt-2">
            Wikipedia verifies <em>notability</em>. We verify <em>novelty</em>. Every entry carries dated evidence of
            the searches that showed the word did not exist — and if the word later spreads, the entry graduates to
            &quot;now in real use.&quot;
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">The pipeline</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-6">
            <li>Provide material — paste text or a link to a news article or essay.</li>
            <li>The AI, grounded in the source shelf below, proposes 3–5 candidate words.</li>
            <li>You pick one and refine it; runners-up are recorded as &quot;alternatives considered.&quot;</li>
            <li>The site runs a novelty web search (quoted exact matches, variants, dictionary checks) and attaches the evidence log.</li>
            <li>A human reviewer checks: evidence plausible · not a duplicate · definition readable · references real.</li>
            <li>Published — and re-verified every 6–12 months.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-bold">Craft rules for coinage</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Pronounceable, preferably ≤ 4 syllables.</li>
            <li>Built from productive English patterns: compounds, blends, -washing, -ism, -phobia, e-, cyber-, micro-.</li>
            <li>Never a brand or trademark name.</li>
            <li>Etymology rationale always stated.</li>
            <li>Must name a real, identifiable phenomenon.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">Source shelf</h2>
          <p className="mt-2 text-muted-foreground">The named-concept canon the AI studies before coining — a growing list:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {SOURCE_SHELF.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">Badges</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Verified New</strong> — search evidence supports that the word (with this meaning) is new.</li>
            <li><strong>Word exists · sense is new</strong> — the word form exists, but not with this meaning (published with caveat).</li>
            <li><strong>Unverified</strong> — novelty evidence is missing or incomplete.</li>
            <li><strong>Name collision</strong> — the word already exists with this meaning; blocked from publication.</li>
            <li><strong>Now in real use</strong> — re-verification detected the word spreading. Graduation, not failure.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">Participation ladder</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Anyone</strong> reads, searches, and votes (rate-limited; no account needed).</li>
            <li><strong>Anyone</strong> can coin — a secret contribution key is issued at your first submission. No name, no email. It links your words, blocks you from reviewing yourself, and earns review rights after 3 accepted words.</li>
            <li><strong>Earned reviewers</strong> gate publication. One reviewer is enough; every decision needs a public one-line reason.</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Ideas over identities: entries are always attributed to &quot;an anonymous contributor,&quot; with an
            AI-assisted flag where applicable. Lost key = lost standing; keep it safe.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">API</h2>
          <p className="mt-2">
            The whole collection is programmable — the same structured schema the word pages render. Submissions via
            API enter the same review queue as web submissions (the API is a doorway, not a bypass).
          </p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pr-4 font-medium">Method &amp; path</th>
                <th className="font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["GET /api/words", "list published words (page, limit)"],
                ["POST /api/words", "submit a word package (X-Contribution-Key header; returns 202 in_review; a new key is issued if absent)"],
                ["GET /api/words/{slug}", "one full structured entry"],
                ["PUT /api/words/{slug}", "edit (owner or reviewer); returned words re-enter the queue"],
                ["GET /api/words/{slug}/revisions", "revision history"],
                ["GET /api/search?q=", "full-text search"],
                ["GET /api/popularity?lens=trending|endorsed|contested|verified", "popularity lenses"],
                ["POST /api/words/{slug}/vote", "vote {vote: 1 | -1} (rate-limited)"],
                ["POST /api/coin/candidates", "{text | url} → AI candidate words"],
                ["POST /api/coin/verify", "{word, definition} → novelty verdict + evidence"],
                ["GET /api/key", "your key status (accepted words, review rights)"],
                ["GET /api/review · POST /api/review", "review queue & decisions (review rights required)"],
              ].map(([route, purpose]) => (
                <tr key={route} className="border-t border-border/60">
                  <td className="py-1.5 pr-4 font-mono text-xs">{route}</td>
                  <td className="py-1.5">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-xl font-bold">Licensing &amp; credits</h2>
          <p className="mt-2">
            Entries are planned to live under CC BY-SA 4.0 (final decision pending). Inspired by the craft of
            concept-namers everywhere, and by the W3C Neologism project&apos;s pattern of one schema for humans and
            machines alike.
          </p>
          <p className="mt-2">
            <Link href="/contribute" className="text-primary hover:underline">
              Coin a word →
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
