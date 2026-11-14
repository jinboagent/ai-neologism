// Game payload service — what the page shells call. Each getter loads the
// language's published words (cached) and computes fresh rounds server-side;
// an empty payload means "this game has no fuel in this language yet".
import type { Locale } from "../i18n/core";
import { getLexicon } from "./data";
import {
  availability,
  categorySortPayload,
  chainRound,
  flowerPayload,
  fusionPayload,
  meaningPayload,
  realOrFakePayload,
  reversePayload,
  semanticPayload,
  stats,
  type CategorySortData,
  type GameAvailability,
  type GameStats,
  type MeaningData,
  type RealOrFakeData,
  type SemanticData,
} from "./engine";

// Everyday-guess banks for the semantic-ladder demo (scores are simulated).
const SEMANTIC_BANKS: Record<Locale, string[]> = {
  en: ["notification", "unread", "badge", "guilt", "anxiety", "inbox", "app", "email", "phone", "message", "homework", "weather"],
  de: ["Benachrichtigung", "Schuld", "App", "E-Mail", "Telefon", "Nachricht", "Schlaf", "Alltag", "Wetter", "Steuern", "Kaffee", "Angst"],
  es: ["notificación", "culpa", "app", "correo", "teléfono", "mensaje", "sueño", "rutina", "tiempo", "impuestos", "café", "ansiedad"],
  fr: ["notification", "culpabilité", "appli", "e-mail", "téléphone", "message", "sommeil", "routine", "météo", "impôts", "café", "anxiété"],
};

export async function gamesOverview(locale: Locale): Promise<{ stats: GameStats; availability: GameAvailability }> {
  const lex = await getLexicon(locale);
  return { stats: stats(lex.words, lex.families), availability: availability(lex.words, lex.families, lex.grams) };
}

export async function meaningData(locale: Locale): Promise<MeaningData> {
  const lex = await getLexicon(locale);
  return meaningPayload(lex.words);
}

export async function realOrFakeData(locale: Locale): Promise<RealOrFakeData> {
  const lex = await getLexicon(locale);
  return realOrFakePayload(lex.words);
}

export async function categorySortData(locale: Locale): Promise<CategorySortData> {
  const lex = await getLexicon(locale);
  return categorySortPayload(lex.words);
}

export async function semanticData(locale: Locale): Promise<SemanticData> {
  const lex = await getLexicon(locale);
  return semanticPayload(lex.words, SEMANTIC_BANKS[locale], locale);
}

export async function ancientVaultData(locale: Locale) {
  const lex = await getLexicon(locale);
  return {
    fusionRounds: fusionPayload(lex.words),
    flowerRounds: flowerPayload(lex.words, lex.families),
    reverseRounds: reversePayload(lex.words),
    chain: chainRound(lex.words, lex.grams),
  };
}
