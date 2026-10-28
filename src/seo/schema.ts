import { config } from '@/config';
import { CITIES, CITY_ORDER } from '@/data/cities';
import { routeHref } from '@/domain/routes';
import type { Cafe, City } from '@/domain/types';
import { asset } from '@/lib/links';
import { canonicalOf, crumbsOf, descriptionOf, titleOf, type Page } from './pages';

type Node = Record<string, unknown>;

/**
 * Structured data for a page, as one JSON-LD graph: the site, the page, what it lists or
 * describes, and its breadcrumb trail. `site` is the absolute origin, with no trailing slash.
 */
export function schemaOf(page: Page, site: string): Node {
  const url = (path: string) => `${site}${path}`;
  const ids = { site: url('/#website'), org: url('/#organization'), page: url(canonicalOf(page)) };

  const cafeRef = (city: City, cafe: Cafe): Node => ({
    '@type': 'CafeOrCoffeeShop',
    '@id': `${url(routeHref(city.id, { kind: 'cafe', slug: cafe.slug }))}#place`,
    name: cafe.name,
    url: url(routeHref(city.id, { kind: 'cafe', slug: cafe.slug })),
  });
  const list = (items: Node[]): Node => ({
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, item })),
  });

  const graph: Node[] = [
    {
      '@type': 'WebSite',
      '@id': ids.site,
      url: url('/'),
      name: config.name,
      inLanguage: 'en',
      publisher: { '@id': ids.org },
    },
    { '@type': 'Organization', '@id': ids.org, name: config.name, url: url('/'), logo: url(asset('icon-512.png')) },
  ];

  const webPage: Node = {
    '@type': page.kind === 'cafe' ? 'WebPage' : 'CollectionPage',
    '@id': ids.page,
    url: ids.page,
    name: titleOf(page),
    description: descriptionOf(page),
    inLanguage: 'en',
    isPartOf: { '@id': ids.site },
    breadcrumb: { '@id': `${ids.page}#breadcrumb` },
  };

  if (page.kind === 'home') {
    webPage.mainEntity = list(CITY_ORDER.map((id) => ({ '@type': 'City', name: CITIES[id].name, url: url(routeHref(id)) })));
  } else if (page.kind === 'city' || page.kind === 'list') {
    webPage.about = { '@type': 'City', name: page.city.name };
    webPage.mainEntity = list(page.city.cafes.map((c) => cafeRef(page.city, c)));
  } else if (page.kind === 'area') {
    webPage.about = { '@type': 'Place', name: page.area, containedInPlace: { '@type': 'City', name: page.city.name } };
    webPage.mainEntity = list(page.cafes.map((c) => cafeRef(page.city, c)));
  } else {
    const { city, cafe } = page;
    webPage.mainEntity = {
      ...cafeRef(city, cafe),
      ...(cafe.logo && { image: url(asset(cafe.logo)) }),
      address: { '@type': 'PostalAddress', streetAddress: cafe.address, addressLocality: city.name, addressCountry: city.country },
      geo: { '@type': 'GeoCoordinates', latitude: cafe.lat, longitude: cafe.lon },
      hasMap: cafe.maps_url,
      containedInPlace: { '@type': 'Place', name: cafe.area },
    };
  }

  graph.push(webPage, {
    '@type': 'BreadcrumbList',
    '@id': `${ids.page}#breadcrumb`,
    itemListElement: crumbsOf(page).map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, name: crumb.name, item: url(crumb.path) })),
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Keeps a JSON-LD block from closing its own script tag. */
export function jsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
