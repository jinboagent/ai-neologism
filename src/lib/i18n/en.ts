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

  /* ---- games ---- */
  navGames: "Games",
  metaGamesTitle: "Games — play with AI-coined words",
  metaGamesDesc:
    "Five word games computed live from the published lexicon: guess the meaning, spot the fake definition, sort the categories, climb the semantic ladder, and replay five ancient mechanics.",
  metaMeaningRevealTitle: "What does it mean? — the daily guessing game",
  metaMeaningRevealDesc:
    "One AI-coined word at a time. Peek at the morphemes, guess the meaning in your own words, click to reveal the real definition and the coining reason.",
  metaRealOrFakeTitle: "Real or Fake? — the definition game",
  metaRealOrFakeDesc:
    "Four definitions of one AI-coined word — one real, three decoys borrowed from other real entries. Can you spot the truth?",
  metaCategorySortTitle: "Sort the Lexicon — the category game",
  metaCategorySortDesc:
    "Sixteen freshly coined words, four hidden categories, four lives. A Connections-style board rebuilt from the lexicon's real categories on every load.",
  metaSemanticLadderTitle: "Warm or Cold? — the semantic ladder",
  metaSemanticLadderDesc:
    "A hidden AI-coined word, a bank of everyday words, closeness scores from 0 to 100. Climb the ladder by meaning alone.",
  metaAncientVaultTitle: "The Antiquarium — ancient word games, new fuel",
  metaAncientVaultDesc:
    "The Pompeii Sator Square, Lihe fusion riddles, the Tang Feihualing, reverse riddles and word chains — five ancient mechanics replayed with words that didn't exist three years ago.",
  games: {
    backToGames: "← All games",
    hubTitle: "Play with AI-coined words",
    hubSub:
      "Five games computed live from the published lexicon — every round is generated fresh from real entries, and the Daily Word is the same for everyone.",
    statWords: (n: number) => `${n} words`,
    statFamilies: (n: number) => `${n} morpheme families`,
    statCategories: (n: number) => `${n} categories`,
    statDaily: "☀️ one Daily Word",
    howToPlay: "How to play",
    unavailable: "This game doesn't have enough published words in this language yet.",
    playCta: "Play →",
    enterVaultCta: "Enter the vault →",
    allGames: "All games →",

    cardMeaningTitle: "What does it mean?",
    cardMeaningDesc:
      "The core daily loop: today's Daily Word first, then random practice. Look at the morphemes, guess the meaning in your own words, click to reveal.",
    cardMeaningOrigin: "Origin: your idea — the core daily loop",
    cardRealOrFakeTitle: "Real or Fake?",
    cardRealOrFakeDesc:
      "Four definitions, one true — the decoys are definitions of other real words from the lexicon.",
    cardRealOrFakeOrigin: "Origin: Balderdash / Fictionary, remixed solo",
    cardCategoryTitle: "Sort the Lexicon",
    cardCategoryDesc:
      "Sixteen words, four real categories, four lives. The board rebuilds itself on every load — no two visits are the same.",
    cardCategoryOrigin: "Origin: NYT Connections, lexicon edition",
    cardSemanticTitle: "Warm or Cold?",
    cardSemanticDesc:
      "Climb a semantic similarity ladder to a hidden word. Demo board with simulated scores — the real version needs word embeddings.",
    cardSemanticOrigin: "Origin: Semantle / Contexto, word2vec edition",
    cardVaultTitle: "The Antiquarium",
    cardVaultDesc:
      "Five ancient mechanics on fresh fuel: the Pompeii Sator Square, Lihe fusion riddles, the Tang Feihualing, reverse riddles, and the word chain — rounds computed live.",
    cardVaultOrigin: "Origin: 2,000 years of word games · Rome · Han · Tang · England · Japan/Korea",

    /* meaning reveal */
    mrIntro:
      "The core daily loop. The first word is ☀️ today's Daily Word — the same for every player. Nobody has seen these coinages before. Guess what one must mean, then click to reveal.",
    mrRules: [
      "Read the word. It's real, it's published, and it's brand new.",
      "Peek at the morphemes (the two old words fused inside) — that's your only clue.",
      "Write your guess in your own words, or just hold one in your head.",
      "Click “Reveal the meaning.” The real definition and the coining reason appear.",
      "Score yourself honestly: 🎯 nailed it · ≈ warm · 🤷 no idea.",
      "☀️ The first word is today's Daily Word (same for everyone); “Next word” deals random practice.",
    ],
    mrShowHint: "👀 Show morpheme hint",
    mrHideHint: "🙈 Hide morpheme hint",
    mrGuessPlaceholder: "Your guess, in your own words (optional but fun to compare after revealing)…",
    mrReveal: "Reveal the meaning",
    mrRevealedHeading: "✓ The real meaning",
    mrHowClose: "How close were you?",
    mrNailed: "🎯 Nailed it",
    mrWarm: "≈ Warm",
    mrNoIdea: "🤷 No idea",
    mrScored: (emoji: string) => `Noted: ${emoji} — streaks and share cards are coming.`,
    mrNext: "Next word →",
    mrFooter: "Live data · first word = today's Daily Word",

    /* real or fake */
    rofIntro:
      "Four definitions of one AI-coined word. One is the real published definition — the other three are decoys: definitions of other real words from the lexicon (the planned upgrade is decoys from the AI's own rejected candidate definitions).",
    rofRules: [
      "One word appears with four definitions, A–D.",
      "One is real — the definition published in the lexicon.",
      "Three are decoys. Classic Balderdash had humans invent fakes; v0 borrows definitions of other real lexicon words.",
      "Pick one. Right: the word joins your streak. Wrong: you see why the real one won.",
      "In production: a daily five-round set, streaks, and a shareable result grid.",
    ],
    rofRound: (i: number, n: number) => `Round ${i} / ${n}`,
    rofCorrect: (n: number) => `Correct: ${n}`,
    rofNext: "Next round →",
    rofSeeResult: "See result →",
    rofCalledIt: "you called it.",
    rofGotYou: "the decoy got you.",
    rofEnd: (c: number, n: number) =>
      `Demo bank finished — ${c}/${n} correct. 🎯 In production: a fresh daily five, streaks, and a shareable grid.`,
    rofFooter: "Live data · decoys = definitions of other real words (v0)",

    /* category sort */
    csIntro:
      "Sixteen freshly coined words. Four hidden categories, four words each. The categories are the real ones the lexicon itself uses — find the families.",
    csRules: [
      "Select 4 words you believe share a category, then hit Submit.",
      "Correct → the family locks in. Wrong → you lose one of four lives.",
      "The trap: several words could plausibly sit in two groups — the lexicon's real categories keep it honest.",
      "The board rebuilds itself on every page load.",
    ],
    csSelected: (n: number) => `${n} selected`,
    csSubmit: "Submit",
    csClear: "Clear",
    csPlayAgain: "Play again",
    csLocked: (name: string) => `✓ ${name} locked in.`,
    csWrong: "✗ Not a family — one life gone.",
    csPerfect: "Perfect sort! 🧩",
    csOutOfLives: (names: string) => `Out of lives. The remaining families: ${names}`,
    csFooter: "Live data · board auto-built from the lexicon's real categories — fresh every load",

    /* semantic ladder */
    slIntro:
      "A hidden AI-coined word. Click words from the bank — or type your own — and get a semantic closeness score from 0 to 100. Climb the ladder by meaning alone. No spelling involved, which is exactly how new words work.",
    slRules: [
      "A word is hidden. It's real and published — you just don't know which one.",
      "Click a word from the bank (or type your own). 100 = semantically identical, 0 = unrelated.",
      "Warm up: the ladder sorts your guesses; follow the heat toward the hidden concept.",
      "Reveal unlocks after 3 guesses — earn it or give up, both show the truth.",
      "This demo simulates the scores — the real version needs word embeddings.",
    ],
    slHiddenPrefix: "The hidden word is ",
    slLetters: (n: number) => `????? (${n} letters)`,
    slInputPlaceholder: "Optional: type a word and press Enter…",
    slGuess: "Guess",
    slRevealLocked: "Reveal (needs 3 guesses)",
    slRevealReady: "Reveal the word",
    slNext: "Next hidden word →",
    whyPrefix: "Why AI coined it: ",
    slFooter: "Demo board · words from the real lexicon, scores simulated (embeddings pending)",

    /* antiquarium */
    avIntro:
      "Five game mechanics, thousands of years old, replayed with words that didn't exist three years ago. Every mechanic below was independently invented by multiple civilizations — the lexicon just gives them new fuel.",
    avEraSator: "Pompeii, before AD 79 · the oldest surviving word puzzle",
    avSatorTitle: "A · The Square of Five Words",
    avSatorDesc:
      "A five-by-five Latin palindrome scratched on Pompeii's walls, found from Rome to Syria: SATOR · AREPO · TENET · OPERA · ROTAS. It reads the same across rows and columns, forwards and backwards — the Roman Empire's favorite meme.",
    avSatorRules:
      "Explore: tap a direction. Every direction reads five valid words. Rows and columns are identical — that's the trick, and nobody knows why it was made.",
    avRows: "→ Rows",
    avCols: "↓ Columns",
    avRowsRev: "← Rows reversed",
    avColsRev: "↑ Columns reversed",
    avSatorHist: "~2,000 years old · and still unsolved: “Arepo” appears nowhere else in all of Latin literature.",
    avEraFusion: "Greece ~300 BC (Lycophron's anagrams) · Han China ~AD 200 (Kong Rong's Lihe poems)",
    avFusionTitle: "B · Fusion Riddle · Lihe",
    avFusionDesc:
      "The oldest word-building game: break a name or word into fragments and fuse them back. Han-dynasty poets hid names in Lihe poems; Greek poets wrote verse-anagrams of royal names. AI-coined words are fusions by birth — so the game rebuilds itself.",
    avFusionRules:
      "Play: the meaning is given. Click the fragments that fuse into the coinage — but some of the fragments are decoys that don't belong.",
    avBuiltHint: "(click fragments below)",
    avSurrender: "Surrender → reveal",
    avNextRiddle: "Next riddle →",
    avEraFlower: "Tang China · Feihualing, the scholars' wine game",
    avFlowerTitle: "C · Flower Order · Feihualing",
    avFlowerDesc:
      "At Tang-dynasty banquets, the drink-master fixed one character — say hua, “flower” — and everyone took turns reciting a verse containing it; hesitate and you drink. Today the character comes from the lexicon, and the “verses” are AI-coined words.",
    avFlowerRules:
      "Play: one required morpheme. In 45 seconds, click every tile on the board that hides it — most tiles don't. Each hit reveals its definition; at the end, the ones you missed are outlined.",
    avMorphRequired: "Morpheme required:",
    avPickMorpheme: "Pick a morpheme above to start the round.",
    avClickEvery: "Click every tile that hides the morpheme.",
    avWrongTile: (w: string) => `✗ ${w} — the morpheme is not hiding in this one`,
    avFoundTile: (w: string, def: string) => `✓ ${w} — ${def}`,
    avPerfect: (s: number) => `All found with ${s}s to spare — a perfect flower order! 🏮`,
    avTimeUp: (f: number, n: number) => `Time! You named ${f} / ${n}.`,
    avMissed: (words: string) => `Missed (outlined green): ${words}`,
    avRestartRound: "Restart round",
    avEraReverse: "Sumer ~1800 BC · Sphinx · Exeter Book ~AD 1000",
    avReverseTitle: "D · Reverse Riddle — you coin the word",
    avReverseDesc:
      "The riddle is humanity's oldest word game: a meaning described, an answer to be named. This time you are the answer-writer. Given a definition and its raw morphemes, coin your own word — then see what the AI actually coined.",
    avReverseRules:
      "Play: read the definition, then coin your word — click one of the suggested coinages below (one of them is the AI's actual choice, but we're not telling which) or type your own fusion. Then compare with the machine.",
    avCoinagePlaceholder: "Your coinage…",
    avCompare: "Compare with AI",
    avYouCoined: "You coined",
    avAiCoined: "AI coined",
    avEraChain: "Japan Shiritori · Korea Kkeutmareugi · Russia Goroda · India Antakshari",
    avChainTitle: "E · Word Chain · Jielong",
    avChainDesc:
      "Independently invented on four continents: each word must connect to the last — by final syllable in Tokyo, last letter in Seoul, city name in Moscow, first sound of a song in Delhi. The lexicon version connects by hidden letter-runs buried inside the words.",
    avChainRules:
      "Play: pick the one word that shares a hidden run of ≥5 letters with the current word. Find it, the run lights up, the chain grows. Three wrong picks and the chain snaps.",
    avChainWin: "Complete chain — every link a hidden ≥5-letter run. 🔗",
    avChainSnap: (run: string) => `Chain snapped. The full run: ${run}`,
    avChainAgain: "Chain again →",
    avMorphemeNote:
      "The fusion riddle, flower order and reverse riddle need each entry's etymology (why_this_word). They light up for a language as soon as its entries carry it.",
    avFooter: "Live data · rounds and morpheme families computed server-side · the Sator square is history, not data",
  },
};

export type Dictionary = typeof en;
