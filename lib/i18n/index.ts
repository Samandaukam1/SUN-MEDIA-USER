import { uz } from './uz';

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

/** Every locale must provide the same keys as the Uzbek source dictionary. */
export type Dictionary = Shape<typeof uz>;

const dictionaries: Record<string, Dictionary> = { uz };

export const DEFAULT_LOCALE = 'uz';

export function getStrings(locale: string = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** UI strings for the current locale (Uzbek until RU/EN dictionaries are added). */
export function useStrings(): Dictionary {
  return getStrings(DEFAULT_LOCALE);
}
