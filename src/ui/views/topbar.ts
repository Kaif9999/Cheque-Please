import { followable } from '@/domain/people';
import type { City } from '@/domain/types';
import { html, type Html } from '@/lib/html';
import { icon } from '@/lib/icons';
import { btn } from '../components/button';

/** Shortcuts in the top bar once the cover has cleared (wide screens). */
export function renderTopActions(city: City): Html {
  const toFollow = followable(city.cafes).length;
  return html`
    <button type="button" class="${btn({ floating: true })}" data-open-list>${icon('list')}All cafés</button>
    ${toFollow > 0 && html`<button type="button" class="${btn({ primary: true, floating: true })}" data-follow-all>${icon('x', 13)}Follow all ${toFollow}</button>`}`;
}

/** The phone's way into the list, floating at the bottom of the map. */
export function renderListPill(city: City): Html {
  return html`${icon('list', 17)}All ${city.cafes.length} cafés`;
}
