import { circle, hull, type LngLat } from './geo';
import { slugify } from './routes';
import type { Cafe, Outline, ZoneId } from './types';
import { ZONE_ORDER, zoneOf } from './zones';

export interface AreaZone {
  area: string;
  zone: ZoneId;
  center: LngLat;
  /** The neighbourhood's outline, or a ring hugging its cafés when it has none. */
  outline: Outline;
  /** Northernmost point of the outline, where the area's label sits. */
  top: LngLat;
  cafes: number;
}

/** How far the zone reaches past its outermost cafés, in metres. */
const PAD = 320;
/** Corners on each café's ring: few enough that the outline reads as a drawn block, not a bubble. */
const SIDES = 10;

/** The zone most of an area's cafés fall in; ties go to the bigger cheque, so the map agrees with the filters. */
function dominantZone(list: Cafe[]): ZoneId {
  const counts = new Map<ZoneId, number>();
  for (const c of list) counts.set(zoneOf(c), (counts.get(zoneOf(c)) ?? 0) + 1);
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1] || ZONE_ORDER.indexOf(a[0]) - ZONE_ORDER.indexOf(b[0]));
  return best?.[0] ?? 'scene';
}

export function groupByArea(cafes: Cafe[]): Map<string, Cafe[]> {
  const groups = new Map<string, Cafe[]>();
  for (const c of cafes) groups.set(c.area, [...(groups.get(c.area) ?? []), c]);
  return groups;
}

/** A neighbourhood gets its own page once it has this many cafés; one café is just that café's page. */
export const AREA_PAGE_MIN = 2;

/** The neighbourhoods with a page of their own, biggest first. */
export function areaPages(cafes: Cafe[]): [string, Cafe[]][] {
  return [...groupByArea(cafes)]
    .filter(([, list]) => list.length >= AREA_PAGE_MIN)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

/** The neighbourhood a slug names, as the data spells it. */
export function areaNamed(cafes: Cafe[], slug: string): string | undefined {
  return cafes.find((c) => slugify(c.area) === slug)?.area;
}

/** A ring hugging the cafés: few enough corners that it reads as a drawn block, not a bubble. */
export function ringAround(cafes: Cafe[]): Outline {
  return { type: 'Polygon', coordinates: [hull(cafes.flatMap((c) => circle([c.lon, c.lat], PAD, SIDES).slice(0, -1)))] };
}

/** One zone per neighbourhood, on its outline when it has one. */
export function areasOf(cafes: Cafe[], outlines: Record<string, Outline> = {}): AreaZone[] {
  return [...groupByArea(cafes)].map(([area, list]) => {
    const center: LngLat = [list.reduce((s, c) => s + c.lon, 0) / list.length, list.reduce((s, c) => s + c.lat, 0) / list.length];
    const outline = outlines[area] ?? ringAround(list);
    const outer = outline.type === 'Polygon' ? [outline.coordinates[0]!] : outline.coordinates.map((p) => p[0]!);
    const top = outer.flat().reduce((best, p) => (p[1] > best[1] ? p : best));
    return { area, zone: dominantZone(list), center, outline, top, cafes: list.length };
  });
}
