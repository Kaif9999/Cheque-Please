import type { Investor } from '@/domain/types';
import { ZONES } from '@/domain/zones';
import { html, type Html } from '@/lib/html';
import { avatar } from './avatar';

const SIZES = {
  /** On a map card. */
  card: { tile: 'size-9 rounded-[9px] text-[11px]', badge: 'size-[13px] rounded-[4px] -bottom-[3px] -right-[3px]', gap: 'gap-1' },
  /** In a list row. */
  row: { tile: 'size-7 rounded-[7px] text-[9px]', badge: 'size-[11px] rounded-[3.5px] -bottom-[3px] -right-[3px]', gap: 'gap-[3px]' },
};

/**
 * Square photos of who was seen, each with the colour of the cheques they write in its corner.
 * Past `max` the last tile counts the rest. Inside a selected marker the tiles invert to suit its dark card.
 */
export function faces(people: Investor[], size: keyof typeof SIZES, max = 3): Html {
  const { tile, badge, gap } = SIZES[size];
  const shown = people.length > max ? people.slice(0, max) : people;
  const more = people.length - shown.length;
  return html`<span class="flex flex-none ${gap}">
    ${shown.map(
      (p) => html`<span class="relative flex-none">
        ${avatar(p, `${tile} shadow-[inset_0_0_0_1px_rgb(23_21_17/0.06)]`)}
        <span class="absolute ${badge} border-2 border-white group-[.is-selected]:border-ink" style="background:${ZONES[p.crowd].color}" title="${ZONES[p.crowd].label}"></span>
      </span>`,
    )}
    ${more > 0 && html`<span class="${tile} grid flex-none place-items-center bg-ink font-bold text-white tabular-nums group-[.is-selected]:bg-white group-[.is-selected]:text-ink">+${more}</span>`}
  </span>`;
}
