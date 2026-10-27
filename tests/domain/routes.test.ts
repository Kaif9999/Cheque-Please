import { describe, expect, it } from 'vitest';
import { parseRoute, routeHref, type Panel } from '@/domain/routes';
import type { CityId } from '@/domain/types';

const CITIES: CityId[] = ['bengaluru', 'mumbai'];

describe('parseRoute', () => {
  it('reads a city on its own', () => {
    expect(parseRoute('#/mumbai', CITIES)).toEqual({ city: 'mumbai', panel: null });
  });

  it('reads the list and a café', () => {
    expect(parseRoute('#/bengaluru/list', CITIES).panel).toEqual({ kind: 'list' });
    expect(parseRoute('#/bengaluru/subko-bandra', CITIES).panel).toEqual({ kind: 'cafe', slug: 'subko-bandra' });
  });

  it('gives no city for an empty or unknown hash', () => {
    expect(parseRoute('', CITIES)).toEqual({ city: null, panel: null });
    expect(parseRoute('#/', CITIES)).toEqual({ city: null, panel: null });
    expect(parseRoute('#/delhi/list', CITIES).city).toBeNull();
  });
});

describe('routeHref', () => {
  it('round-trips through parseRoute', () => {
    const panels: Panel[] = [null, { kind: 'list' }, { kind: 'cafe', slug: 'third-wave-hsr' }];
    for (const city of CITIES) {
      for (const panel of panels) expect(parseRoute(routeHref(city, panel), CITIES)).toEqual({ city, panel });
    }
  });

  it('escapes slugs that would break the path', () => {
    expect(routeHref('mumbai', { kind: 'cafe', slug: 'a/b' })).toBe('#/mumbai/a%2Fb');
  });
});
