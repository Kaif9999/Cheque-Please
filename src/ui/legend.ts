import type { Cafe, ZoneId } from '../data/types';
import { zonesIn } from '../data/zones';
import { esc } from './dom';

export function renderLegend(cafes: Cafe[], active: ZoneId | null): string {
  return zonesIn(cafes)
    .map(
      ({ zone, count }) => `<button type="button" class="zone-row" data-zone="${zone.id}" aria-pressed="${active === zone.id}" title="${esc(zone.blurb)}">
        <span class="zone-swatch${zone.id === 'scene' ? ' zone-swatch--hollow' : ''}" style="--zone:${zone.color}"></span>
        <span class="zone-row-label">${esc(zone.label)}</span>
        <span class="zone-row-count">${count}</span>
      </button>`,
    )
    .join('');
}
