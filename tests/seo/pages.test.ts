import { describe, expect, it } from 'vitest';
import { CITIES, CITY_ORDER } from '@/data/cities';
import { areaPages } from '@/domain/areas';
import { allPages, canonicalOf, clip, crumbsOf, descriptionOf, joinList, pageOf, pathOf, titleOf } from '@/seo/pages';

const pages = allPages();
const city = CITIES.bengaluru;

describe('allPages', () => {
  it('has the home page, then each city, its list, its neighbourhoods and its cafés', () => {
    const expected = 1 + CITY_ORDER.reduce((n, id) => n + 2 + areaPages(CITIES[id].cafes).length + CITIES[id].cafes.length, 0);
    expect(pages).toHaveLength(expected);
    expect(pages[0]?.kind).toBe('home');
  });

  it('gives every page its own address and title', () => {
    expect(new Set(pages.map(pathOf)).size).toBe(pages.length);
    expect(new Set(pages.map(titleOf)).size).toBe(pages.length);
  });

  it('writes a description short enough for search results on every page', () => {
    for (const page of pages) {
      const text = descriptionOf(page);
      expect(text.length, pathOf(page)).toBeGreaterThan(60);
      expect(text.length, pathOf(page)).toBeLessThanOrEqual(158);
    }
  });

  it('points each list at its city page', () => {
    for (const page of pages.filter((p) => p.kind === 'list')) expect(canonicalOf(page)).toBe(`/${page.city.id}/`);
  });
});

describe('crumbsOf', () => {
  it('runs from the home page through the neighbourhood to the café', () => {
    const cafe = city.cafes.find((c) => c.area === 'Indiranagar')!;
    expect(crumbsOf({ kind: 'cafe', city, cafe }).map((c) => c.path)).toEqual([
      '/',
      '/bengaluru/',
      '/bengaluru/area/indiranagar/',
      `/bengaluru/${cafe.slug}/`,
    ]);
  });

  it('skips a neighbourhood with no page of its own', () => {
    const lone = Object.values(CITIES)
      .flatMap((c) => c.cafes.map((cafe) => ({ city: c, cafe })))
      .find(({ city: c, cafe }) => c.cafes.filter((x) => x.area === cafe.area).length === 1)!;
    expect(crumbsOf({ kind: 'cafe', ...lone })).toHaveLength(3);
  });
});

describe('pageOf', () => {
  const view = { selected: null, area: null, list: false };

  it('tells the home page from the city it opens on', () => {
    expect(pageOf(city, view, true).kind).toBe('home');
    expect(pageOf(city, view, false).kind).toBe('city');
  });

  it('prefers the café, then the neighbourhood, then the list', () => {
    const slug = city.cafes[0]!.slug;
    expect(pageOf(city, { ...view, selected: slug, area: 'Indiranagar', list: true }, false).kind).toBe('cafe');
    expect(pageOf(city, { ...view, area: 'Indiranagar', list: true }, false).kind).toBe('area');
    expect(pageOf(city, { ...view, list: true }, false).kind).toBe('list');
  });
});

describe('text helpers', () => {
  it('joins names the way a sentence would', () => {
    expect(joinList(['a'])).toBe('a');
    expect(joinList(['a', 'b'])).toBe('a and b');
    expect(joinList(['a', 'b', 'c'])).toBe('a, b and c');
  });

  it('clips at the last whole sentence, or at a word', () => {
    expect(clip('Short.', 20)).toBe('Short.');
    expect(clip('One two three. Four five six seven eight.', 24)).toBe('One two three.');
    expect(clip('One two three four five six seven eight', 20)).toBe('One two three four…');
  });
});
