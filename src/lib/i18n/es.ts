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
};
