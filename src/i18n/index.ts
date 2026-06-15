import type { Lang } from "./types";
import { es } from "./es";
import { en } from "./en";

const dictionaries = { es, en } as const;

export type Dictionary = typeof es;

export function getDictionary(lang: Lang): Dictionary {
  return dictionaries[lang];
}

export { es, en };
