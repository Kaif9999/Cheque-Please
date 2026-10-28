// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { CITIES } from '@/data/cities';
import { areaPages } from '@/domain/areas';
import { followable, investorsAt } from '@/domain/people';
import { routeHref, slugify } from '@/domain/routes';
import { zoneOf } from '@/domain/zones';
import { mount, type Html } from '@/lib/html';
import { renderDetail } from '@/ui/views/detail';
import { renderHero } from '@/ui/views/hero';
import { renderLegend } from '@/ui/views/legend';
import { renderList } from '@/ui/views/list';

const city = CITIES.bengaluru;
let root: HTMLElement;
const render = (content: Html) => mount(root, content);
const rows = () => [...root.querySelectorAll<HTMLAnchorElement>('a[data-slug]')];

beforeEach(() => {
  root = document.createElement('div');
});

describe('the list', () => {
  it('links every café to its own page', () => {
    render(renderList(city, null));
    expect(rows().map((a) => a.dataset.slug)).toEqual(expect.arrayContaining(city.cafes.map((c) => c.slug)));
    expect(rows()).toHaveLength(city.cafes.length);
    for (const a of rows()) expect(a.getAttribute('href')).toBe(routeHref(city.id, { kind: 'cafe', slug: a.dataset.slug! }));
  });

  it('narrows to a zone and offers a way back', () => {
    render(renderList(city, 'first'));
    const expected = city.cafes.filter((c) => zoneOf(c) === 'first');
    expect(rows()).toHaveLength(expected.length);
    expect(root.querySelector('[data-filter=""]')?.textContent).toContain('Show all');
  });

  it('links each neighbourhood with a page of its own', () => {
    render(renderList(city, null));
    const linked = [...root.querySelectorAll<HTMLAnchorElement>('h2 a')].map((a) => a.getAttribute('href'));
    expect(linked).toEqual(areaPages(city.cafes).map(([area]) => routeHref(city.id, { kind: 'area', slug: slugify(area) })));
  });

  it('narrows to one neighbourhood, headed by its name', () => {
    const [area, list] = areaPages(city.cafes)[0]!;
    render(renderList(city, null, area));
    expect(root.querySelector('h1')?.textContent).toBe(area);
    expect(
      rows()
        .map((a) => a.dataset.slug)
        .sort(),
    ).toEqual(list.map((c) => c.slug).sort());
    expect(root.querySelector('[data-follow-area]')).not.toBeNull();
  });
});

describe('the café page', () => {
  const cafe = city.cafes.find((c) => c.vcs.length > 1)!;

  it('shows each investor seen there, with the post that says so', () => {
    render(renderDetail(city, cafe));
    expect(root.querySelector('h1')?.textContent).toBe(cafe.name);
    expect(root.querySelectorAll('article')).toHaveLength(cafe.vcs.length);
    for (const vc of cafe.vcs) expect(root.querySelector(`a[href="${vc.proof.url}"]`)).not.toBeNull();
  });

  it('lists the other cafés in the same area', () => {
    render(renderDetail(city, cafe));
    const nearby = city.cafes.filter((c) => c.area === cafe.area && c !== cafe);
    expect(rows().map((a) => a.dataset.slug)).toEqual(nearby.map((c) => c.slug));
  });
});

describe('the legend', () => {
  it('marks only the active filter as pressed', () => {
    render(renderLegend(city.cafes, 'angel'));
    const pressed = [...root.querySelectorAll('[aria-pressed="true"]')].map((b) => b.getAttribute('data-filter'));
    expect(pressed).toEqual(['angel']);
  });
});

describe('the cover', () => {
  it('counts investors and offers to follow those on X', () => {
    render(renderHero(city));
    expect(root.textContent).toContain(`${investorsAt(city.cafes).length} investors`);
    expect(root.querySelector('[data-follow-all]')?.textContent).toContain(`Follow all ${followable(city.cafes).length}`);
  });
});
