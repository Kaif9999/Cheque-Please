import type { Cafe, Investor } from '../data/types';
import { plural, receiptsOf, ZONES, zoneOf } from '../data/zones';
import { avatar, esc } from './dom';

/** Unique investors across cafés, those with photos first so the stack reads as faces. */
export function facesOf(cafes: Cafe[]): Investor[] {
  const seen = new Map<string, Investor>();
  for (const vc of cafes.flatMap((c) => c.vcs)) {
    const key = (vc.handle ?? vc.name).toLowerCase();
    if (!seen.has(key)) seen.set(key, vc);
  }
  return [...seen.values()].sort((a, b) => Number(!!b.avatar) - Number(!!a.avatar));
}

function faces(people: Investor[], max: number): string {
  const shown = people
    .slice(0, max)
    .map((p) => `<span class="face" title="${esc(p.name)}">${avatar(p.name, p.avatar, 30)}</span>`)
    .join('');
  return shown + (people.length > max ? `<span class="face face--more">+${people.length - max}</span>` : '');
}

export function cafeCard(cafe: Cafe): string {
  const people = facesOf([cafe]);
  const body = people.length
    ? faces(people, 3)
    : `<span class="spot-scene">Scene · ${esc(plural(receiptsOf(cafe), 'receipt'))}</span>`;
  return `<span class="spot-card"><span class="spot-name">${esc(cafe.name)}</span><span class="spot-faces">${body}</span></span><span class="spot-tail" aria-hidden="true"></span>`;
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

export function clusterCard(cafes: Cafe[]): string {
  const people = facesOf(cafes);
  const areas = new Set(cafes.map((c) => c.area));
  const title = areas.size === 1 ? cafes[0].area : `${mostCommon(cafes.map((c) => c.area))} +${areas.size - 1}`;
  const body = people.length ? faces(people, 3) : `<span class="spot-scene">Scene only</span>`;
  return `<span class="stack-card">
    <span class="stack-count">×${cafes.length}</span>
    <span class="spot-name">${esc(title)}</span>
    <span class="stack-meta">${esc(plural(cafes.length, 'café'))} · ${esc(plural(people.length, 'investor'))}</span>
    <span class="spot-faces">${body}</span>
  </span>`;
}

export function zonePill(zoneId: ReturnType<typeof zoneOf>): string {
  const zone = ZONES[zoneId];
  return `<span class="zone-pill" style="--zone:${zone.color}"><span class="zone-dot${zoneId === 'scene' ? ' zone-dot--hollow' : ''}"></span>${esc(zone.label)}</span>`;
}
