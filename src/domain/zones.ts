import { investorsAt } from './people';
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

/** Display and tie-break order: the bigger cheque first. */
export const ZONE_ORDER = Object.keys(ZONES) as ZoneId[];
const CROWD_RANK: Crowd[] = ['big', 'first', 'angel', 'cohort'];

/** A café's zone is the crowd most of its investors belong to; ties go to the bigger cheque. */
export function zoneOf(cafe: Cafe): ZoneId {
  if (cafe.vcs.length === 0) return 'scene';
  const counts = new Map<Crowd, number>();
  for (const vc of cafe.vcs) counts.set(vc.crowd, (counts.get(vc.crowd) ?? 0) + 1);
  // Walk in rank order and only switch on a strictly higher count, so ties keep the bigger cheque.
  const first = CROWD_RANK.find((c) => counts.has(c)) ?? 'big';
  return CROWD_RANK.reduce((best, c) => ((counts.get(c) ?? 0) > (counts.get(best) ?? 0) ? c : best), first);
}

export interface CityStats {
  cafes: number;
  investors: number;
}

export function statsOf(cafes: Cafe[]): CityStats {
  return { cafes: cafes.length, investors: investorsAt(cafes).length };
}

/** Zones present among the cafés, most cafés first. */
export function zonesIn(cafes: Cafe[]): { zone: Zone; count: number }[] {
  const counts = new Map<ZoneId, number>();
  for (const cafe of cafes) counts.set(zoneOf(cafe), (counts.get(zoneOf(cafe)) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => ({ zone: ZONES[id], count }))
    .sort((a, b) => b.count - a.count || ZONE_ORDER.indexOf(a.zone.id) - ZONE_ORDER.indexOf(b.zone.id));
}
