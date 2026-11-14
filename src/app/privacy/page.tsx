import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

// NOTE (owner): this is a plain-language template, not legal advice — have it
// reviewed before relying on it commercially. It documents what the site
// actually does today: no accounts, hashed identifiers, optional contact
// email, functional cookies only.

const SECTIONS: { h: string; ps: string[] }[] = [
  {
    h: "What we collect",
    ps: [
      "AI Neologism works without accounts. When you submit a word or vote, your request is identified only by a hashed fingerprint (a one-way hash of your IP and browser signature) used for rate-limiting and vote de-duplication. We never store your IP address in readable form.",
      "When you submit a word, a secret contribution key is issued and stored in a cookie. We store only a cryptographic hash of that key — never the key itself on our servers.",
      "If you optionally provide a contact email with an API submission, it is stored solely to notify you about the review decision for that submission, and is never published.",
      "A functional cookie (locale-pref) remembers which language you chose so we do not redirect you again. Vercel Analytics collects anonymous, aggregated traffic data.",
    ],
  },
  {
    h: "What we never do",
    ps: [
      "We do not run advertising, we do not sell or share personal data, and we do not use tracking cookies beyond the functional ones described above.",
      "Entry content is attributed to anonymous contributors by design; nothing on a published entry links back to an identity.",
    ],
  },
  {
    h: "Deletion and questions",
    ps: [
      "Because we hold no accounts, the practical footprint of a visitor is limited to hashed identifiers. If you submitted words and want your contact email removed, write to hello@ai-neologism.com from that address and we will delete it.",
      "Questions about this policy: hello@ai-neologism.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated 2026-11-14 · plain language, no dark patterns.</p>
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
