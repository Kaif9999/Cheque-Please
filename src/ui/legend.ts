import type { Cafe, ZoneId } from '../data/types';
import { zonesIn } from '../data/zones';
import { esc } from './dom';

export function renderLegend(cafes: Cafe[], active: ZoneId | null): string {
  return zonesIn(cafes)
    .map(
      ({ zone, count }) => `<button type="button" class="chip" data-zone="${zone.id}" aria-pressed="${active === zone.id}" title="${esc(zone.blurb)}">
        <span class="zone-dot${zone.id === 'scene' ? ' zone-dot--hollow' : ''}" style="--zone:${zone.color}"></span>${esc(zone.label)}<span class="chip-count">${count}</span>
      </button>`,
    )
    .join('');
}
