import { config } from '@/config';
import { CITIES, CITY_ORDER } from '@/data/cities';
import { areaPages } from '@/domain/areas';
import { investorsAt, photosFirst } from '@/domain/people';
import { routeHref, slugify } from '@/domain/routes';
import type { Cafe, City } from '@/domain/types';
import { plural } from '@/lib/text';

/** Every address the site answers with a page of its own. */
export type Page =
  | { kind: 'home'; city: City }
  | { kind: 'city'; city: City }
  | { kind: 'list'; city: City }
  | { kind: 'area'; city: City; area: string; cafes: Cafe[] }
  | { kind: 'cafe'; city: City; cafe: Cafe };

export interface Crumb {
  name: string;
  path: string;
}

/** Search results cut descriptions at about this many characters. */
const DESCRIPTION_MAX = 158;

const cities = (): City[] => CITY_ORDER.map((id) => CITIES[id]);

/** "a", "a and b", "a, b and c". */
export function joinList(items: string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** Fits the text by ending at its last whole sentence, or failing that at a word, marking the cut. */
export function clip(text: string, max = DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const sentence = cut.lastIndexOf('. ');
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,.;:]+$/, '')}…`;
}

/** "Rahul Chowdhri, Kunal Shah and 3 others": the people seen, faces first. */
function whoWasSeen(cafes: Cafe[], max = 3): string {
  const names = photosFirst(investorsAt(cafes)).map((p) => p.name);
  if (names.length <= max) return joinList(names);
  return joinList([...names.slice(0, max), plural(names.length - max, 'other')]);
}

/** The home page, then each city with its list, its neighbourhoods and its cafés. */
export function allPages(): Page[] {
  const [first] = cities();
  const pages: Page[] = first ? [{ kind: 'home', city: first }] : [];
  for (const city of cities()) {
    pages.push({ kind: 'city', city }, { kind: 'list', city });
    for (const [area, cafes] of areaPages(city.cafes)) pages.push({ kind: 'area', city, area, cafes });
    for (const cafe of city.cafes) pages.push({ kind: 'cafe', city, cafe });
  }
  return pages;
}

/** The page the app is showing. The bare address `/` is the home page, which opens on the first city. */
export function pageOf(city: City, view: { selected: string | null; area: string | null; list: boolean }, home: boolean): Page {
  const cafe = view.selected ? city.cafes.find((c) => c.slug === view.selected) : undefined;
  if (cafe) return { kind: 'cafe', city, cafe };
  if (view.area) return { kind: 'area', city, area: view.area, cafes: city.cafes.filter((c) => c.area === view.area) };
  if (view.list) return { kind: 'list', city };
  return home ? { kind: 'home', city } : { kind: 'city', city };
}

export function pathOf(page: Page): string {
  switch (page.kind) {
    case 'home':
      return '/';
    case 'city':
      return routeHref(page.city.id);
    case 'list':
      return routeHref(page.city.id, { kind: 'list' });
    case 'area':
      return routeHref(page.city.id, { kind: 'area', slug: slugify(page.area) });
    case 'cafe':
      return routeHref(page.city.id, { kind: 'cafe', slug: page.cafe.slug });
  }
}

/** The address search engines should treat as the original: the list is the city page opened up. */
export function canonicalOf(page: Page): string {
  return page.kind === 'list' ? routeHref(page.city.id) : pathOf(page);
}

export function titleOf(page: Page): string {
  const brand = config.name;
  switch (page.kind) {
    case 'home':
      return `${brand}: where VCs meet founders in ${joinList(cities().map((c) => c.name))}`;
    case 'city':
      return `${page.city.headline}: ${plural(page.city.cafes.length, 'café')} · ${brand}`;
    case 'list':
      return `All ${page.city.name} cafés where VCs meet founders · ${brand}`;
    case 'area':
      return `Where VCs get coffee in ${page.area}, ${page.city.name} · ${brand}`;
    case 'cafe': {
      const seen = investorsAt([page.cafe]).length;
      const hook = seen ? `${plural(seen, 'investor')} seen here` : 'where founders meet';
      return `${page.cafe.name}, ${page.cafe.area}: ${hook} · ${brand}`;
    }
  }
}

export function descriptionOf(page: Page): string {
  const proof = 'Every pin links to the public post that puts them there.';
  switch (page.kind) {
    case 'home':
      return clip(`The cafés in ${joinList(cities().map((c) => c.name))} where VCs and angels have met founders. ${proof}`);
    case 'city':
    case 'list': {
      const { city } = page;
      const areas = areaPages(city.cafes)
        .slice(0, 3)
        .map(([area]) => area);
      const where = areas.length ? `, from ${joinList(areas)}` : '';
      return clip(
        `The ${city.cafes.length} cafés in ${city.name} where ${plural(investorsAt(city.cafes).length, 'VC and angel', 'VCs and angels')} have met founders${where}. ${proof}`,
      );
    }
    case 'area': {
      const who = whoWasSeen(page.cafes);
      const met = who ? `where ${who} have met founders` : 'where founders meet investors';
      return clip(
        `${plural(page.cafes.length, 'café')} in ${page.area}, ${page.city.name}, ${met}. ${page.city.areas[page.area] ?? ''}`.trim(),
      );
    }
    case 'cafe': {
      const { cafe, city } = page;
      const seen = investorsAt([cafe]);
      const where = `${cafe.name}, ${cafe.branch}, ${cafe.area}, ${city.name}`;
      if (!seen.length) return clip(`Founders post about meetings at ${where}. ${cafe.note}`);
      return clip(`${whoWasSeen([cafe])} ${seen.length === 1 ? 'has' : 'have'} been spotted at ${where}. ${cafe.note}`);
    }
  }
}

/** From the home page down to this one. */
export function crumbsOf(page: Page): Crumb[] {
  const home: Crumb = { name: config.name, path: '/' };
  if (page.kind === 'home') return [home];
  const city: Crumb = { name: page.city.name, path: routeHref(page.city.id) };
  if (page.kind === 'city' || page.kind === 'list') return [home, city];
  if (page.kind === 'area') return [home, city, { name: page.area, path: pathOf(page) }];
  const hasAreaPage = areaPages(page.city.cafes).some(([area]) => area === page.cafe.area);
  const areaCrumb: Crumb[] = hasAreaPage
    ? [{ name: page.cafe.area, path: routeHref(page.city.id, { kind: 'area', slug: slugify(page.cafe.area) }) }]
    : [];
  return [home, city, ...areaCrumb, { name: page.cafe.name, path: pathOf(page) }];
}

/** The headline a shared link shows, without the site's name. */
export function headlineOf(page: Page): string {
  switch (page.kind) {
    case 'home':
      return 'Where do VCs actually get coffee?';
    case 'city':
      return page.city.headline;
    case 'list':
      return `All ${page.city.name} cafés where VCs meet founders`;
    case 'area':
      return `Where VCs get coffee in ${page.area}, ${page.city.name}`;
    case 'cafe':
      return `${page.cafe.name}, ${page.cafe.area}`;
  }
}

/** The link-preview image: one per city, and one for the whole site on the home page. */
export function imageOf(page: Page): { path: string; alt: string } {
  if (page.kind === 'home')
    return { path: '/og.jpg', alt: `${config.name}: where VCs meet founders in ${joinList(cities().map((c) => c.name))}.` };
  return {
    path: `/og/${page.city.id}.jpg`,
    alt: `A map of ${page.city.name} with café pins and investor faces, beside the headline ${page.city.headline}.`,
  };
}
