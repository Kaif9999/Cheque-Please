import type { Cafe, Crowd, ZoneId } from './types';

export interface Zone {
  id: ZoneId;
  label: string;
  blurb: string;
  color: string;
}

export const ZONES: Record<ZoneId, Zone> = {
  big: { id: 'big', label: 'Multi-stage funds', blurb: 'Partners at funds that write seed through growth cheques', color: '#E0457B' },
  first: { id: 'first', label: 'Seed funds', blurb: 'Institutional pre-seed and seed investors', color: '#EE9A1F' },
  angel: { id: 'angel', label: 'Angels & operators', blurb: 'Angels, solo GPs and founders who invest', color: '#4C6BF5' },
  cohort: { id: 'cohort', label: 'Accelerators', blurb: 'Accelerator and programme partners', color: '#17A07C' },
  scene: { id: 'scene', label: 'Founder hangouts', blurb: 'Founders post about meetings here; no investor named yet', color: '#8A8174' },
};

/** Tie-break order: the bigger cheque wins. */
const CROWD_RANK: Crowd[] = ['big', 'first', 'angel', 'cohort'];

export function zoneOf(cafe: Cafe): ZoneId {
  if (cafe.vcs.length === 0) return 'scene';
  const counts = new Map<Crowd, number>();
  for (const vc of cafe.vcs) counts.set(vc.crowd, (counts.get(vc.crowd) ?? 0) + 1);
  // Walk in rank order and only switch on a strictly higher count, so ties keep the bigger cheque.
  const first = CROWD_RANK.find((c) => counts.has(c))!;
  return CROWD_RANK.reduce((best, c) => ((counts.get(c) ?? 0) > counts.get(best)! ? c : best), first);
}

export function receiptsOf(cafe: Cafe): number {
  return cafe.vcs.length + cafe.scene.length;
}

export interface CityStats {
  cafes: number;
  investors: number;
  receipts: number;
}

export function statsOf(cafes: Cafe[]): CityStats {
  const people = new Set<string>();
  for (const cafe of cafes) for (const vc of cafe.vcs) people.add((vc.handle ?? vc.name).toLowerCase());
  return {
    cafes: cafes.length,
    investors: people.size,
    receipts: cafes.reduce((sum, c) => sum + receiptsOf(c), 0),
  };
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "3 cafés · 5 investors · 7 public receipts" */
export function statsLine(s: CityStats): string {
  return [plural(s.cafes, 'café'), plural(s.investors, 'investor'), plural(s.receipts, 'public receipt')].join(' · ');
}

/** Zones present in a city, most cafés first. */
export function zonesIn(cafes: Cafe[]): { zone: Zone; count: number }[] {
  const counts = new Map<ZoneId, number>();
  for (const cafe of cafes) {
    const z = zoneOf(cafe);
    counts.set(z, (counts.get(z) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ zone: ZONES[id], count }))
    .sort((a, b) => b.count - a.count || Object.keys(ZONES).indexOf(a.zone.id) - Object.keys(ZONES).indexOf(b.zone.id));
}
