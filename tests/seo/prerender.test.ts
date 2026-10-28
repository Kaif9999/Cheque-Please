import { describe, expect, it } from 'vitest';
import { CITIES } from '@/data/cities';
import { allPages, pathOf } from '@/seo/pages';
import { buildSite, newestPost, renderPage, robots, sitemap, siteOrigin } from '@/seo/prerender';
import { jsonForScript, schemaOf } from '@/seo/schema';

const SITE = 'https://example.test';
const city = CITIES.bengaluru;
const cafe = city.cafes.find((c) => c.vcs.length > 0)!;

describe('schemaOf', () => {
  it('describes a café as a place with its address, position and map', () => {
    const graph = schemaOf({ kind: 'cafe', city, cafe }, SITE)['@graph'] as Record<string, unknown>[];
    const page = graph.find((n) => n['@type'] === 'WebPage')!;
    const place = page.mainEntity as Record<string, unknown>;
    expect(place['@type']).toBe('CafeOrCoffeeShop');
    expect(place.url).toBe(`${SITE}/bengaluru/${cafe.slug}/`);
    expect(place.geo).toEqual({ '@type': 'GeoCoordinates', latitude: cafe.lat, longitude: cafe.lon });
    expect((place.address as Record<string, string>).addressCountry).toBe('IN');
    expect(graph.some((n) => n['@type'] === 'BreadcrumbList')).toBe(true);
  });

  it('lists every café on a city page', () => {
    const graph = schemaOf({ kind: 'city', city }, SITE)['@graph'] as Record<string, unknown>[];
    const list = (graph.find((n) => n['@type'] === 'CollectionPage')!.mainEntity as { numberOfItems: number }).numberOfItems;
    expect(list).toBe(city.cafes.length);
  });

  it('cannot close its own script tag', () => {
    expect(jsonForScript({ text: '</script><script>' })).not.toContain('</script>');
  });
});

describe('renderPage', () => {
  it('opens the panel on a café, with its heading drawn', () => {
    const page = renderPage({ kind: 'cafe', city, cafe }, SITE);
    expect(page.path).toBe(`/bengaluru/${cafe.slug}/`);
    expect(page.sheet).toBe('open');
    expect(page.regions['sheet-body']).toContain(cafe.name);
    expect(page.head).toContain(`<link rel="canonical" href="${SITE}/bengaluru/${cafe.slug}/" />`);
    expect(page.head).toContain(`${SITE}/og/bengaluru.jpg`);
  });

  it('leaves the cover up on a city page, with every café linked from the closed list', () => {
    const page = renderPage({ kind: 'city', city }, SITE);
    expect(page.mode).toBe('intro');
    for (const c of city.cafes) expect(page.regions['sheet-body']).toContain(`href="/bengaluru/${c.slug}/"`);
  });
});

describe('the sitemap and robots.txt', () => {
  const pages = allPages();
  const xml = sitemap(pages, SITE);

  it('lists every page but the lists, which point at their city', () => {
    for (const page of pages) expect(xml.includes(`<loc>${SITE}${pathOf(page)}</loc>`), pathOf(page)).toBe(page.kind !== 'list');
  });

  it('points crawlers at the sitemap', () => {
    expect(robots(SITE)).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  it('dates a page by its newest post', () => {
    const withDates = { ...cafe, vcs: [{ ...cafe.vcs[0]!, proof: { ...cafe.vcs[0]!.proof, date: 'Mar 15, 2024' } }], scene: [] };
    expect(newestPost([withDates])).toBe('2024-03-15');
    expect(newestPost([{ ...withDates, vcs: [] }])).toBeNull();
  });
});

describe('buildSite', () => {
  it('uses the configured site unless SITE_URL says otherwise, without a trailing slash', () => {
    expect(siteOrigin('https://preview.test/')).toBe('https://preview.test');
    expect(buildSite().files['robots.txt']).toContain('https://vcspotted.com/sitemap.xml');
  });
});
