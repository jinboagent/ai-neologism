import type { Dictionary } from "./en";

export const de: Dictionary = {
  /* ---- Chrome ---- */
  skipToContent: "Zum Inhalt springen",
  navAria: "Hauptnavigation",
  navIndex: "Register",
  navPopularity: "Beliebtheit",
  navContribute: "Mitprägen",
  navSeeds: "Fundstücke",
  navReview: "Prüfung",
  navMyWords: "Meine Wörter",
  navSources: "Quellen",
  navAbout: "Über",
  searchAria: "Wörter und Phänomene suchen",
  searchCompact: "Suchen…",
  searchPlaceholder: "Beschreibe das Phänomen — z. B. „Firmen, die vorgeben, ethisch zu sein“",
  searchButton: "Suchen",
  footerTagline: "Wörter für das, was wir fühlen, aber noch nicht benennen können.",
  footerCc: "Einträge unter CC BY-SA 4.0 geplant",
  footerCriteria: "Prüfkriterien",
  footerMethodology: "Methodik & API",
  footerAdmin: "Admin",
  langAria: "Sprache",
  alsoIn: "Auch auf",

  /* ---- Metadaten ---- */
  metaHomeTitle: "AI Neologism — ein Wörterbuch für Wörter, die es noch nicht gibt",
  metaHomeDesc:
    "Ein kuratiertes öffentliches Wörterbuch: Die KI prägt neue Wörter für aufkommende gesellschaftliche Phänomene, die Neuartigkeit wird per Websuche überprüft, und die Community stimmt über die Aufnahme ab.",
  metaIndexTitle: "A–Z-Register",
  metaPopularityTitle: "Beliebtheit",
  metaAboutTitle: "Über & Methodik",
  metaCriteriaTitle: "Prüfkriterien",
  metaCriteriaDesc:
    "Die drei Tore, die jedes Kandidatenwort vor der Veröffentlichung passiert: eine zehnpunktige Handwerksliste, eine dreistufige Neuartigkeitssuche und die redaktionelle Linie. Nichts wird nur deshalb veröffentlicht, weil eine KI es geprägt hat.",

  /* ---- Startseite ---- */
  homeHeroTitle: "Wörter für das, was wir fühlen, aber noch nicht benennen können.",
  homeHeroSub:
    "Die KI prägt neue Wörter für aufkommende gesellschaftliche Phänomene. Neuartigkeit wird per Websuche überprüft. Menschen prüfen. Die Community stimmt darüber ab, welche Wörter existieren dürfen.",
  homeCoinCta: "Ein Wort prägen",
  homeBrowseCta: "Das A–Z-Register durchstöbern",
  homeCount: (n) => `${n} ${n === 1 ? "Wort" : "Wörter"} in der Sammlung`,
  homeCoinHeading: "Mit KI prägen",
  homeCoinOther: "Andere Wege, beizutragen →",
  homeCoinDesc:
    "Füge einen Artikel oder Link zu einem Phänomen ein — die KI schlägt Kandidatenwörter vor, du verfeinerst einen, die Neuartigkeitsprüfung läuft, und der Eintrag landet in der Prüfwarteschlange.",
  homeTrending: "Diese Woche im Trend",
  homeRecent: "Kürzlich verifiziert",
  homeAllLenses: "Alle Beliebtheits-Ansichten →",
  homeEmptyPre: "Noch keine Wörter — ",
  homeEmptyLink: "präg das erste",
  homeEmptyPost: ".",
  homeByCategory: "Nach Kategorie stöbern",
  homeAz: "A–Z",
  buildingNote: "Diese Sprachausgabe entsteht gerade — aktuell werden Wörter geprägt. Das englische Original ist schon live.",
  buildingLink: "Zum englischen Wörterbuch →",

  /* ---- A–Z-Register ---- */
  indexTitle: "Wortregister",
  indexSub: "Alle veröffentlichten Wörter, alphabetisch.",
  indexEmpty: "Das Wörterbuch ist noch leer.",
  indexCoinFirst: "Das erste Wort prägen →",
  indexCount: (n) => `${n} ${n === 1 ? "Wort" : "Wörter"}`,

  /* ---- Beliebtheit ---- */
  popTitle: "Beliebtheit",
  popSub: "Vier Ansichten, damit auch neue Wörter sichtbar bleiben.",
  popEmpty: "Hier ist noch nichts. Abstimmungen und frische Wörter füllen diese Seite.",
  lensTrending: "Diese Woche im Trend",
  lensTrendingBlurb: "Wörter mit den meisten Stimmen der letzten 7 Tage.",
  lensEndorsed: "Am meisten befürwortet",
  lensEndorsedBlurb: "Wörter, die die meisten Leute wirklich benutzen würden.",
  lensContested: "Am meisten umstritten",
  lensContestedBlurb: "Hoch bei „würde benutzen“ UND „braucht Arbeit“ — oft die interessantesten Wörter.",
  lensVerified: "Kürzlich verifiziert",
  lensVerifiedBlurb: "Die neuesten veröffentlichten Wörter.",

  /* ---- Worttabelle ---- */
  thWord: "Wort",
  thGloss: "Kurzerklärung",
  thAdded: "Hinzugefügt",
  thRank: "Rang",
  useAria: (n) => `${n} würden es benutzen`,
  workAria: (n) => `${n} sehen Verbesserungsbedarf`,

  /* ---- Abstimmung ---- */
  voteUse: "Dieses Wort würde ich benutzen",
  voteWork: "Braucht Arbeit",
  voteUseAria: (n) => `${n} Personen würden dieses Wort benutzen`,
  voteWorkAria: (n) => `${n} Personen sehen Verbesserungsbedarf`,

  /* ---- Worteintrag ---- */
  wordPending: "Nur du (und die Prüfer) können diese Seite sehen, bis sie veröffentlicht ist.",
  wordReviewerNotes: "Anmerkungen der Prüfung:",
  refLabels: { news: "Nachricht", academic: "Wissenschaft", essay: "Essay", social: "Social-Post", internal: "Auf dieser Website" },
  wordEtym: "Etym. —",
  wordAlso: "Auch erwogen —",
  wordRel: "Verwandt —",
  wordRefs: "Quellen",
  wordNovelty: "Neuartigkeitsprüfung:",
  wordChecked: "geprüft",
  wordEvidence: (n) => (n > 0 ? `Belegprotokoll · ${n} nächste Treffer` : "Belegprotokoll"),
  thQuery: "Suchanfrage",
  thChecked: "Geprüfte Ergebnisse",
  thSame: "Treffer gleicher Bedeutung",
  wordNoQueryLog: "Kein Anfragenprotokoll vorhanden.",
  wordMethod: "Methode:",
  wordCoinedBy: "Geprägt von einer anonymen Person",
  wordAiAssisted: "KI-unterstützt",
  wordFirstSubmitted: "eingereicht am",
  wordPublishedOn: "veröffentlicht am",
  wordRevisions: (n) => `Änderungsgeschichte (${n})`,
  wordNotFoundTitle: "Wort nicht gefunden",

  /* ---- Über (längerer Text) ---- */
  aboutTitle: "Über & Methodik",
  aboutWhatH: "Was das ist",
  aboutWhatP1:
    "AI Neologism ist ein kuratiertes öffentliches Wörterbuch für Konzepte, die noch keine Namen haben. Die KI prägt Kandidatenwörter für aufkommende gesellschaftliche Phänomene, die Neuartigkeit wird vor der Veröffentlichung per Websuche verifiziert, menschliche Prüfer schichten jeden Eintrag ab, und die Community stimmt über die Aufnahme ab — ob die Leute das Wort wirklich benutzen würden.",
  aboutWhatP2:
    "Wikipedia verifiziert „Relevanz“. Wir verifizieren „Neuartigkeit“. Jeder Eintrag trägt datierte Belege der Suchanfragen, die zeigten, dass das Wort nicht existierte — und wenn sich das Wort später verbreitet, wird es zu „jetzt in echtem Gebrauch“ befördert.",
  aboutPipelineH: "Die Pipeline",
  aboutPipeline: [
    "Material liefern — Text einfügen oder auf einen Nachrichtenartikel bzw. Essay verlinken.",
    "Die KI, geerdet im Quellenregal unten, schlägt 3–5 Kandidatenwörter vor.",
    "Du wählst einen aus und verfeinerst ihn; Zweitplatzierte werden als „ebenfalls erwogen“ festgehalten.",
    "Die Seite führt eine Neuartigkeitssuche im Web durch (Exakt-Treffer in Anführungszeichen, Varianten, Wörterbuchchecks) und hängt das Belegprotokoll an.",
    "Ein menschlicher Prüfer kontrolliert: Belege plausibel · kein Duplikat · Definition lesbar · Quellen echt.",
    "Veröffentlicht — und alle 6–12 Monate neu verifiziert.",
  ],
  aboutCraftH: "Handwerksregeln für Wörter",
  aboutCraft: [
    "Aussprechbar, möglichst ≤ 4 Silben.",
    "Gebaut aus produktiven Mustern der Sprache: Komposita, saubere Kombinationen, lebendige Affixe.",
    "Nie ein Marken- oder Warenzeichenname.",
    "Etymologische Begründung immer angegeben.",
    "Muss ein reales, identifizierbares Phänomen benennen.",
    "KI-geprägte Wörter schlagen immer eine IPA-Aussprache vor und verorten sich bei sinnvollen Beziehungen unter verwandten Einträgen.",
  ],
  aboutCraftNote: "Die volle Latte — alle drei Tore inklusive der Fusionsregel — steht auf der [[Prüfkriterien-Seite|/criteria]].",
  aboutShelfH: "Quellenregal",
  aboutShelfIntro: "Der Kanon benannter Konzepte, den die KI vor dem Prägen studiert — eine wachsende Liste:",
  aboutBadgesH: "Abzeichen",
  aboutBadges: [
    { name: "Verifiziert neu", text: "die Suchbelege stützen, dass das Wort (mit dieser Bedeutung) neu ist." },
    { name: "Wort existiert · Bedeutung ist neu", text: "die Wortform existiert, aber nicht mit dieser Bedeutung (mit Vorbehalt veröffentlicht)." },
    { name: "Unverifiziert", text: "Neuartigkeitsbelege fehlen oder sind unvollständig." },
    { name: "Namenskollision", text: "das Wort existiert bereits mit dieser Bedeutung; von der Veröffentlichung ausgeschlossen." },
    { name: "Jetzt in echtem Gebrauch", text: "die Re-Verifizierung hat die Verbreitung des Wortes festgestellt. Eine Beförderung, kein Scheitern." },
  ],
  aboutLadderH: "Beteiligungsleiter",
  aboutLadder: [
    { name: "Jeder", text: "liest, sucht und stimmt ab (ratenbegrenzt; kein Konto nötig)." },
    {
      name: "Jeder",
      text: "kann prägen — ein geheimer Beitragsschlüssel wird bei deiner ersten Einreichung ausgestellt. Kein Name, keine E-Mail. Er verknüpft deine Wörter, blockiert die Selbstprüfung und verdient dir nach 3 angenommenen Wörtern Prüfungsrechte.",
    },
    {
      name: "Verdiente Prüfer",
      text: "schichten die Veröffentlichung. Ein Prüfer genügt; jede Entscheidung braucht einen öffentlichen Einzeiler als Begründung.",
    },
  ],
  aboutLadderNote:
    "Ideen statt Identitäten: Einträge werden stets „einer anonymen Person“ zugeschrieben, mit KI-Hinweis wo zutreffend. Schlüssel verloren = Status verloren; gut aufheben.",
  aboutApiH: "API",
  aboutApiP:
    "Die ganze Sammlung ist programmierbar — dasselbe strukturierte Schema, das die Wortseiten rendern. Die vollständige API-Referenz liegt auf der [[Mitprägungs-Seite|/contribute]] unter Via API, neben den anderen Wegen beizutragen.",
  aboutLicenseH: "Lizenz & Danksagung",
  aboutLicenseP:
    "Die Einträge sollen unter CC BY-SA 4.0 stehen (Endentscheidung offen). Inspiriert vom Handwerk der Konzept-Benenner überall — und vom Muster des W3C-Neologism-Projekts: ein Schema für Menschen und Maschinen gleichermaßen.",
  aboutCoinCta: "Ein Wort prägen →",

  /* ---- Kriterien (längerer Text) ---- */
  criteriaTitle: "Die Latte, die jedes Wort nimmt",
  critIntro:
    "Nichts landet in diesem Wörterbuch nur, weil eine Maschine es geprägt hat. Jeder Kandidat — von Menschen eingereicht oder KI-geprägt — passiert dieselben drei Tore, in derselben Reihenfolge, vor der Veröffentlichung. Diese Seite ist die öffentliche Erklärung dieser Latte.",
  critGate1H: "Tor 1 — die Handwerksliste",
  critGate1Intro: "Alle zehn müssen erfüllt sein, bevor überhaupt eine Suche läuft:",
  critGate1: [
    { lead: "Benennt ein reales Phänomen", text: "— ein beobachtbares, beschreibbares gesellschaftliches Muster. Kein Witz, kein Privatwitz." },
    { lead: "Aussprechbar", text: "— wer es sieht, kann es sagen." },
    { lead: "Kurz", text: "— möglichst vier Silben oder weniger." },
    {
      lead: "Echte Wortbildung",
      text: "— gebaut aus produktiven Mustern der Sprache: Komposita, saubere Kombinationen, lebendige Affixe. Die Morphemgrenzen müssen echt sein: Das Wort lässt sich zerlegen.",
    },
    { lead: "Die Fusion muss Arbeit leisten", text: "— siehe unten." },
    { lead: "Nie ein Marken- oder Warenzeichen.", text: "" },
    { lead: "Etymologie angegeben", text: "— die Wurzeln und warum sie passen, bei jedem Eintrag." },
    {
      lead: "KI-geprägte Einträge tragen mehr, nicht weniger",
      text: "— eine vorgeschlagene IPA-Aussprache, die Verortung unter verwandten Einträgen (leer durch Urteil, nie durch Auslassung) und vorausgewählte Kategorien.",
    },
  ],
  critRule5:
    "Regel 5 killt die meisten Kandidaten. Wenn zwei Wörter bereits eine natürliche, alltägliche Phrase bilden — und die Prägung genau das bedeutet, was die Phrase bedeutet — veröffentlichen wir sie nicht. Aus „mile marker“ ein „milemarker“ zu verschmelzen, fügt nichts hinzu: Das ist Neuschreibung, nicht Benennung. Eine Fusion verdient ihren Platz nur, wenn die Phrase noch nicht existiert, die Bedeutung mehr ist als die Summe ihrer Teile, oder die Form selbst verwandelt wird — gekürzt, über Grenzen hinweg verschmolzen, grammatikalisch verschoben.",
  critGate2H: "Tor 2 — die Neuartigkeitssuche",
  critGate2Intro: "Drei Ebenen, denn Exakt-Stringsuche allein verpasst die meisten Kollisionen:",
  critGate2: [
    {
      lead: "Die exakte Form",
      text: "— Suchanfragen in Anführungszeichen nur für das Wort, dazu „Bedeutung“ und „Definition“-Formulierungen, dazu Wörterbuchchecks.",
    },
    {
      lead: "Die Quellsprache",
      text: "— ein Wort auf fremdsprachigen Wurzeln wird in seiner eigenen Sprache und seiner gängigen Übersetzung gesucht, nicht nur in der verschmolzenen Schreibweise.",
    },
    {
      lead: "Die getrennte Phrase",
      text: "— jedes Kompositum wird auch unverschmolzen gesucht, denn „Laufclub“ hört nicht auf zu existieren, weil jemand „Laufclub“ zusammenschreibt.",
    },
  ],
  critGate2Note:
    "Keine Suchmaschine beweist ein Negativ, also ist unsere Behauptung stets datiert und eingegrenzt: „keine Verwendung mit dieser Bedeutung in den abgefragten Indizes am Prüftag gefunden“ — und die Belege werden mit dem Eintrag veröffentlicht. Ein Ergebnis zählt nur gegen einen Kandidaten, wenn es bedeutet, was der Kandidat bedeutet; die Form in einem fremden Sinn zu finden, fällt ihn nicht durch.",
  critGate3H: "Tor 3 — Abgrenzung und die redaktionelle Linie",
  critGate3: [
    {
      lead: "",
      text: "Ein etabliertes Wort, ein „benannter Trend“ oder eine lebende Marke, die das Konzept oder sein Umfeld bereits besetzt, blockiert die Prägung — selbst wenn der exakte String frei ist.",
    },
    {
      lead: "",
      text: "Wörter hier zielen auf Systeme, Institutionen und Praktiken — nie auf eine ethnische, religiöse oder sonstige Gruppe von Menschen. Keine Verschwörungserzählungen. Ein Eintrag, der diese Linie überschreitet, wird unabhängig von seiner Neuartigkeit abgelehnt.",
    },
  ],
  critVerdictsH: "Was mit einem Urteil passiert",
  critVerdicts: [
    { lead: "Angenommen", text: "— veröffentlicht mit seinem Verifizierungs-Abzeichen (die Bedeutungen der Abzeichen stehen auf der [[Über-Seite|/about]])." },
    {
      lead: "Überarbeiten",
      text: "— das Phänomen ist real und unbenannt, aber die Form kollidiert oder leistet keine Arbeit: Die Form wird überarbeitet, nicht die Idee.",
    },
    { lead: "Abgelehnt", text: "— nie eingefügt, mit den Belegen der Entscheidung im Archiv." },
  ],
  critVerdictNote:
    "Jede Nicht-Annahme trägt die Belege, die sie begründen, mit genannter Suchmaschine und Datum. Rohe Trefferzahlen sind nie das Urteil — die Frage ist immer, ob irgendjemand diese Bedeutung schon benutzt, unter welcher Schreibweise auch immer.",
  critPracticeH: "In der Praxis sehen",
  critPractice:
    "Pipeline, Abzeichen und Beteiligungsleiter stehen auf der [[Über-Seite|/about]]. Du glaubst, ein Phänomen ohne Namen entdeckt zu haben? [[Ein Wort prägen →|/contribute]]",
};
