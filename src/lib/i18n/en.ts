// English dictionary — the SHAPE source: every other locale must satisfy
// `Dictionary = typeof en`, so a missing key in de/es/fr is a compile error.
// Prose strings may embed links as [[label|href]] (rendered via splitLinks).

export const en = {
  /* ---- chrome ---- */
  skipToContent: "Skip to content",
  navAria: "Main",
  navIndex: "Index",
  navPopularity: "Popularity",
  navContribute: "Contribute",
  navSeeds: "Seeds",
  navReview: "Review",
  navMyWords: "My words",
  navSources: "Sources",
  navAbout: "About",
  searchAria: "Search words and phenomena",
  searchCompact: "Search…",
  searchPlaceholder: 'Describe the phenomenon — e.g. "companies pretending to be ethical"',
  searchButton: "Search",
  footerTagline: "words for what we feel but can't name yet.",
  footerCc: "Entries planned under CC BY-SA 4.0",
  footerCriteria: "Review criteria",
  footerMethodology: "Methodology & API",
  footerAdmin: "Admin",
  langAria: "Language",
  alsoIn: "Also in",

  /* ---- metadata ---- */
  metaHomeTitle: "AI Neologism — a dictionary of words that don't exist yet",
  metaHomeDesc:
    "A curated public dictionary where AI coins new English words for emerging social phenomena, novelty is search-verified, and the community votes on adoption.",
  metaIndexTitle: "A–Z Index",
  metaPopularityTitle: "Popularity",
  metaAboutTitle: "About & Methodology",
  metaCriteriaTitle: "Review criteria",
  metaCriteriaDesc:
    "The three gates every candidate word passes before publication: a ten-point craft checklist, a three-layer novelty search, and the editorial line. Nothing is published just because an AI coined it.",

  /* ---- home ---- */
  homeHeroTitle: "Words for what we feel but can't name yet.",
  homeHeroSub:
    "AI coins new English words for emerging social phenomena. Novelty is search-verified. Humans review. The community votes on which words deserve to exist.",
  homeCoinCta: "Coin a word",
  homeBrowseCta: "Browse the A–Z index",
  homeCount: (n: number) => `${n} word${n === 1 ? "" : "s"} in the collection`,
  homeCoinHeading: "Coin with AI",
  homeCoinOther: "Other ways to contribute →",
  homeCoinDesc:
    "Paste an article or a link describing a phenomenon — the AI proposes candidate words, you refine one, the novelty check runs, and it enters the review queue.",
  homeTrending: "Trending this week",
  homeRecent: "Recently verified",
  homeAllLenses: "All popularity lenses →",
  homeEmptyPre: "No words yet — ",
  homeEmptyLink: "coin the first one",
  homeEmptyPost: ".",
  homeByCategory: "Browse by category",
  homeAz: "A–Z",
  buildingNote: "This language edition is being built — entries are being coined right now. The English original is already live.",
  buildingLink: "Browse the English dictionary →",

  /* ---- A–Z index ---- */
  indexTitle: "Index of words",
  indexSub: "Every published word, alphabetically.",
  indexEmpty: "The dictionary is still empty.",
  indexCoinFirst: "Coin the first word →",
  indexCount: (n: number) => `${n} word${n === 1 ? "" : "s"}`,

  /* ---- popularity ---- */
  popTitle: "Popularity",
  popSub: "Four lenses, so new words can still surface.",
  popEmpty: "Nothing here yet. Votes and fresh words will fill this page.",
  lensTrending: "Trending this week",
  lensTrendingBlurb: "Words gaining the most votes in the last 7 days.",
  lensEndorsed: "Most endorsed",
  lensEndorsedBlurb: "Words the most people would actually use.",
  lensContested: "Most contested",
  lensContestedBlurb: "High would-use AND needs-work — often the most interesting words.",
  lensVerified: "Recently verified",
  lensVerifiedBlurb: "The newest published words.",

  /* ---- word table ---- */
  thWord: "Word",
  thGloss: "Gloss",
  thAdded: "Added",
  thRank: "Rank",
  useAria: (n: number) => `${n} would use`,
  workAria: (n: number) => `${n} needs work`,

  /* ---- votes ---- */
  voteUse: "I'd use this word",
  voteWork: "Needs work",
  voteUseAria: (n: number) => `${n} people would use this word`,
  voteWorkAria: (n: number) => `${n} people think it needs work`,

  /* ---- word entry ---- */
  wordPending: "Only you (and reviewers) can see this page until it is published.",
  wordReviewerNotes: "Reviewer notes:",
  refLabels: { news: "News article", academic: "Academic", essay: "Essay", social: "Social post", internal: "On this site" },
  wordEtym: "Etym. —",
  wordAlso: "Also considered —",
  wordRel: "Rel. —",
  wordRefs: "Refs.",
  wordNovelty: "Novelty check:",
  wordChecked: "checked",
  wordEvidence: (n: number) => (n > 0 ? `Evidence log · ${n} closest matches` : "Evidence log"),
  thQuery: "Query",
  thChecked: "Results checked",
  thSame: "Same-sense matches",
  wordNoQueryLog: "No query log recorded.",
  wordMethod: "Method:",
  wordCoinedBy: "Coined by an anonymous contributor",
  wordAiAssisted: "AI-assisted",
  wordFirstSubmitted: "first submitted",
  wordPublishedOn: "published",
  wordRevisions: (n: number) => `Revision history (${n})`,
  wordNotFoundTitle: "Word not found",

  /* ---- about (long-form prose) ---- */
  aboutTitle: "About & methodology",
  aboutWhatH: "What this is",
  aboutWhatP1:
    "AI Neologism is a curated public dictionary for concepts that don't have names yet. AI coins candidate English words for emerging social phenomena, novelty is verified by web search before publication, human reviewers gate every entry, and the community votes on adoption — whether people would actually use the word.",
  aboutWhatP2:
    'Wikipedia verifies "notability". We verify "novelty". Every entry carries dated evidence of the searches that showed the word did not exist — and if the word later spreads, the entry graduates to "now in real use."',
  aboutPipelineH: "The pipeline",
  aboutPipeline: [
    "Provide material — paste text or a link to a news article or essay.",
    "The AI, grounded in the source shelf below, proposes 3–5 candidate words.",
    'You pick one and refine it; runners-up are recorded as "alternatives considered."',
    "The site runs a novelty web search (quoted exact matches, variants, dictionary checks) and attaches the evidence log.",
    "A human reviewer checks: evidence plausible · not a duplicate · definition readable · references real.",
    "Published — and re-verified every 6–12 months.",
  ],
  aboutCraftH: "Craft rules for coinage",
  aboutCraft: [
    "Pronounceable, preferably ≤ 4 syllables.",
    "Built from productive English patterns: compounds, blends, -washing, -ism, -phobia, e-, cyber-, micro-.",
    "Never a brand or trademark name.",
    "Etymology rationale always stated.",
    "Must name a real, identifiable phenomenon.",
    "AI-coined words always propose an IPA pronunciation, and place themselves among related entries where meaningful relations exist.",
  ],
  aboutCraftNote: "The full bar — all three gates, including the fusion rule — is on the [[review criteria page|/criteria]].",
  aboutShelfH: "Source shelf",
  aboutShelfIntro: "The named-concept canon the AI studies before coining — a growing list:",
  aboutBadgesH: "Badges",
  aboutBadges: [
    { name: "Verified New", text: "search evidence supports that the word (with this meaning) is new." },
    { name: "Word exists · sense is new", text: "the word form exists, but not with this meaning (published with caveat)." },
    { name: "Unverified", text: "novelty evidence is missing or incomplete." },
    { name: "Name collision", text: "the word already exists with this meaning; blocked from publication." },
    { name: "Now in real use", text: "re-verification detected the word spreading. Graduation, not failure." },
  ],
  aboutLadderH: "Participation ladder",
  aboutLadder: [
    {
      name: "Anyone",
      text: "reads, searches, and votes (rate-limited; no account needed).",
    },
    {
      name: "Anyone",
      text: "can coin — a secret contribution key is issued at your first submission. No name, no email. It links your words, blocks you from reviewing yourself, and earns review rights after 3 accepted words.",
    },
    {
      name: "Earned reviewers",
      text: "gate publication. One reviewer is enough; every decision needs a public one-line reason.",
    },
  ],
  aboutLadderNote:
    'Ideas over identities: entries are always attributed to "an anonymous contributor," with an AI-assisted flag where applicable. Lost key = lost standing; keep it safe.',
  aboutApiH: "API",
  aboutApiP:
    "The whole collection is programmable — the same structured schema the word pages render. The full API reference lives on the [[contribute page|/contribute]] under Via API, alongside the other ways to contribute.",
  aboutLicenseH: "Licensing & credits",
  aboutLicenseP:
    "Entries are planned to live under CC BY-SA 4.0 (final decision pending). Inspired by the craft of concept-namers everywhere, and by the W3C Neologism project's pattern of one schema for humans and machines alike.",
  aboutCoinCta: "Coin a word →",

  /* ---- criteria (long-form prose) ---- */
  criteriaTitle: "The bar every word passes",
  critIntro:
    "Nothing lands in this dictionary just because a machine coined it. Every candidate — human-submitted or AI-coined — faces the same three gates, in order, before publication. This page is the public statement of that bar.",
  critGate1H: "Gate 1 — the craft checklist",
  critGate1Intro: "All ten must hold before any search even runs:",
  critGate1: [
    { lead: "Names a real phenomenon", text: "— an observable, describable social pattern. Not a joke, not a private in-joke." },
    { lead: "Pronounceable", text: "— a reader who sees it can say it." },
    { lead: "Short", text: "— preferably four syllables or fewer." },
    {
      lead: "Real word-formation",
      text: "— built from productive English patterns: compounds, clean blends, live affixes (-washing, -flation, -creep, micro-). The morpheme boundaries must be real: the word parses.",
    },
    { lead: "The fusion must do work", text: "— see below." },
    { lead: "Never a brand or trademark.", text: "" },
    { lead: "Etymology stated", text: "— the roots and why they fit, on every entry." },
    {
      lead: "Machine-coined entries carry more, not less",
      text: "— a proposed IPA pronunciation, related-entry placement (empty by judgment, never by omission), and pre-selected categories.",
    },
  ],
  critRule5:
    'Rule 5 is the one that kills the most candidates. If two words already form a natural, everyday phrase — and the coinage means exactly what that phrase means — we don\'t publish it. Fusing "mile marker" into "milemarker" adds nothing: that is respelling, not naming. A fusion earns its place only when the phrase doesn\'t already exist, the meaning is more than the sum of its parts, or the form itself is transformed — clipped, blended across boundaries, shifted in grammar.',
  critGate2H: "Gate 2 — the novelty search",
  critGate2Intro: "Three layers, because exact-string search alone misses most collisions:",
  critGate2: [
    {
      lead: "The exact form",
      text: '— quoted searches for the word alone, plus "meaning" and "definition" phrasings, plus dictionary checks.',
    },
    {
      lead: "The source language",
      text: "— a word built on foreign roots is searched in its own language and its standard English translation, not just the fused English spelling.",
    },
    {
      lead: "The split phrase",
      text: '— every compound is searched unfused, because "run club" doesn\'t stop existing because someone spelled it "runclub".',
    },
  ],
  critGate2Note:
    'No search engine proves a negative, so our claim is always dated and scoped: "no usage with this meaning was found in the queried indexes, on the checked date" — and the evidence is published with the entry. A result only counts against a candidate when it means what the candidate means; finding the form in an unrelated sense does not fail it.',
  critGate3H: "Gate 3 — distinctness and the editorial line",
  critGate3: [
    {
      lead: "",
      text: 'An established word, a "named trend", or a living brand already owning the concept or its neighborhood blocks the coinage — even when the exact string is free.',
    },
    {
      lead: "",
      text: "Words here target systems, institutions and practices — never an ethnic, religious, or other group of people. No conspiracy narratives. An entry that crosses this line is rejected regardless of novelty.",
    },
  ],
  critVerdictsH: "What happens to a verdict",
  critVerdicts: [
    { lead: "Approved", text: "— published with its verification badge (the badge meanings are on the [[about page|/about]])." },
    {
      lead: "Revise",
      text: "— the phenomenon is real and unnamed but the form collides or does no work: the form is reworked, not the idea.",
    },
    { lead: "Rejected", text: "— never inserted, with the evidence that drove the decision kept on record." },
  ],
  critVerdictNote:
    "Every non-approval carries the evidence that drove it, with the search engine and date named. Raw result counts are never the verdict — the question is always whether anyone already uses this meaning, under any spelling.",
  critPracticeH: "See it in practice",
  critPractice:
    "The pipeline, the badges and the participation ladder are on the [[about page|/about]]. Think you've spotted a phenomenon with no name? [[Coin a word →|/contribute]]",
};

export type Dictionary = typeof en;
