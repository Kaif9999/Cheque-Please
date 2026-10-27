import { circle, hull, type LngLat } from './geo';
import type { Cafe, ZoneId } from './types';
import { ZONE_ORDER, zoneOf } from './zones';

export interface AreaZone {
  area: string;
  zone: ZoneId;
  center: LngLat;
  /** Closed ring hugging the area's cafés: a rounded hull, so a street of cafés reads as a street. */
  shape: LngLat[];
  /** Northernmost point of the shape, where the area's label sits. */
  top: LngLat;
  cafes: number;
}

/** How far the zone reaches past its outermost cafés, in metres. */
const PAD = 420;

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

/** One zone per neighbourhood. */
export function areasOf(cafes: Cafe[]): AreaZone[] {
  return [...groupByArea(cafes)].map(([area, list]) => {
    const center: LngLat = [list.reduce((s, c) => s + c.lon, 0) / list.length, list.reduce((s, c) => s + c.lat, 0) / list.length];
    const shape = hull(list.flatMap((c) => circle([c.lon, c.lat], PAD, 32).slice(0, -1)));
    const top = shape.reduce((best, p) => (p[1] > best[1] ? p : best));
    return { area, zone: dominantZone(list), center, shape, top, cafes: list.length };
  });
}
