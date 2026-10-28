import { AREA_PAGE_MIN } from '@/domain/areas';
import { routeHref, slugify } from '@/domain/routes';
import type { City } from '@/domain/types';
import { html, type Html } from '@/lib/html';

/** A neighbourhood's name, linked to its page when it has one. */
export function areaLink(
  city: City,
  area: string,
  cls = 'text-inherit underline decoration-line-2 underline-offset-4 hover:decoration-ink-3',
): Html | string {
  const count = city.cafes.filter((c) => c.area === area).length;
  if (count < AREA_PAGE_MIN) return area;
  return html`<a class="${cls}" href="${routeHref(city.id, { kind: 'area', slug: slugify(area) })}">${area}</a>`;
}
