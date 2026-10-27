import type { Cafe, ZoneId } from './types';
import { ZONES, zoneOf } from './zones';

type LngLat = [number, number];

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

/** How far the zone reaches past its outermost cafés. */
const PAD = 420;

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function distance([lon1, lat1]: LngLat, [lon2, lat2]: LngLat): number {
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

/** Andrew's monotone chain; points are close together, so lon/lat can be treated as planar. */
export function hull(points: LngLat[]): LngLat[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: LngLat, a: LngLat, b: LngLat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: LngLat[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: LngLat[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const ring = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  return [...ring, ring[0]];
}

/** One zone per neighbourhood. */
export function areasOf(cafes: Cafe[]): AreaZone[] {
  const groups = new Map<string, Cafe[]>();
  for (const c of cafes) groups.set(c.area, [...(groups.get(c.area) ?? []), c]);
  return [...groups.entries()].map(([area, list]) => {
    const center: LngLat = [
      list.reduce((s, c) => s + c.lon, 0) / list.length,
      list.reduce((s, c) => s + c.lat, 0) / list.length,
    ];
    const shape = hull(list.flatMap((c) => circle([c.lon, c.lat], PAD, 32).slice(0, -1)));
    const top = shape.reduce((best, p) => (p[1] > best[1] ? p : best));
    return { area, zone: dominantZone(list), center, shape, top, cafes: list.length };
  });
}

/** Closed ring of [lon, lat] points approximating a circle on the ground. */
export function circle([lon, lat]: LngLat, radius: number, steps = 72): LngLat[] {
  const ring: LngLat[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const dLat = (radius * Math.cos(t)) / R;
    const dLon = (radius * Math.sin(t)) / (R * Math.cos(rad(lat)));
    ring.push([lon + (dLon * 180) / Math.PI, lat + (dLat * 180) / Math.PI]);
  }
  return ring;
}
