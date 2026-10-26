import type { Cafe, City } from '../data/types';
import { plural, receiptsOf, ZONES, zoneOf } from '../data/zones';
import { config, issueUrl } from '../config';
import { esc } from './dom';

export const DISCLAIMER =
  'Every pin links to a public tweet or article, and a receipt shows someone was there once, not that they will be there tomorrow — anyone listed can ask to be removed.';

export function creditLine(): string {
  const parts = ['Cheque, Please'];
  if (config.maker) parts.push(`made by ${esc(config.maker)}`);
  parts.push('idea borrowed from meetvc.cafe', 'map © OpenStreetMap contributors, tiles by OpenFreeMap');
  return parts.join(' · ');
}

function row(cafe: Cafe): string {
  const zone = zoneOf(cafe);
  const handles = cafe.vcs.map((v) => (v.handle ? `@${v.handle}` : v.name));
  const who = handles.length ? handles.slice(0, 3).join(', ') + (handles.length > 3 ? ` +${handles.length - 3}` : '') : 'Scene only';
  return `<li>
    <button type="button" class="list-row" data-slug="${esc(cafe.slug)}">
      <span class="zone-dot${zone === 'scene' ? ' zone-dot--hollow' : ''}" style="--zone:${ZONES[zone].color}"></span>
      <span class="list-main">
        <span class="list-name">${esc(cafe.name)} <span class="list-branch">${esc(cafe.branch)}</span></span>
        <span class="list-who">${esc(who)}</span>
      </span>
      <span class="list-count" title="${esc(plural(receiptsOf(cafe), 'receipt'))}">${receiptsOf(cafe)}</span>
    </button>
  </li>`;
}

export function renderList(city: City, cafes: Cafe[]): string {
  const byArea = new Map<string, Cafe[]>();
  for (const cafe of [...cafes].sort((a, b) => receiptsOf(b) - receiptsOf(a) || a.name.localeCompare(b.name))) {
    byArea.set(cafe.area, [...(byArea.get(cafe.area) ?? []), cafe]);
  }
  const areas = [...byArea.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const add = issueUrl({ city: city.name, request: 'Add a receipt' });
  const groups = areas
    .map(([area, list]) => `<section class="list-group"><h3>${esc(area)} <span>${list.length}</span></h3><ol>${list.map(row).join('')}</ol></section>`)
    .join('');
  const empty = `<p class="empty">No cafés here yet. Seen one with a receipt?${add ? ` <a href="${esc(add)}" target="_blank" rel="noopener noreferrer">Add it.</a>` : ' Add it.'}</p>`;
  return `${cafes.length ? groups : empty}
    <footer class="list-foot">
      ${add && cafes.length ? `<a class="btn btn--small btn--ghost" href="${esc(add)}" target="_blank" rel="noopener noreferrer">Add a receipt</a>` : ''}
      <p>${esc(DISCLAIMER)}</p>
      <p class="credit">${creditLine()}</p>
    </footer>`;
}
