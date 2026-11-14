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

  /* ---- games ---- */
  navGames: "Spiele",
  metaGamesTitle: "Spiele — spiel mit KI-geprägten Wörtern",
  metaGamesDesc:
    "Fünf Wortspiele, live aus dem veröffentlichten Wörterbuch berechnet: errate die Bedeutung, entlarve die falsche Definition, sortiere die Kategorien, erklimme die Bedeutungsleiter und spiele fünf antike Mechaniken nach.",
  metaMeaningRevealTitle: "Was bedeutet es? — das tägliche Ratespiel",
  metaMeaningRevealDesc:
    "Immer ein KI-geprägtes Wort. Wirf einen Blick auf die Morpheme, rate die Bedeutung in eigenen Worten, klicke und enthälle die echte Definition und den Prägegrund.",
  metaRealOrFakeTitle: "Echt oder erfunden? — das Definitionsspiel",
  metaRealOrFakeDesc:
    "Vier Definitionen eines KI-geprägten Worts — eine echt, drei Köder aus anderen echten Einträgen. Findest du die Wahrheit?",
  metaCategorySortTitle: "Sortier das Wörterbuch — das Kategoriespiel",
  metaCategorySortDesc:
    "Sechzehn frisch geprägte Wörter, vier versteckte Kategorien, vier Leben. Ein Connections-Brett aus den echten Kategorien des Wörterbuchs — bei jedem Laden neu.",
  metaSemanticLadderTitle: "Warm oder kalt? — die Bedeutungsleiter",
  metaSemanticLadderDesc:
    "Ein verstecktes KI-Wort, eine Bank alltäglicher Wörter, Ähnlichkeitswerte von 0 bis 100. Erklimme die Leiter allein über die Bedeutung.",
  metaAncientVaultTitle: "Das Antiquarium — antike Wortspiele, neuer Treibstoff",
  metaAncientVaultDesc:
    "Das Sator-Quadrat von Pompeji, Lihe-Fusionsrätsel, die Tang-Feihualing, umgekehrte Rätsel und Wortketten — fünf Jahrtausende alte Mechaniken mit Wörtern, die es vor drei Jahren nicht gab.",
  games: {
    backToGames: "← Alle Spiele",
    hubTitle: "Spiel mit KI-geprägten Wörtern",
    hubSub:
      "Fünf Spiele, live aus dem veröffentlichten Wörterbuch berechnet — jede Runde frisch aus echten Einträgen erzeugt, und das Tageswort ist für alle dasselbe.",
    statWords: (n: number) => `${n} Wörter`,
    statFamilies: (n: number) => `${n} Morphemfamilien`,
    statCategories: (n: number) => `${n} Kategorien`,
    statDaily: "☀️ ein Tageswort",
    howToPlay: "So wird gespielt",
    unavailable: "Dieses Spiel hat in dieser Sprache noch nicht genug veröffentlichte Wörter.",
    playCta: "Spielen →",
    enterVaultCta: "Antiquarium betreten →",
    allGames: "Alle Spiele →",

    cardMeaningTitle: "Was bedeutet es?",
    cardMeaningDesc:
      "Die tägliche Kernrunde: erst das Tageswort, dann Zufallstraining. Sieh dir die Morpheme an, rate die Bedeutung in eigenen Worten, klicke zum Enthüllen.",
    cardMeaningOrigin: "Ursprung: deine Idee — die tägliche Kernrunde",
    cardRealOrFakeTitle: "Echt oder erfunden?",
    cardRealOrFakeDesc:
      "Vier Definitionen, eine echt — die Köder sind Definitionen anderer echter Wörter aus dem Wörterbuch.",
    cardRealOrFakeOrigin: "Ursprung: Balderdash / Fictionary, Solo-Remix",
    cardCategoryTitle: "Sortier das Wörterbuch",
    cardCategoryDesc:
      "Sechzehn Wörter, vier echte Kategorien, vier Leben. Das Brett baut sich bei jedem Laden neu — kein Besuch gleicht dem anderen.",
    cardCategoryOrigin: "Ursprung: NYT Connections, Wörterbuch-Edition",
    cardSemanticTitle: "Warm oder kalt?",
    cardSemanticDesc:
      "Erklimme eine Bedeutungsähnlichkeits-Leiter zu einem versteckten Wort. Demobrett mit simulierten Werten — die echte Version braucht Wort-Embeddings.",
    cardSemanticOrigin: "Ursprung: Semantle / Contexto, word2vec-Edition",
    cardVaultTitle: "Das Antiquarium",
    cardVaultDesc:
      "Fünf antike Mechaniken mit frischem Treibstoff: das Sator-Quadrat von Pompeji, Lihe-Fusionsrätsel, die Tang-Feihualing, umgekehrte Rätsel und die Wortkette — Runden live berechnet.",
    cardVaultOrigin: "Ursprung: 2.000 Jahre Wortspiele · Rom · Han · Tang · England · Japan/Korea",

    mrIntro:
      "Die tägliche Kernrunde. Das erste Wort ist ☀️ das Tageswort — für alle dasselbe. Niemand hat diese Prägungen je gesehen. Rate, was es bedeuten muss, und klicke zum Enthüllen.",
    mrRules: [
      "Lies das Wort. Es ist echt, es ist veröffentlicht, und es ist brandneu.",
      "Wirf einen Blick auf die Morpheme (die zwei verschmolzenen alten Wörter) — das ist dein einziger Hinweis.",
      "Schreibe deine Vermutung in eigenen Worten — oder behalte sie nur im Kopf.",
      "Klicke auf „Bedeutung enthüllen“. Die echte Definition und der Prägegrund erscheinen.",
      "Bewerte dich selbst ehrlich: 🎯 getroffen · ≈ warm · 🤷 keine Ahnung.",
      "☀️ Das erste Wort ist das Tageswort (für alle gleich); „Nächstes Wort“ bringt Zufallstraining.",
    ],
    mrShowHint: "👀 Morphem-Hinweis zeigen",
    mrHideHint: "🙈 Morphem-Hinweis verbergen",
    mrGuessPlaceholder: "Deine Vermutung, in eigenen Worten (optional, aber schön zum Vergleichen nach dem Enthüllen)…",
    mrReveal: "Bedeutung enthüllen",
    mrRevealedHeading: "✓ Die echte Bedeutung",
    mrHowClose: "Wie nah warst du?",
    mrNailed: "🎯 Getroffen",
    mrWarm: "≈ Warm",
    mrNoIdea: "🤷 Keine Ahnung",
    mrScored: (emoji: string) => `Notiert: ${emoji} — Serien und Teile-Karten kommen noch.`,
    mrNext: "Nächstes Wort →",
    mrFooter: "Live-Daten · erstes Wort = heutiges Tageswort",

    rofIntro:
      "Vier Definitionen eines KI-geprägten Worts. Eine ist die echt veröffentlichte Definition — die anderen drei sind Köder: Definitionen anderer echter Wörter aus dem Wörterbuch (als Upgrade geplant: Köder aus den eigenen verworfenen Kandidaten der KI).",
    rofRules: [
      "Ein Wort erscheint mit vier Definitionen, A–D.",
      "Eine ist echt — die im Wörterbuch veröffentlichte Definition.",
      "Drei sind Köder. Beim klassischen Balderdash erfinden Menschen Fälschungen; v0 leiht sich Definitionen anderer echter Einträge.",
      "Wähle eine. Richtig: das Wort kommt in deine Serie. Falsch: du siehst, warum die echte gewonnen hat.",
      "In Produktion: ein tägliches Fünfer-Set, Serien und ein teilbares Ergebnistraster.",
    ],
    rofRound: (i: number, n: number) => `Runde ${i} / ${n}`,
    rofCorrect: (n: number) => `Richtig: ${n}`,
    rofNext: "Nächste Runde →",
    rofSeeResult: "Ergebnis ansehen →",
    rofCalledIt: "du hast sie erkannt.",
    rofGotYou: "der Köder hat dich erwischt.",
    rofEnd: (c: number, n: number) =>
      `Demo-Bank beendet — ${c}/${n} richtig. 🎯 In Produktion: ein frisches Tages-Fünfer, Serien und ein teilbares Raster.`,
    rofFooter: "Live-Daten · Köder = Definitionen anderer echter Wörter (v0)",

    csIntro:
      "Sechzehn frisch geprägte Wörter. Vier versteckte Kategorien, je vier Wörter. Die Kategorien sind die echten des Wörterbuchs — finde die Familien.",
    csRules: [
      "Wähle 4 Wörter, die deiner Meinung nach eine Kategorie teilen, und klicke auf Absenden.",
      "Richtig → die Familie wird festgezurrt. Falsch → du verlierst eines von vier Leben.",
      "Die Falle: manche Wörter passen plausibel in zwei Gruppen — die echten Kategorien des Wörterbuchs halten es ehrlich.",
      "Das Brett baut sich bei jedem Seitenaufruf neu.",
    ],
    csSelected: (n: number) => `${n} ausgewählt`,
    csSubmit: "Absenden",
    csClear: "Leeren",
    csPlayAgain: "Nochmal spielen",
    csLocked: (name: string) => `✓ ${name} festgezurrt.`,
    csWrong: "✗ Keine Familie — ein Leben weg.",
    csPerfect: "Perfekt sortiert! 🧩",
    csOutOfLives: (names: string) => `Keine Leben mehr. Die übrigen Familien: ${names}`,
    csFooter: "Live-Daten · Brett automatisch aus den echten Kategorien gebaut — bei jedem Laden frisch",

    slIntro:
      "Ein verstecktes KI-geprägtes Wort. Klicke Wörter aus der Bank — oder tippe eigene — und erhalte einen Bedeutungsähnlichkeitswert von 0 bis 100. Erklimme die Leiter allein über die Bedeutung. Keine Buchstabiererei — genau so funktionieren neue Wörter.",
    slRules: [
      "Ein Wort ist versteckt. Es ist echt und veröffentlicht — du weißt nur nicht, welches.",
      "Klicke ein Wort aus der Bank (oder tippe ein eigenes). 100 = bedeutungsgleich, 0 = unverwandt.",
      "Wärme dich auf: die Leiter sortiert deine Versuche; folge der Hitze zum versteckten Konzept.",
      "Enthüllen schaltet nach 3 Versuchen frei — verdient oder aufgegeben, beides zeigt die Wahrheit.",
      "Diese Demo simuliert die Werte — die echte Version braucht Wort-Embeddings.",
    ],
    slHiddenPrefix: "Das versteckte Wort ist ",
    slLetters: (n: number) => `????? (${n} Buchstaben)`,
    slInputPlaceholder: "Optional: Wort tippen und Enter drücken…",
    slGuess: "Raten",
    slRevealLocked: "Enthüllen (3 Versuche nötig)",
    slRevealReady: "Wort enthüllen",
    slNext: "Nächstes verstecktes Wort →",
    whyPrefix: "Warum die KI es geprägt hat: ",
    slFooter: "Demobrett · Wörter aus dem echten Wörterbuch, Werte simuliert (Embeddings stehen aus)",

    avIntro:
      "Fünf Spielmechaniken, Jahrtausende alt, nachgespielt mit Wörtern, die es vor drei Jahren nicht gab. Jede Mechanik unten wurde von mehreren Zivilisationen unabhängig erfunden — das Wörterbuch liefert nur neuen Treibstoff.",
    avEraSator: "Pompeji, vor AD 79 · das älteste erhaltene Worträtsel",
    avSatorTitle: "A · Das Quadrat der fünf Wörter",
    avSatorDesc:
      "Ein fünfmal fünf lateinisches Palindrom, in Pompejis Wände geritzt, von Rom bis Syrien gefunden: SATOR · AREPO · TENET · OPERA · ROTAS. Es liest sich in Zeilen und Spalten gleich, vorwärts wie rückwärts — der Lieblingsmeme des Römischen Reiches.",
    avSatorRules:
      "Erkunden: tippe eine Richtung. Jede Richtung liest fünf gültige Wörter. Zeilen und Spalten sind identisch — das ist der Trick, und niemand weiß, warum es gebaut wurde.",
    avRows: "→ Zeilen",
    avCols: "↓ Spalten",
    avRowsRev: "← Zeilen rückwärts",
    avColsRev: "↑ Spalten rückwärts",
    avSatorHist: "~2.000 Jahre alt · und bis heute ungelöst: „Arepo“ taucht in der gesamten lateinischen Literatur sonst nirgends auf.",
    avEraFusion: "Griechenland ~300 v. Chr. (Lykophrons Anagramme) · Han-China ~200 n. Chr. (Kong Rongs Lihe-Gedichte)",
    avFusionTitle: "B · Fusionsrätsel · Lihe",
    avFusionDesc:
      "Das älteste Wortbauspiel: einen Namen oder ein Wort in Fragmente zerlegen und wieder verschmelzen. Han-zeitliche Dichter versteckten Namen in Lihe-Gedichten; griechische Dichter schrieben Vers-Anagramme königlicher Namen. KI-Wörter sind Fusionskinder — das Spiel baut sich selbst neu.",
    avFusionRules:
      "Spielen: die Bedeutung ist gegeben. Klicke die Fragmente, die sich zur Prägung verschmelzen — aber manche Fragmente sind Köder, die nicht hineingehören.",
    avBuiltHint: "(Fragmente unten anklicken)",
    avSurrender: "Aufgeben → enthüllen",
    avNextRiddle: "Nächstes Rätsel →",
    avEraFlower: "Tang-China · Feihualing, das Weinspiel der Gelehrten",
    avFlowerTitle: "C · Blumenbefehl · Feihualing",
    avFlowerDesc:
      "Bei Banketten der Tang-Zeit setzte der Trinkmeister ein Zeichen fest — etwa hua, „Blume“ — und alle rechnen reihum ein Verszitat mit diesem Zeichen ab; wer zögerte, musste trinken. Heute kommt das Zeichen aus dem Wörterbuch, und die „Verse“ sind KI-geprägte Wörter.",
    avFlowerRules:
      "Spielen: ein Pflichtmorphem. In 45 Sekunden klicke jede Kachel, die es versteckt — die meisten tun es nicht. Jeder Treffer enthüllt seine Definition; am Ende werden die Verpassten umrandet.",
    avMorphRequired: "Pflichtmorphem:",
    avPickMorpheme: "Wähle oben ein Morphem, um die Runde zu starten.",
    avClickEvery: "Klicke jede Kachel, die das Morphem versteckt.",
    avWrongTile: (w: string) => `✗ ${w} — das Morphem versteckt sich hier nicht`,
    avFoundTile: (w: string, def: string) => `✓ ${w} — ${def}`,
    avPerfect: (s: number) => `Alle gefunden mit ${s}s übrig — ein perfekter Blumenbefehl! 🏮`,
    avTimeUp: (f: number, n: number) => `Zeit! Du hast ${f} / ${n} benannt.`,
    avMissed: (words: string) => `Verpasst (grün umrandet): ${words}`,
    avRestartRound: "Runde neu starten",
    avEraReverse: "Sumer ~1800 v. Chr. · Sphinx · Exeter-Buch ~1000 n. Chr.",
    avReverseTitle: "D · Umgekehrtes Rätsel — du prägst das Wort",
    avReverseDesc:
      "Das Rätsel ist das älteste Wortspiel der Menschheit: eine Bedeutung beschrieben, eine Antwort zu benennen. Diesmal bist du der Antwort-Schreiber. Mit einer Definition und ihren rohen Morphemen prägst du dein eigenes Wort — und siehst dann, was die KI tatsächlich geprägt hat.",
    avReverseRules:
      "Spielen: lies die Definition, dann präge dein Wort — klicke eine der vorgeschlagenen Prägungen unten (eine davon ist die echte Wahl der KI, aber wir verraten nicht, welche) oder tippe deine eigene Fusion. Dann vergleiche mit der Maschine.",
    avCoinagePlaceholder: "Deine Prägung…",
    avCompare: "Mit der KI vergleichen",
    avYouCoined: "Du hast geprägt",
    avAiCoined: "Die KI prägte",
    avEraChain: "Japan Shiritori · Korea Kkeutmareugi · Russland Goroda · Indien Antakshari",
    avChainTitle: "E · Wortkette · Jielong",
    avChainDesc:
      "Unabhängig auf vier Kontinenten erfunden: jedes Wort muss ans letzte anschließen — nach Endsiframe in Tokio, letztem Buchstaben in Seoul, Städtenamen in Moskau, erstem Ton eines Liedes in Delhi. Die Wörterbuch-Version verbindet über versteckte Buchstabenläufe in den Wörtern.",
    avChainRules:
      "Spielen: wähle das eine Wort, das einen versteckten Lauf von ≥5 Buchstaben mit dem aktuellen teilt. Triff es, der Lauf leuchtet auf, die Kette wächst. Drei Fehlklicks und die Kette reißt.",
    avChainWin: "Vollständige Kette — jedes Glied ein versteckter ≥5-Buchstaben-Lauf. 🔗",
    avChainSnap: (run: string) => `Kette gerissen. Der volle Lauf: ${run}`,
    avChainAgain: "Kette nochmal →",
    avMorphemeNote:
      "Fusionsrätsel, Blumenbefehl und umgekehrtes Rätsel brauchen die Etymologie jedes Eintrags (why_this_word). Sie leuchten für eine Sprache auf, sobald ihre Einträge sie tragen.",
    avFooter: "Live-Daten · Runden und Morphemfamilien serverseitig berechnet · das Sator-Quadrat ist Geschichte, keine Daten",
  },
};
