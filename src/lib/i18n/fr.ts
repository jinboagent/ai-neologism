import type { Dictionary } from "./en";

export const fr: Dictionary = {
  /* ---- Chrome ---- */
  skipToContent: "Aller au contenu",
  navAria: "Navigation principale",
  navIndex: "Index",
  navPopularity: "Popularité",
  navContribute: "Contribuer",
  navSeeds: "Pépinière",
  navReview: "Révision",
  navMyWords: "Mes mots",
  navSources: "Sources",
  navAbout: "À propos",
  searchAria: "Rechercher des mots et des phénomènes",
  searchCompact: "Rechercher…",
  searchPlaceholder: "Décris le phénomène — p. ex. « des entreprises qui se prétendent éthiques »",
  searchButton: "Rechercher",
  footerTagline: "des mots pour ce que nous ressentons mais ne savons pas encore nommer.",
  footerCc: "Entrées prévues sous licence CC BY-SA 4.0",
  footerCriteria: "Critères de révision",
  footerMethodology: "Méthodologie et API",
  footerAdmin: "Admin",
  langAria: "Langue",
  alsoIn: "Aussi en",

  /* ---- Métadonnées ---- */
  metaHomeTitle: "AI Neologism — un dictionnaire de mots qui n'existent pas encore",
  metaHomeDesc:
    "Un dictionnaire public et curaté : l'IA forge des mots nouveaux pour des phénomènes sociaux émergents, la nouveauté est vérifiée par recherche web, et la communauté vote de l'adoption.",
  metaIndexTitle: "Index A–Z",
  metaPopularityTitle: "Popularité",
  metaAboutTitle: "À propos et méthodologie",
  metaCriteriaTitle: "Critères de révision",
  metaCriteriaDesc:
    "Les trois portes que tout mot candidat franchit avant publication : une liste artisanale de dix points, une recherche de nouveauté en trois couches et la ligne éditoriale. Rien n'est publié simplement parce qu'une IA l'a forgé.",

  /* ---- Accueil ---- */
  homeHeroTitle: "Des mots pour ce que nous ressentons mais ne savons pas encore nommer.",
  homeHeroSub:
    "L'IA forge des mots nouveaux pour des phénomènes sociaux émergents. La nouveauté est vérifiée par recherche web. Des humains révisent. La communauté vote des mots qui méritent d'exister.",
  homeCoinCta: "Forger un mot",
  homeBrowseCta: "Parcourir l'index A–Z",
  homeCount: (n) => `${n} mot${n === 1 ? "" : "s"} dans la collection`,
  homeCoinHeading: "Forger avec l'IA",
  homeCoinOther: "Autres façons de contribuer →",
  homeCoinDesc:
    "Colle un article ou un lien décrivant un phénomène — l'IA propose des mots candidats, tu en affine un, la vérification de nouveauté tourne, et l'entrée rejoint la file de révision.",
  homeTrending: "Tendance cette semaine",
  homeRecent: "Vérifiés récemment",
  homeAllLenses: "Toutes les lentilles de popularité →",
  homeEmptyPre: "Pas encore de mots — ",
  homeEmptyLink: "forge le premier",
  homeEmptyPost: ".",
  homeByCategory: "Parcourir par catégorie",
  homeAz: "A–Z",
  buildingNote: "Cette édition linguistique est en construction — des entrées sont forgées en ce moment. L'original anglais est déjà en ligne.",
  buildingLink: "Voir le dictionnaire anglais →",

  /* ---- Index A–Z ---- */
  indexTitle: "Index des mots",
  indexSub: "Tous les mots publiés, par ordre alphabétique.",
  indexEmpty: "Le dictionnaire est encore vide.",
  indexCoinFirst: "Forge le premier mot →",
  indexCount: (n) => `${n} mot${n === 1 ? "" : "s"}`,

  /* ---- Popularité ---- */
  popTitle: "Popularité",
  popSub: "Quatre lentilles, pour que les mots nouveaux puissent encore émerger.",
  popEmpty: "Rien ici pour l'instant. Les votes et les mots frais rempliront cette page.",
  lensTrending: "Tendance cette semaine",
  lensTrendingBlurb: "Les mots qui gagnent le plus de voix depuis 7 jours.",
  lensEndorsed: "Les plus approuvés",
  lensEndorsedBlurb: "Les mots que le plus de gens utiliseraient vraiment.",
  lensContested: "Les plus disputés",
  lensContestedBlurb: "À la fois « je l'utiliserais » ET « à retravailler » — souvent les plus intéressants.",
  lensVerified: "Vérifiés récemment",
  lensVerifiedBlurb: "Les mots publiés les plus récents.",

  /* ---- Tableau de mots ---- */
  thWord: "Mot",
  thGloss: "Acception",
  thAdded: "Ajouté",
  thRank: "Rang",
  useAria: (n) => `${n} l'utiliseraient`,
  workAria: (n) => `${n} signalent du travail`,

  /* ---- Votes ---- */
  voteUse: "J'utiliserais ce mot",
  voteWork: "À retravailler",
  voteUseAria: (n) => `${n} personnes utiliseraient ce mot`,
  voteWorkAria: (n) => `${n} personnes estiment qu'il faut le retravailler`,

  /* ---- Entrée de mot ---- */
  wordPending: "Toi seul (et les réviseurs) peux voir cette page tant qu'elle n'est pas publiée.",
  wordReviewerNotes: "Notes de la révision :",
  refLabels: { news: "Article de presse", academic: "Académique", essay: "Essai", social: "Publication sociale", internal: "Sur ce site" },
  wordEtym: "Étym. —",
  wordAlso: "Aussi envisagés —",
  wordRel: "Apparentés —",
  wordRefs: "Réf.",
  wordNovelty: "Vérification de nouveauté :",
  wordChecked: "vérifié",
  wordEvidence: (n) => (n > 0 ? `Journal de preuves · ${n} correspondances les plus proches` : "Journal de preuves"),
  thQuery: "Requête",
  thChecked: "Résultats examinés",
  thSame: "Correspondances de même sens",
  wordNoQueryLog: "Aucun journal de requêtes enregistré.",
  wordMethod: "Méthode :",
  wordCoinedBy: "Forgé par une personne anonyme",
  wordAiAssisted: "Assisté par IA",
  wordFirstSubmitted: "soumis pour la première fois",
  wordPublishedOn: "publié",
  wordRevisions: (n) => `Historique des révisions (${n})`,
  wordNotFoundTitle: "Mot introuvable",

  /* ---- À propos (texte long) ---- */
  aboutTitle: "À propos et méthodologie",
  aboutWhatH: "Ce que c'est",
  aboutWhatP1:
    "AI Neologism est un dictionnaire public et curaté pour les concepts qui n'ont pas encore de nom. L'IA forge des mots candidats pour des phénomènes sociaux émergents, la nouveauté est vérifiée par recherche web avant publication, des réviseurs humains filtrent chaque entrée, et la communauté vote l'adoption — si les gens utiliseraient vraiment le mot.",
  aboutWhatP2:
    "Wikipédia vérifie la « notoriété ». Nous vérifions la « nouveauté ». Chaque entrée porte des preuves datées des recherches qui ont montré que le mot n'existait pas — et si le mot se diffuse plus tard, il est promu « désormais en usage réel ».",
  aboutPipelineH: "La chaîne de fabrication",
  aboutPipeline: [
    "Tu fournis la matière — colle un texte ou un lien vers un article ou un essai.",
    "L'IA, ancrée dans l'étagère à sources ci-dessous, propose 3 à 5 mots candidats.",
    "Tu en choisis un et l'affines ; les finalistes sont consignés comme « aussi envisagés ».",
    "Le site lance une recherche de nouveauté (correspondances exactes entre guillemets, variantes, contrôles en dictionnaire) et joint le journal de preuves.",
    "Un réviseur humain contrôle : preuves plausibles · pas de doublon · définition lisible · références réelles.",
    "Publié — et revérifié tous les 6 à 12 mois.",
  ],
  aboutCraftH: "Règles d'artisanat pour forger",
  aboutCraft: [
    "Prononçable, si possible ≤ 4 syllabes.",
    "Construit à partir de motifs productifs de la langue : composés, fusions propres, affixes vivants.",
    "Jamais un nom de marque ou de déposant.",
    "La justification étymologique toujours donnée.",
    "Doit nommer un phénomène réel et identifiable.",
    "Les mots forgés par l'IA proposent toujours une prononciation IPA et se placent parmi les entrées apparentées quand des relations ont du sens.",
  ],
  aboutCraftNote: "La barre complète — les trois portes, règle de fusion incluse — est sur la [[page des critères|/criteria]].",
  aboutShelfH: "L'étagère à sources",
  aboutShelfIntro: "Le canon des concepts nommés que l'IA étudie avant de forger — une liste qui grandit :",
  aboutBadgesH: "Badge",
  aboutBadges: [
    { name: "Vérifié nouveau", text: "les preuves de recherche soutiennent que le mot (avec ce sens) est nouveau." },
    { name: "Le mot existe · le sens est nouveau", text: "la forme existe, mais pas avec ce sens (publié avec réserve)." },
    { name: "Non vérifié", text: "les preuves de nouveauté manquent ou sont incomplètes." },
    { name: "Collision de nom", text: "le mot existe déjà avec ce sens ; bloqué pour publication." },
    { name: "Désormais en usage réel", text: "la revérification a détecté la diffusion du mot. Une promotion, pas un échec." },
  ],
  aboutLadderH: "Échelle de participation",
  aboutLadder: [
    { name: "Tout le monde", text: "lit, cherche et vote (limité en fréquence ; pas de compte requis)." },
    {
      name: "Tout le monde",
      text: "peut forger — une clé de contribution secrète est émise à ta première soumission. Pas de nom, pas d'e-mail. Elle relie tes mots, t'empêche de te réviser toi-même et t'octroie des droits de révision après 3 mots acceptés.",
    },
    {
      name: "Réviseurs gagnés",
      text: "filtrent la publication. Un seul réviseur suffit ; chaque décision exige une raison publique d'une ligne.",
    },
  ],
  aboutLadderNote:
    "Les idées avant les identités : les entrées sont toujours attribuées à « une personne anonyme », avec mention d'assistance IA le cas échéant. Clé perdue = statut perdu ; garde-la précieusement.",
  aboutApiH: "API",
  aboutApiP:
    "Toute la collection est programmable — le même schéma structuré que rendent les pages de mots. La référence API complète se trouve sur la [[page de contribution|/contribute]], sous Via API, à côté des autres façons de contribuer.",
  aboutLicenseH: "Licence et crédits",
  aboutLicenseP:
    "Les entrées sont prévues sous licence CC BY-SA 4.0 (décision finale à venir). Inspiré par l'artisanat des nommeurs de concepts partout ailleurs, et par le schéma du projet Neologism du W3C : un seul modèle pour les humains et les machines.",
  aboutCoinCta: "Forger un mot →",

  /* ---- Critères (texte long) ---- */
  criteriaTitle: "La barre que chaque mot franchit",
  critIntro:
    "Rien n'entre dans ce dictionnaire simplement parce qu'une machine l'a forgé. Tout candidat — soumis par un humain ou forgé par l'IA — affronte les mêmes trois portes, dans l'ordre, avant publication. Cette page est la déclaration publique de cette barre.",
  critGate1H: "Porte 1 — la liste artisanale",
  critGate1Intro: "Les dix points doivent tenir avant même qu'une recherche ne tourne :",
  critGate1: [
    { lead: "Nomme un phénomène réel", text: "— un motif social observable et descriptible. Pas une blague, pas une blague privée." },
    { lead: "Prononçable", text: "— qui le voit peut le dire." },
    { lead: "Court", text: "— de préférence quatre syllabes ou moins." },
    {
      lead: "Formation de mot réelle",
      text: "— construit à partir de motifs productifs de la langue : composés, fusions propres, affixes vivants. Les frontières des morphèmes doivent être réelles : le mot se décompose.",
    },
    { lead: "La fusion doit travailler", text: "— voir plus bas." },
    { lead: "Jamais une marque ou un déposant.", text: "" },
    { lead: "Étymologie donnée", text: "— les racines et pourquoi elles conviennent, sur chaque entrée." },
    {
      lead: "Les entrées forgées par l'IA portent plus, pas moins",
      text: "— une prononciation IPA proposée, un placement parmi les entrées apparentées (vide par jugement, jamais par omission), et des catégories présélectionnées.",
    },
  ],
  critRule5:
    "La règle 5 est celle qui élimine le plus de candidats. Si deux mots forment déjà une phrase naturelle et quotidienne — et que la forge signifie exactement ce que signifie cette phrase — nous ne la publions pas. Fusionner « mile marker » en « milemarker » n'apporte rien : c'est de la réécriture, pas du nommage. Une fusion gagne sa place seulement quand la phrase n'existe pas encore, que le sens dépasse la somme des parties, ou que la forme elle-même est transformée — tronquée, fondée par-delà les frontières, déplacée dans la grammaire.",
  critGate2H: "Porte 2 — la recherche de nouveauté",
  critGate2Intro: "Trois couches, car la recherche de chaîne exacte à elle seule rate la plupart des collisions :",
  critGate2: [
    {
      lead: "La forme exacte",
      text: "— recherches entre guillemets du mot seul, plus les formulations « sens » et « définition », plus les contrôles en dictionnaire.",
    },
    {
      lead: "La langue source",
      text: "— un mot bâti sur des racines étrangères est recherché dans sa propre langue et dans sa traduction anglaise standard, pas seulement dans l'orthographe fusionnée.",
    },
    {
      lead: "La phrase séparée",
      text: "— chaque composé est aussi recherché non fusionné, car « run club » ne cesse pas d'exister parce que quelqu'un l'a écrit « runclub ».",
    },
  ],
  critGate2Note:
    "Aucun moteur de recherche ne prouve un négatif, donc notre affirmation est toujours datée et délimitée : « aucun usage avec ce sens n'a été trouvé dans les index interrogés, à la date du contrôle » — et les preuves sont publiées avec l'entrée. Un résultat ne compte contre un candidat que s'il signifie ce que le candidat signifie ; trouver la forme dans un sens étranger ne le fait pas échouer.",
  critGate3H: "Porte 3 — distinction et ligne éditoriale",
  critGate3: [
    {
      lead: "",
      text: "Un mot établi, une « tendance nommée », ou une marque vivante qui possède déjà le concept ou son voisinage bloque la forge — même quand la chaîne exacte est libre.",
    },
    {
      lead: "",
      text: "Les mots d'ici visent des systèmes, des institutions et des pratiques — jamais un groupe ethnique, religieux ou autre groupe de personnes. Pas de récits complotistes. Une entrée qui franchit cette ligne est rejetée quelle que soit sa nouveauté.",
    },
  ],
  critVerdictsH: "Ce que devient un verdict",
  critVerdicts: [
    { lead: "Approuvé", text: "— publié avec son badge de vérification (les significations des badges sont sur la [[page à propos|/about]])." },
    {
      lead: "À réviser",
      text: "— le phénomène est réel et sans nom mais la forme entre en collision ou ne travaille pas : c'est la forme qu'on refait, pas l'idée.",
    },
    { lead: "Rejeté", text: "— jamais inséré, avec les preuves qui ont motivé la décision conservées au dossier." },
  ],
  critVerdictNote:
    "Chaque non-approbation porte les preuves qui l'ont motivée, moteur de recherche et date nommés. Les comptes bruts de résultats ne sont jamais le verdict — la question est toujours de savoir si quelqu'un utilise déjà ce sens, sous quelque orthographe que ce soit.",
  critPracticeH: "Le voir en pratique",
  critPractice:
    "La chaîne, les badges et l'échelle de participation sont sur la [[page à propos|/about]]. Tu crois avoir repéré un phénomène sans nom ? [[Forge un mot →|/contribute]]",
};
