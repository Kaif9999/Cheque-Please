import { describe, expect, it } from 'vitest';
import { parseRoute, routeHref, slugify, type Panel } from '@/domain/routes';
import type { CityId } from '@/domain/types';

const CITIES: CityId[] = ['bengaluru', 'mumbai'];

describe('parseRoute', () => {
  it('reads a city on its own, with or without the trailing slash', () => {
    expect(parseRoute('/mumbai/', CITIES)).toEqual({ city: 'mumbai', panel: null });
    expect(parseRoute('/mumbai', CITIES)).toEqual({ city: 'mumbai', panel: null });
  });

  it('reads the list, a neighbourhood and a café', () => {
    expect(parseRoute('/bengaluru/list/', CITIES).panel).toEqual({ kind: 'list' });
    expect(parseRoute('/bengaluru/area/hsr-layout/', CITIES).panel).toEqual({ kind: 'area', slug: 'hsr-layout' });
    expect(parseRoute('/bengaluru/subko-bandra/', CITIES).panel).toEqual({ kind: 'cafe', slug: 'subko-bandra' });
  });

  it('opens the list for a neighbourhood path with no neighbourhood', () => {
    expect(parseRoute('/bengaluru/area/', CITIES).panel).toEqual({ kind: 'list' });
  });

  it('reads links shared before paths, from the hash', () => {
    expect(parseRoute('#/mumbai/subko-bandra', CITIES)).toEqual({ city: 'mumbai', panel: { kind: 'cafe', slug: 'subko-bandra' } });
  });

  it('gives no city for the home page or an unknown one', () => {
    expect(parseRoute('/', CITIES)).toEqual({ city: null, panel: null });
    expect(parseRoute('', CITIES)).toEqual({ city: null, panel: null });
    expect(parseRoute('/delhi/list/', CITIES).city).toBeNull();
  });
});

describe('routeHref', () => {
  it('round-trips through parseRoute', () => {
    const panels: Panel[] = [null, { kind: 'list' }, { kind: 'area', slug: 'indiranagar' }, { kind: 'cafe', slug: 'third-wave-hsr' }];
    for (const city of CITIES) {
      for (const panel of panels) expect(parseRoute(routeHref(city, panel), CITIES)).toEqual({ city, panel });
    }
  });

  it('ends every path with a slash, as the built pages are folders', () => {
    expect(routeHref('mumbai')).toBe('/mumbai/');
    expect(routeHref('mumbai', { kind: 'area', slug: 'bkc' })).toBe('/mumbai/area/bkc/');
  });

  it('escapes slugs that would break the path', () => {
    expect(routeHref('mumbai', { kind: 'cafe', slug: 'a/b' })).toBe('/mumbai/a%2Fb/');
  });
});

describe('slugify', () => {
  it('lowercases, drops accents and joins words with hyphens', () => {
    expect(slugify('HSR Layout')).toBe('hsr-layout');
    expect(slugify('Café Madras')).toBe('cafe-madras');
    expect(slugify(' Lower Parel / Worli ')).toBe('lower-parel-worli');
  });
});
