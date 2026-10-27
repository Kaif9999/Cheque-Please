import { followable } from '@/domain/people';
import { routeHref } from '@/domain/routes';
import type { City, CityId } from '@/domain/types';
import { html, raw, type Html } from '@/lib/html';
import { icon } from '@/lib/icons';
import { btn } from '../components/button';

/** Shortcuts in the top bar once the cover has cleared (wide screens). */
export function renderTopActions(city: City): Html {
  const toFollow = followable(city.cafes).length;
  return html`
    <button type="button" class="${btn()}" data-open-list>${icon('list')}All cafés</button>
    ${toFollow > 0 && html`<button type="button" class="${btn({ primary: true })}" data-follow-all>${icon('x', 13)}Follow all ${toFollow}</button>`}`;
}

/** The phone's way into the list, floating at the bottom of the map. */
export function renderListPill(city: City): Html {
  return html`${icon('list', 17)}All ${city.cafes.length} cafés`;
}

/** The city switch: a segmented control on wide screens, the phone's own picker on narrow ones. */
export function renderCitySwitch(cities: City[], current: CityId): Html {
  return html`
    <div class="hidden rounded-full bg-[#ebe7de]/95 p-[3px] shadow-[inset_0_1px_2px_rgb(23_21_17/0.12),var(--shadow-float)] lg:flex">
      ${cities.map((c) => html`<a class="seg-opt" data-city="${c.id}" href="${routeHref(c.id)}" aria-current="${String(c.id === current)}">${c.name}</a>`)}
    </div>
    <label class="relative lg:hidden">
      <span class="sr-only">City</span>
      <select
        id="city-select"
        class="h-9 cursor-pointer appearance-none rounded-full border-0 bg-white bg-linear-to-b from-white to-[#f3f0e9] pl-3.5 pr-8 text-[14px] font-[550] text-ink shadow-raised"
      >
        ${cities.map((c) => html`<option value="${c.id}"${c.id === current && raw(' selected')}>${c.name}</option>`)}
      </select>
      <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-2">${icon('down', 14)}</span>
    </label>`;
}
