import type { Cafe, ZoneId } from '@/domain/types';
import { zonesIn } from '@/domain/zones';
import { html, type Html } from '@/lib/html';
import { zoneDot } from '../components/zone';

/** A chip on phones, a row in the card on wide screens. */
const ITEM =
  'group inline-flex h-8 flex-none cursor-pointer items-center gap-2 rounded-full border-0 bg-white bg-linear-to-b from-white to-[#f3f0e9] px-3 text-[13px] font-medium text-ink shadow-raised transition-[box-shadow,translate] duration-150 active:translate-y-px active:shadow-pressed aria-pressed:from-[#3d3931] aria-pressed:to-ink aria-pressed:text-white aria-pressed:shadow-raised-ink lg:h-9 lg:w-full lg:rounded-[11px] lg:bg-transparent lg:bg-none lg:px-2.5 lg:text-[13.5px] lg:shadow-none lg:hover:bg-sunk lg:aria-pressed:bg-ink lg:aria-pressed:bg-linear-to-b lg:aria-pressed:shadow-raised-ink';
const COUNT = 'tabular-nums text-ink-3 group-aria-pressed:text-white/60 lg:ml-auto';

/** The map's key, which doubles as its filter: pick a kind of investor to see only their cafés. */
export function renderLegend(cafes: Cafe[], filter: ZoneId | null): Html {
  const zones = zonesIn(cafes).map(
    ({ zone, count }) =>
      html`<button type="button" class="${ITEM}" data-filter="${zone.id}" aria-pressed="${String(filter === zone.id)}" title="${zone.blurb}">${zoneDot(zone.id, 'size-2.5', 'group-aria-pressed:shadow-[0_0_0_1.5px_white]')}${zone.label}<span class="${COUNT}">${count}</span></button>`,
  );
  return html`
    <p class="hidden px-2.5 pb-1 pt-1.5 text-[12.5px] font-semibold text-ink-3 lg:block">Who has been seen here</p>
    <div class="flex gap-1.5 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] lg:flex-col lg:gap-px lg:overflow-visible lg:p-0 [&::-webkit-scrollbar]:hidden" role="toolbar" aria-label="Show cafés by who meets there">
      <button type="button" class="${ITEM}" data-filter="" aria-pressed="${String(!filter)}">All cafés<span class="${COUNT}">${cafes.length}</span></button>
      ${zones}
    </div>`;
}
