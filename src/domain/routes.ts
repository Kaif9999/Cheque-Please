import type { CityId } from './types';

/** What the side panel shows: the café list, one neighbourhood's cafés, one café, or nothing. */
export type Panel = { kind: 'list' } | { kind: 'area'; slug: string } | { kind: 'cafe'; slug: string } | null;

/** A parsed address. `city` is null when the path names no known city. */
export interface Route {
  city: CityId | null;
  panel: Panel;
}

/** The segment that opens the list, so no café may use it as a slug. */
export const LIST = 'list';
/** The segment before a neighbourhood's slug, so no café may use it either. */
export const AREA = 'area';

/** "HSR Layout" -> "hsr-layout", "Café Madras" -> "cafe-madras". */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Reads `/<city>/`, `/<city>/list/`, `/<city>/area/<area-slug>/` and `/<city>/<café-slug>/`.
 * Old shared links put the same path after `#`, so `#/<city>/...` reads the same way.
 */
export function parseRoute(address: string, cities: readonly CityId[]): Route {
  const [cityId = '', rest = '', more = ''] = address.replace(/^#/, '').split('/').filter(Boolean);
  const city = cities.find((c) => c === cityId) ?? null;
  if (!rest) return { city, panel: null };
  if (rest === LIST) return { city, panel: { kind: 'list' } };
  if (rest === AREA) return { city, panel: more ? { kind: 'area', slug: decodeURIComponent(more) } : { kind: 'list' } };
  return { city, panel: { kind: 'cafe', slug: decodeURIComponent(rest) } };
}

/** The path for a city and panel; the inverse of `parseRoute`. */
export function routeHref(city: CityId, panel: Panel = null): string {
  if (!panel) return `/${city}/`;
  if (panel.kind === 'list') return `/${city}/${LIST}/`;
  if (panel.kind === 'area') return `/${city}/${AREA}/${encodeURIComponent(panel.slug)}/`;
  return `/${city}/${encodeURIComponent(panel.slug)}/`;
}
