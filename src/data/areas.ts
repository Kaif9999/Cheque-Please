import type { Cafe, ZoneId } from './types';
import { ZONES, zoneOf } from './zones';

export interface AreaZone {
  area: string;
  zone: ZoneId;
  center: [number, number];
  /** Metres from the centre that cover every café in the area, plus a margin. */
  radius: number;
  cafes: number;
}

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function distance([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const ZONE_ORDER = Object.keys(ZONES) as ZoneId[];

/** The zone most of an area's cafés fall in; ties go to the bigger cheque, so the map agrees with the legend. */
function dominantZone(list: Cafe[]): ZoneId {
  const counts = new Map<ZoneId, number>();
  for (const c of list) counts.set(zoneOf(c), (counts.get(zoneOf(c)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || ZONE_ORDER.indexOf(a[0]) - ZONE_ORDER.indexOf(b[0]))[0][0];
}

/** One soft zone per neighbourhood. */
export function areasOf(cafes: Cafe[]): AreaZone[] {
  const groups = new Map<string, Cafe[]>();
  for (const c of cafes) groups.set(c.area, [...(groups.get(c.area) ?? []), c]);
  return [...groups.entries()].map(([area, list]) => {
    const center: [number, number] = [
      list.reduce((s, c) => s + c.lon, 0) / list.length,
      list.reduce((s, c) => s + c.lat, 0) / list.length,
    ];
    const spread = Math.max(...list.map((c) => distance(center, [c.lon, c.lat])));
    return { area, zone: dominantZone(list), center, radius: Math.max(520, spread + 380), cafes: list.length };
  });
}

/** Closed ring of [lon, lat] points approximating a circle on the ground. */
export function circle([lon, lat]: [number, number], radius: number, steps = 72): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const dLat = (radius * Math.cos(t)) / R;
    const dLon = (radius * Math.sin(t)) / (R * Math.cos(rad(lat)));
    ring.push([lon + (dLon * 180) / Math.PI, lat + (dLat * 180) / Math.PI]);
  }
  return ring;
}
