/**
 * Field bounds shared by every write path. POST and PUT used to disagree — POST
 * capped the definition at 600 characters while PUT accepted anything.
 *
 * Lives in its own client-safe module: client components (contribute, review)
 * import sanitizers that default to these bounds, and re-exporting from
 * words.ts would drag the libsql client into the browser bundle.
 */
export const LIMITS = {
  word: { min: 2, max: 80 },
  definition: { min: 10, max: 600 },
  explanation: { max: 4000 },
  whyThisWord: { max: 4000 },
  pronunciation: { max: 120 },
  partOfSpeech: { max: 40 },
  alternatives: 8,
  references: 12,
  relatedWords: 12,
  categories: 6,
} as const;
