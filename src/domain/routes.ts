import type { CityId } from './types';

/** What the side panel shows: the café list, one café, or nothing. */
export type Panel = { kind: 'list' } | { kind: 'cafe'; slug: string } | null;

/** A parsed address. `city` is null when the hash names no known city. */
export interface Route {
  city: CityId | null;
  panel: Panel;
}

/** The segment that opens the list, so no café may use it as a slug. */
export const LIST = 'list';

/** Reads `#/<city>`, `#/<city>/list` and `#/<city>/<café-slug>`. */
export function parseRoute(hash: string, cities: readonly CityId[]): Route {
  const [cityId = '', rest = ''] = hash.replace(/^#\/?/, '').split('/');
  const city = cities.find((c) => c === cityId) ?? null;
  if (!rest) return { city, panel: null };
  return { city, panel: rest === LIST ? { kind: 'list' } : { kind: 'cafe', slug: decodeURIComponent(rest) } };
}

/** The hash for a city and panel; the inverse of `parseRoute`. */
export function routeHref(city: CityId, panel: Panel = null): string {
  if (!panel) return `#/${city}`;
  return panel.kind === 'list' ? `#/${city}/${LIST}` : `#/${city}/${encodeURIComponent(panel.slug)}`;
}
