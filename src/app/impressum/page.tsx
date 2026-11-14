import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum" };

// NOTE (owner): German law (§ 5 DDG, formerly § 5 TMG) requires an Impressum
// for a commercial site offered in Germany — the German edition makes this
// page mandatory. The PLACEHOLDER fields below MUST be filled with your legal
// name and postal address before this site is offered commercially in
// Germany. Until then the site should be considered a non-commercial project
// in the German market.

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">Impressum</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz).
      </p>

      <div className="reading-col mt-6 space-y-8">
        <section>
          <h2 className="text-xl font-bold">Anbieter</h2>
          <p className="mt-2">
            The AI Neologism Project
            <br />
            Betrieben von: <strong>[PLATZHALTER: Vor- und Nachname des Betreibers]</strong>
            <br />
            [PLATZHALTER: Anschrift — Straße, Hausnummer, Postleitzahl, Ort, Land]
          </p>
          <p className="mt-2">
            Kontakt:{" "}
            <a href="mailto:hello@ai-neologism.com" className="text-primary hover:underline">
              hello@ai-neologism.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">Verantwortlich für den Inhalt</h2>
          <p className="mt-2">
            [PLATZHALTER: Vor- und Nachname des Betreibers], [PLATZHALTER: Anschrift] — gemäß § 18 Abs. 2 MStV.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">Hosting</h2>
          <p className="mt-2">
            Technischer Anbieter (Hosting und Auslieferung): Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723,
            USA.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">Hinweis</h2>
          <p className="mt-2 text-muted-foreground">
            Die Platzhalterfelder sind vor kommerziellem Angebot in Deutschland verpflichtend auszufüllen. English:
            this page is the legal notice required for offering a commercial website in Germany; the placeholder fields
            must carry the operator&apos;s legal name and postal address.
          </p>
        </section>
      </div>
    </div>
  );
}
