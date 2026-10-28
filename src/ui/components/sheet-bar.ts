import { routeHref } from '@/domain/routes';
import type { City } from '@/domain/types';
import { html, type Html } from '@/lib/html';
import { icon } from '@/lib/icons';
import { roundBtn } from './button';

/** The panel's way back to the city's full list. */
export function backToList(city: City): Html {
  return html`<a class="inline-flex items-center gap-0.5 rounded-lg py-1.5 pl-1 pr-2.5 text-sm font-medium text-ink-2 no-underline hover:bg-sunk hover:text-ink" href="${routeHref(city.id, { kind: 'list' })}">${icon('back')}All ${city.name} cafés</a>`;
}

/** The panel's top row: whatever `start` holds, and a close button. Stays put while the panel scrolls. */
export function sheetBar(start: Html): Html {
  return html`<div class="sticky top-0 z-[2] flex h-14 items-center justify-between gap-2 bg-paper/90 pl-3 pr-3 backdrop-blur-md">
    ${start}
    <button type="button" class="${roundBtn()}" data-close-sheet aria-label="Close">${icon('close', 18)}</button>
  </div>`;
}
