import type { Dictionary } from "./en";

export const es: Dictionary = {
  /* ---- Chrome ---- */
  skipToContent: "Ir al contenido",
  navAria: "Navegación principal",
  navIndex: "Índice",
  navPopularity: "Popularidad",
  navContribute: "Contribuir",
  navSeeds: "Hallazgos",
  navReview: "Revisión",
  navMyWords: "Mis palabras",
  navSources: "Fuentes",
  navAbout: "Acerca de",
  searchAria: "Buscar palabras y fenómenos",
  searchCompact: "Buscar…",
  searchPlaceholder: "Describe el fenómeno — p. ej. «empresas que aparentan ser éticas»",
  searchButton: "Buscar",
  footerTagline: "palabras para lo que sentimos pero aún no sabemos nombrar.",
  footerCc: "Entradas previstas bajo CC BY-SA 4.0",
  footerCriteria: "Criterios de revisión",
  footerMethodology: "Metodología y API",
  footerAdmin: "Admin",
  langAria: "Idioma",
  alsoIn: "También en",

  /* ---- Metadatos ---- */
  metaHomeTitle: "AI Neologism — un diccionario de palabras que aún no existen",
  metaHomeDesc:
    "Un diccionario público y curado: la IA acuña palabras nuevas para fenómenos sociales emergentes, la novedad se verifica mediante búsqueda web y la comunidad vota qué palabras merecen existir.",
  metaIndexTitle: "Índice A–Z",
  metaPopularityTitle: "Popularidad",
  metaAboutTitle: "Acerca de y metodología",
  metaCriteriaTitle: "Criterios de revisión",
  metaCriteriaDesc:
    "Las tres puertas que toda palabra candidata atraviesa antes de publicarse: una lista artesanal de diez puntos, una búsqueda de novedad en tres capas y la línea editorial. Nada se publica solo porque una IA lo acuñó.",

  /* ---- Portada ---- */
  homeHeroTitle: "Palabras para lo que sentimos pero aún no sabemos nombrar.",
  homeHeroSub:
    "La IA acuña palabras nuevas para fenómenos sociales emergentes. La novedad se verifica con búsquedas web. Humanos revisan. La comunidad vota qué palabras merecen existir.",
  homeCoinCta: "Acuñar una palabra",
  homeBrowseCta: "Explorar el índice A–Z",
  homeCount: (n) => `${n} ${n === 1 ? "palabra" : "palabras"} en la colección`,
  homeCoinHeading: "Acuñar con IA",
  homeCoinOther: "Otras formas de contribuir →",
  homeCoinDesc:
    "Pega un artículo o un enlace que describa un fenómeno — la IA propone palabras candidatas, tú afinas una, corre la verificación de novedad y entra en la cola de revisión.",
  homeTrending: "Tendencia de la semana",
  homeRecent: "Verificadas recientemente",
  homeAllLenses: "Todas las lentes de popularidad →",
  homeEmptyPre: "Aún no hay palabras — ",
  homeEmptyLink: "acuña la primera",
  homeEmptyPost: ".",
  homeByCategory: "Explorar por categoría",
  homeAz: "A–Z",
  buildingNote: "Esta edición lingüística se está construyendo — ahora mismo se están acuñando entradas. El original en inglés ya está en línea.",
  buildingLink: "Ir al diccionario en inglés →",

  /* ---- Índice A–Z ---- */
  indexTitle: "Índice de palabras",
  indexSub: "Todas las palabras publicadas, alfabéticamente.",
  indexEmpty: "El diccionario todavía está vacío.",
  indexCoinFirst: "Acuña la primera palabra →",
  indexCount: (n) => `${n} ${n === 1 ? "palabra" : "palabras"}`,

  /* ---- Popularidad ---- */
  popTitle: "Popularidad",
  popSub: "Cuatro lentes, para que las palabras nuevas también puedan emerger.",
  popEmpty: "Nada por aquí todavía. Los votos y las palabras nuevas llenarán esta página.",
  lensTrending: "Tendencia de la semana",
  lensTrendingBlurb: "Palabras con más votos en los últimos 7 días.",
  lensEndorsed: "Más respaldadas",
  lensEndorsedBlurb: "Palabras que más gente usaría de verdad.",
  lensContested: "Más controvertidas",
  lensContestedBlurb: "Altas en «la usaría» Y «necesita trabajo» — a menudo las más interesantes.",
  lensVerified: "Verificadas recientemente",
  lensVerifiedBlurb: "Las palabras publicadas más recientes.",

  /* ---- Tabla de palabras ---- */
  thWord: "Palabra",
  thGloss: "Acepción breve",
  thAdded: "Añadida",
  thRank: "Puesto",
  useAria: (n) => `${n} la usarían`,
  workAria: (n) => `${n} ven trabajo pendiente`,

  /* ---- Votos ---- */
  voteUse: "Yo usaría esta palabra",
  voteWork: "Necesita trabajo",
  voteUseAria: (n) => `${n} personas usarían esta palabra`,
  voteWorkAria: (n) => `${n} personas creen que necesita trabajo`,

  /* ---- Entrada de palabra ---- */
  wordPending: "Solo tú (y las personas revisoras) pueden ver esta página hasta que se publique.",
  wordReviewerNotes: "Notas de la revisión:",
  refLabels: { news: "Noticia", academic: "Académico", essay: "Ensayo", social: "Publicación social", internal: "En este sitio" },
  wordEtym: "Etim. —",
  wordAlso: "También consideradas —",
  wordRel: "Relacionadas —",
  wordRefs: "Referencias",
  wordNovelty: "Verificación de novedad:",
  wordChecked: "verificado",
  wordEvidence: (n) => (n > 0 ? `Registro de evidencias · ${n} coincidencias más próximas` : "Registro de evidencias"),
  thQuery: "Consulta",
  thChecked: "Resultados revisados",
  thSame: "Coincidencias del mismo sentido",
  wordNoQueryLog: "No hay registro de consultas.",
  wordMethod: "Método:",
  wordCoinedBy: "Acuñada por una persona anónima",
  wordAiAssisted: "Asistida por IA",
  wordFirstSubmitted: "enviada por primera vez",
  wordPublishedOn: "publicada",
  wordRevisions: (n) => `Historial de revisiones (${n})`,
  wordNotFoundTitle: "Palabra no encontrada",

  /* ---- Acerca de (texto largo) ---- */
  aboutTitle: "Acerca de y metodología",
  aboutWhatH: "Qué es esto",
  aboutWhatP1:
    "AI Neologism es un diccionario público y curado para conceptos que aún no tienen nombre. La IA acuña palabras candidatas para fenómenos sociales emergentes, la novedad se verifica mediante búsqueda web antes de publicar, revisores humanos filtran cada entrada, y la comunidad vota la adopción — si la gente usaría de verdad la palabra.",
  aboutWhatP2:
    "Wikipedia verifica la «relevancia». Nosotros verificamos la «novedad». Cada entrada guarda evidencias fechadas de las búsquedas que mostraron que la palabra no existía — y si la palabra se difunde más adelante, se gradúa a «ya en uso real».",
  aboutPipelineH: "La cadena de producción",
  aboutPipeline: [
    "Aportas material — pegas un texto o un enlace a una noticia o ensayo.",
    "La IA, anclada en la estantería de fuentes de abajo, propone 3–5 palabras candidatas.",
    "Eliges una y la afinas; las finalistas se registran como «también consideradas».",
    "El sitio ejecuta una búsqueda de novedad (coincidencias exactas entre comillas, variantes, comprobaciones en diccionarios) y adjunta el registro de evidencias.",
    "Una persona revisora comprueba: evidencias plausibles · no es duplicado · definición legible · referencias reales.",
    "Publicada — y reverificada cada 6–12 meses.",
  ],
  aboutCraftH: "Reglas artesanales para acuñar",
  aboutCraft: [
    "Pronunciable, preferiblemente ≤ 4 sílabas.",
    "Construida con patrones productivos de la lengua: compuestos, mezclas limpias, afijos vivos.",
    "Nunca el nombre de una marca comercial.",
    "La justificación etimológica siempre explícita.",
    "Debe nombrar un fenómeno real e identificable.",
    "Las palabras acuñadas por IA proponen siempre una pronunciación IPA y se sitúan entre las entradas relacionadas cuando existen relaciones con sentido.",
  ],
  aboutCraftNote: "La barra completa — las tres puertas, incluida la regla de la fusión — está en la [[página de criterios|/criteria]].",
  aboutShelfH: "Estantería de fuentes",
  aboutShelfIntro: "El canon de conceptos nombrados que la IA estudia antes de acuñar — una lista en crecimiento:",
  aboutBadgesH: "Distintivos",
  aboutBadges: [
    { name: "Verificada nueva", text: "las evidencias de búsqueda sostienen que la palabra (con este sentido) es nueva." },
    { name: "La palabra existe · el sentido es nuevo", text: "la forma existe, pero no con este sentido (publicada con advertencia)." },
    { name: "Sin verificar", text: "faltan evidencias de novedad o están incompletas." },
    { name: "Colisión de nombre", text: "la palabra ya existe con este sentido; bloqueada para publicación." },
    { name: "Ya en uso real", text: "la reverificación detectó que la palabra se está difundiendo. Es una graduación, no un fracaso." },
  ],
  aboutLadderH: "Escalera de participación",
  aboutLadder: [
    { name: "Cualquier persona", text: "lee, busca y vota (con límites de frecuencia; sin cuenta)." },
    {
      name: "Cualquier persona",
      text: "puede acuñar — una clave secreta de contribución se emite en tu primer envío. Sin nombre, sin correo. Vincula tus palabras, te impide autorrevisarte y te da derechos de revisión tras 3 palabras aceptadas.",
    },
    {
      name: "Revisoras ganadas",
      text: "filtran la publicación. Con una revisora basta; cada decisión necesita una razón pública de una línea.",
    },
  ],
  aboutLadderNote:
    "Ideas por encima de identidades: las entradas se atribuyen siempre a «una persona anónima», con distintivo de IA cuando aplica. Clave perdida = estatus perdido; guárdala bien.",
  aboutApiH: "API",
  aboutApiP:
    "Toda la colección es programable — el mismo esquema estructurado que renderizan las páginas de palabras. La referencia completa de la API está en la [[página de contribución|/contribute]], bajo Vía API, junto a las demás formas de contribuir.",
  aboutLicenseH: "Licencia y créditos",
  aboutLicenseP:
    "Las entradas están previstas bajo CC BY-SA 4.0 (decisión final pendiente). Inspirado en el oficio de quienes nombran conceptos en todas partes, y en el patrón del proyecto Neologism del W3C: un esquema para personas y máquinas por igual.",
  aboutCoinCta: "Acuña una palabra →",

  /* ---- Criterios (texto largo) ---- */
  criteriaTitle: "La barra que toda palabra supera",
  critIntro:
    "Nada entra en este diccionario solo porque una máquina lo acuñó. Toda candidata — enviada por humanos o acuñada por IA — enfrenta las mismas tres puertas, en orden, antes de publicarse. Esta página es la declaración pública de esa barra.",
  critGate1H: "Puerta 1 — la lista artesanal",
  critGate1Intro: "Los diez puntos deben cumplirse antes de que corra siquiera una búsqueda:",
  critGate1: [
    { lead: "Nombra un fenómeno real", text: "— un patrón social observable y describible. No un chiste, ni una broma privada." },
    { lead: "Pronunciable", text: "— quien la ve puede decirla." },
    { lead: "Corta", text: "— preferiblemente cuatro sílabas o menos." },
    {
      lead: "Formación de palabras real",
      text: "— construida con patrones productivos de la lengua: compuestos, mezclas limpias, afijos vivos. Las fronteras de los morfemas deben ser reales: la palabra se parsea.",
    },
    { lead: "La fusión debe hacer trabajo", text: "— ver abajo." },
    { lead: "Nunca una marca comercial.", text: "" },
    { lead: "Etimología declarada", text: "— las raíces y por qué encajan, en cada entrada." },
    {
      lead: "Las entradas acuñadas por IA llevan más, no menos",
      text: "— una pronunciación IPA propuesta, ubicación entre entradas relacionadas (vacío por juicio, nunca por omisión) y categorías preseleccionadas.",
    },
  ],
  critRule5:
    "La regla 5 es la que mata a más candidatas. Si dos palabras ya forman una frase natural y cotidiana — y la acuñación significa exactamente lo que esa frase significa — no la publicamos. Fusionar «mile marker» en «milemarker» no añade nada: eso es reescribir, no nombrar. Una fusión gana su lugar solo cuando la frase aún no existe, el significado es más que la suma de sus partes, o la forma misma se transforma — recortada, mezclada entre fronteras, desplazada en la gramática.",
  critGate2H: "Puerta 2 — la búsqueda de novedad",
  critGate2Intro: "Tres capas, porque la búsqueda de cadena exacta por sí sola pierde la mayoría de las colisiones:",
  critGate2: [
    {
      lead: "La forma exacta",
      text: "— búsquedas entre comillas de la palabra sola, más formulaciones de «significado» y «definición», más comprobaciones en diccionarios.",
    },
    {
      lead: "La lengua fuente",
      text: "— una palabra con raíces extranjeras se busca en su propia lengua y en su traducción estándar, no solo en la grafía fusionada.",
    },
    {
      lead: "La frase separada",
      text: "— cada compuesto se busca también sin fusionar, porque «club de correr» no deja de existir porque alguien lo escriba junto.",
    },
  ],
  critGate2Note:
    "Ningún buscador prueba un negativo, así que nuestra afirmación siempre está fechada y acotada: «no se encontró uso con este significado en los índices consultados, en la fecha comprobada» — y las evidencias se publican con la entrada. Un resultado solo cuenta en contra cuando significa lo que la candidata significa; hallar la forma en un sentido ajeno no la hace fracasar.",
  critGate3H: "Puerta 3 — distinción y la línea editorial",
  critGate3: [
    {
      lead: "",
      text: "Una palabra establecida, una «tendencia con nombre» o una marca viva que ya posee el concepto o su vecindad bloquea la acuñación — incluso cuando la cadena exacta está libre.",
    },
    {
      lead: "",
      text: "Las palabras de aquí apuntan a sistemas, instituciones y prácticas — nunca a un grupo étnico, religioso o de otro tipo de personas. Sin narrativas conspirativas. Una entrada que cruza esta línea se rechaza sin importar su novedad.",
    },
  ],
  critVerdictsH: "Qué pasa con un veredicto",
  critVerdicts: [
    { lead: "Aprobada", text: "— publicada con su distintivo de verificación (los significados de los distintivos están en la [[página acerca de|/about]])." },
    {
      lead: "Revisar",
      text: "— el fenómeno es real y no tiene nombre, pero la forma colisiona o no hace trabajo: se rehace la forma, no la idea.",
    },
    { lead: "Rechazada", text: "— nunca se inserta, con las evidencias que motivaron la decisión guardadas en el registro." },
  ],
  critVerdictNote:
    "Cada no-aprobación lleva las evidencias que la motivaron, con el buscador y la fecha nombrados. Los recuentos brutos de resultados nunca son el veredicto — la pregunta es siempre si alguien ya usa este significado, bajo cualquier grafía.",
  critPracticeH: "Verlo en la práctica",
  critPractice:
    "La cadena, los distintivos y la escalera de participación están en la [[página acerca de|/about]]. ¿Crees haber visto un fenómeno sin nombre? [[Acuña una palabra →|/contribute]]",

  /* ---- games ---- */
  navGames: "Juegos",
  metaGamesTitle: "Juegos — juega con palabras acuñadas por IA",
  metaGamesDesc:
    "Cinco juegos de palabras calculados en vivo desde el léxico publicado: adivina el significado, detecta la definición falsa, ordena las categorías, sube la escalera semántica y recrea cinco mecánicas antiguas.",
  metaMeaningRevealTitle: "¿Qué significa? — el juego diario de adivinanzas",
  metaMeaningRevealDesc:
    "Una palabra acuñada por IA cada vez. Mira los morfemas, adivina el significado con tus palabras y haz clic para revelar la definición real y el motivo de la acuñación.",
  metaRealOrFakeTitle: "¿Real o falsa? — el juego de definiciones",
  metaRealOrFakeDesc:
    "Cuatro definiciones de una palabra acuñada por IA — una real, tres señuelos tomados de otras entradas reales. ¿Encuentras la verdad?",
  metaCategorySortTitle: "Ordena el léxico — el juego de categorías",
  metaCategorySortDesc:
    "Dieciséis palabras recién acuñadas, cuatro categorías ocultas, cuatro vidas. Un tablero tipo Connections con las categorías reales del léxico, nuevo en cada carga.",
  metaSemanticLadderTitle: "¿Caliente o frío? — la escalera semántica",
  metaSemanticLadderDesc:
    "Una palabra oculta de la IA, un banco de palabras cotidianas, valores de cercanía de 0 a 100. Sube la escalera solo por el significado.",
  metaAncientVaultTitle: "El Anticuario — juegos de palabras antiguos, combustible nuevo",
  metaAncientVaultDesc:
    "El cuadrado Sator de Pompeya, acertijos de fusión Lihe, el Feihualing Tang, adivinanzas invertidas y cadenas de palabras — cinco mecánicas milenarias con palabras que no existían hace tres años.",
  games: {
    backToGames: "← Todos los juegos",
    hubTitle: "Juega con palabras acuñadas por IA",
    hubSub:
      "Cinco juegos calculados en vivo desde el léxico publicado — cada ronda se genera fresca desde entradas reales, y la palabra del día es la misma para todos.",
    statWords: (n: number) => `${n} palabras`,
    statFamilies: (n: number) => `${n} familias de morfemas`,
    statCategories: (n: number) => `${n} categorías`,
    statDaily: "☀️ una palabra del día",
    howToPlay: "Cómo se juega",
    unavailable: "Este juego aún no tiene suficientes palabras publicadas en este idioma.",
    playCta: "Jugar →",
    enterVaultCta: "Entrar al Anticuario →",
    allGames: "Todos los juegos →",

    cardMeaningTitle: "¿Qué significa?",
    cardMeaningDesc:
      "El bucle diario esencial: primero la palabra del día, luego práctica al azar. Mira los morfemas, adivina el significado con tus palabras y haz clic para revelarlo.",
    cardMeaningOrigin: "Origen: tu idea — el bucle diario esencial",
    cardRealOrFakeTitle: "¿Real o falsa?",
    cardRealOrFakeDesc:
      "Cuatro definiciones, una verdadera — los señuelos son definiciones de otras palabras reales del léxico.",
    cardRealOrFakeOrigin: "Origen: Balderdash / Fictionary, versión en solitario",
    cardCategoryTitle: "Ordena el léxico",
    cardCategoryDesc:
      "Dieciséis palabras, cuatro categorías reales, cuatro vidas. El tablero se reconstruye en cada carga — ninguna visita es igual a otra.",
    cardCategoryOrigin: "Origen: NYT Connections, edición léxico",
    cardSemanticTitle: "¿Caliente o frío?",
    cardSemanticDesc:
      "Sube una escalera de similitud semántica hacia una palabra oculta. Tablero de demostración con valores simulados — la versión real necesita embeddings de palabras.",
    cardSemanticOrigin: "Origen: Semantle / Contexto, edición word2vec",
    cardVaultTitle: "El Anticuario",
    cardVaultDesc:
      "Cinco mecánicas antiguas con combustible fresco: el cuadrado Sator de Pompeya, acertijos de fusión Lihe, el Feihualing Tang, adivinanzas invertidas y la cadena de palabras — rondas calculadas en vivo.",
    cardVaultOrigin: "Origen: 2.000 años de juegos de palabras · Roma · Han · Tang · Inglaterra · Japón/Corea",

    mrIntro:
      "El bucle diario esencial. La primera palabra es ☀️ la palabra del día — la misma para todos. Nadie ha visto estas acuñaciones antes. Adivina qué debe significar y haz clic para revelarlo.",
    mrRules: [
      "Lee la palabra. Es real, está publicada y es novísima.",
      "Asoma los morfemas (las dos palabras viejas fusionadas dentro) — esa es tu única pista.",
      "Escribe tu conjetura con tus palabras, o guárdala en la cabeza.",
      'Pulsa «Revelar el significado». Aparecen la definición real y el motivo de la acuñación.',
      "Puntúate con honestidad: 🎯 clavado · ≈ caliente · 🤷 ni idea.",
      "☀️ La primera palabra es la del día (igual para todos); «Siguiente palabra» reparte práctica al azar.",
    ],
    mrShowHint: "👀 Ver pista de morfemas",
    mrHideHint: "🙈 Ocultar pista de morfemas",
    mrGuessPlaceholder: "Tu conjetura, con tus palabras (opcional, pero mola compararla tras revelar)…",
    mrReveal: "Revelar el significado",
    mrRevealedHeading: "✓ El significado real",
    mrHowClose: "¿Qué tan cerca estuviste?",
    mrNailed: "🎯 Clavado",
    mrWarm: "≈ Caliente",
    mrNoIdea: "🤷 Ni idea",
    mrScored: (emoji: string) => `Anotado: ${emoji} — las rachas y las tarjetas para compartir llegan pronto.`,
    mrNext: "Siguiente palabra →",
    mrFooter: "Datos en vivo · primera palabra = la palabra del día",

    rofIntro:
      "Cuatro definiciones de una palabra acuñada por IA. Una es la definición real publicada — las otras tres son señuelos: definiciones de otras palabras reales del léxico (la mejora prevista: señuelos sacados de las candidatas descartadas por la propia IA).",
    rofRules: [
      "Aparece una palabra con cuatro definiciones, A–D.",
      "Una es real — la definición publicada en el léxico.",
      "Tres son señuelos. El Balderdash clásico usaba falsificaciones humanas; la v0 pide prestadas definiciones de otras entradas reales.",
      "Elige una. Acierto: la palabra entra en tu racha. Fallo: ves por qué ganó la real.",
      "En producción: un set diario de cinco rondas, rachas y una cuadrícula compartible.",
    ],
    rofRound: (i: number, n: number) => `Ronda ${i} / ${n}`,
    rofCorrect: (n: number) => `Aciertos: ${n}`,
    rofNext: "Siguiente ronda →",
    rofSeeResult: "Ver resultado →",
    rofCalledIt: "la has cazado.",
    rofGotYou: "el señuelo te ha pillado.",
    rofEnd: (c: number, n: number) =>
      `Banco de demostración terminado — ${c}/${n} aciertos. 🎯 En producción: un cinco diario fresco, rachas y una cuadrícula compartible.`,
    rofFooter: "Datos en vivo · señuelos = definiciones de otras palabras reales (v0)",

    csIntro:
      "Dieciséis palabras recién acuñadas. Cuatro categorías ocultas, cuatro palabras cada una. Las categorías son las reales que usa el propio léxico — encuentra las familias.",
    csRules: [
      "Selecciona 4 palabras que creas que comparten categoría y pulsa Enviar.",
      "Correcto → la familia se fija. Incorrecto → pierdes una de las cuatro vidas.",
      "La trampa: varias palabras podrían encajar en dos grupos — las categorías reales del léxico lo mantienen honesto.",
      "El tablero se reconstruye en cada carga de página.",
    ],
    csSelected: (n: number) => `${n} seleccionadas`,
    csSubmit: "Enviar",
    csClear: "Limpiar",
    csPlayAgain: "Jugar otra vez",
    csLocked: (name: string) => `✓ ${name} fijada.`,
    csWrong: "✗ No es una familia — una vida menos.",
    csPerfect: "¡Orden perfecto! 🧩",
    csOutOfLives: (names: string) => `Sin vidas. Las familias restantes: ${names}`,
    csFooter: "Datos en vivo · tablero construido automáticamente con las categorías reales del léxico — fresco en cada carga",

    slIntro:
      "Una palabra oculta acuñada por IA. Pulsa palabras del banco — o escribe las tuyas — y recibe un valor de cercanía semántica de 0 a 100. Sube la escalera solo por el significado. Sin ortografía: así funcionan exactamente las palabras nuevas.",
    slRules: [
      "Una palabra está oculta. Es real y está publicada — solo que no sabes cuál.",
      "Pulsa una palabra del banco (o escribe una propia). 100 = semánticamente idéntica, 0 = sin relación.",
      "Caléntate: la escalera ordena tus intentos; sigue el calor hacia el concepto oculto.",
      "Revelar se desbloquea tras 3 intentos — lo ganes o te rindas, ambos muestran la verdad.",
      "Esta demostración simula los valores — la versión real necesita embeddings de palabras.",
    ],
    slHiddenPrefix: "La palabra oculta es ",
    slLetters: (n: number) => `????? (${n} letras)`,
    slInputPlaceholder: "Opcional: escribe una palabra y pulsa Enter…",
    slGuess: "Probar",
    slRevealLocked: "Revelar (faltan 3 intentos)",
    slRevealReady: "Revelar la palabra",
    slNext: "Siguiente palabra oculta →",
    whyPrefix: "Por qué la IA la acuñó: ",
    slFooter: "Tablero de demostración · palabras del léxico real, valores simulados (embeddings pendientes)",

    avIntro:
      "Cinco mecánicas de juego con miles de años, recreadas con palabras que no existían hace tres años. Cada mecánica fue inventada de forma independiente por varias civilizaciones — el léxico solo les da combustible nuevo.",
    avEraSator: "Pompeya, antes del 79 d. C. · el acertijo de palabras más antiguo conservado",
    avSatorTitle: "A · El cuadrado de las cinco palabras",
    avSatorDesc:
      "Un palíndromo latino de cinco por cinco grabado en los muros de Pompeya, hallado de Roma a Siria: SATOR · AREPO · TENET · OPERA · ROTAS. Se lee igual por filas y columnas, al derecho y al revés — el meme favorito del Imperio romano.",
    avSatorRules:
      "Explorar: toca una dirección. Cada dirección lee cinco palabras válidas. Filas y columnas son idénticas — ese es el truco, y nadie sabe por qué se hizo.",
    avRows: "→ Filas",
    avCols: "↓ Columnas",
    avRowsRev: "← Filas al revés",
    avColsRev: "↑ Columnas al revés",
    avSatorHist: "~2.000 años de antigüedad · y aún sin resolver: «Arepo» no aparece en ningún otro lugar de toda la literatura latina.",
    avEraFusion: "Grecia ~300 a. C. (anagramas de Licofrón) · China Han ~200 d. C. (poemas Lihe de Kong Rong)",
    avFusionTitle: "B · Acertijo de fusión · Lihe",
    avFusionDesc:
      "El juego de construir palabras más antiguo: partir un nombre o palabra en fragmentos y fundirlos de nuevo. Los poetas Han escondían nombres en poemas Lihe; los griegos escribían anagramas en verso de nombres reales. Las palabras de la IA son fusiones de nacimiento — el juego se reconstruye solo.",
    avFusionRules:
      "Jugar: el significado está dado. Pulsa los fragmentos que se funden en la palabra — pero algunos fragmentos son señuelos que no pertenecen.",
    avBuiltHint: "(pulsa los fragmentos de abajo)",
    avSurrender: "Rendirse → revelar",
    avNextRiddle: "Siguiente acertijo →",
    avEraFlower: "China Tang · Feihualing, el juego del vino de los letrados",
    avFlowerTitle: "C · Orden floral · Feihualing",
    avFlowerDesc:
      "En los banquetes Tang, el maestro de bebidas fijaba un carácter — digamos hua, «flor» — y todos recitaban por turnos un verso que lo contuviera; quien dudaba, bebía. Hoy el carácter viene del léxico, y los «versos» son palabras acuñadas por IA.",
    avFlowerRules:
      "Jugar: un morfema obligatorio. En 45 segundos, pulsa cada ficha que lo esconda — la mayoría no. Cada acierto revela su definición; al final, las que fallaste quedan marcadas.",
    avMorphRequired: "Morfema obligatorio:",
    avPickMorpheme: "Elige arriba un morfema para empezar la ronda.",
    avClickEvery: "Pulsa cada ficha que esconda el morfema.",
    avWrongTile: (w: string) => `✗ ${w} — el morfema no se esconde en esta`,
    avFoundTile: (w: string, def: string) => `✓ ${w} — ${def}`,
    avPerfect: (s: number) => `Todo encontrado con ${s}s de sobra — ¡una orden floral perfecta! 🏮`,
    avTimeUp: (f: number, n: number) => `¡Tiempo! Nombraste ${f} / ${n}.`,
    avMissed: (words: string) => `Falladas (marcadas en verde): ${words}`,
    avRestartRound: "Reiniciar ronda",
    avEraReverse: "Sumeria ~1800 a. C. · Esfinge · Libro de Exeter ~1000 d. C.",
    avReverseTitle: "D · Adivinanza invertida — tú acuñas la palabra",
    avReverseDesc:
      "La adivinanza es el juego de palabras más antiguo de la humanidad: un significado descrito, una respuesta por nombrar. Esta vez tú eres quien responde. Con una definición y sus morfemas en bruto, acuña tu propia palabra — y luego mira qué acuñó la IA de verdad.",
    avReverseRules:
      "Jugar: lee la definición y acuña tu palabra — pulsa una de las acuñaciones sugeridas abajo (una de ellas es la elección real de la IA, pero no diremos cuál) o escribe tu propia fusión. Luego compara con la máquina.",
    avCoinagePlaceholder: "Tu acuñación…",
    avCompare: "Comparar con la IA",
    avYouCoined: "Tú acuñaste",
    avAiCoined: "La IA acuñó",
    avEraChain: "Japón Shiritori · Corea Kkeutmareugi · Rusia Goroda · India Antakshari",
    avChainTitle: "E · Cadena de palabras · Jielong",
    avChainDesc:
      "Inventada de forma independiente en cuatro continentes: cada palabra debe enlazar con la anterior — por sílaba final en Tokio, última letra en Seúl, nombre de ciudad en Moscú, primer sonido de una canción en Delhi. La versión del léxico enlaza por tramos de letras ocultos dentro de las palabras.",
    avChainRules:
      "Jugar: elige la única palabra que comparte un tramo oculto de ≥5 letras con la actual. Acierta, el tramo se ilumina, la cadena crece. Tres fallos y la cadena se rompe.",
    avChainWin: "Cadena completa — cada eslabón un tramo oculto de ≥5 letras. 🔗",
    avChainSnap: (run: string) => `Cadena rota. La secuencia completa: ${run}`,
    avChainAgain: "Otra cadena →",
    avMorphemeNote:
      "El acertijo de fusión, la orden floral y la adivinanza invertida necesitan la etimología de cada entrada (why_this_word). Se encienden para un idioma en cuanto sus entradas la lleven.",
    avFooter: "Datos en vivo · rondas y familias de morfemas calculadas en el servidor · el cuadrado Sator es historia, no datos",
  },
};
