// Dictionary registry. Static imports keep every locale in one bundle — the
// dictionaries are plain data, so this is client-safe too.
import { de } from "./de";
import { en, type Dictionary } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import type { Locale } from "./core";

export type { Dictionary };
export { en };

const DICTIONARIES: Record<Locale, Dictionary> = { en, de, es, fr };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
