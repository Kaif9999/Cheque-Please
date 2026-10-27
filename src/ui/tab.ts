import { areasOf } from '../data/areas';
import type { Cafe, City } from '../data/types';
import { plural, receiptsOf, statsOf, ZONES, zoneOf, zonesIn } from '../data/zones';
import { config, issueUrl } from '../config';
import { avatar, esc } from './dom';
import { facesOf, zonePill } from './markers';

export const DISCLAIMER =
  'Every pin links to a public tweet or article, and a receipt shows someone was there once, not that they will be there tomorrow — anyone listed can ask to be removed.';

export function creditLine(): string {
  const parts = ['Cheque, Please'];
  if (config.maker) parts.push(`made by ${esc(config.maker)}`);
  parts.push('idea borrowed from meetvc.cafe', 'map © OpenStreetMap contributors, tiles by OpenFreeMap');
  return parts.join(' · ');
}

export function followUrl(handle: string): string {
  return `https://x.com/intent/follow?screen_name=${encodeURIComponent(handle)}`;
}

function person(cafe: Cafe): string {
  const people = facesOf([cafe]);
  if (!people.length) {
    return `<li class="person person--scene">Scene only · ${esc(plural(receiptsOf(cafe), 'public receipt'))}</li>`;
  }
  return people
    .map(
      (p) => `<li class="person">
        ${avatar(p.name, p.avatar, 40)}
        <span class="person-main">
          <span class="person-name">${esc(p.name)}</span>
          <span class="person-fund">${esc(p.fund || (p.handle ? `@${p.handle}` : ''))}</span>
        </span>
        ${p.handle ? `<a class="btn btn--tiny" href="${followUrl(p.handle)}" target="_blank" rel="noopener noreferrer" aria-label="Follow ${esc(p.name)} on X">Follow</a>` : ''}
      </li>`,
    )
    .join('');
}

function row(cafe: Cafe): string {
  const zone = zoneOf(cafe);
  return `<li class="tab-row">
    <button type="button" class="tab-cafe" data-slug="${esc(cafe.slug)}" title="Open the bill with its receipts">
      <span class="zone-dot${zone === 'scene' ? ' zone-dot--hollow' : ''}" style="--zone:${ZONES[zone].color}"></span>
      <span class="tab-cafe-text">
        <span class="tab-cafe-name">${esc(cafe.name)}</span>
        <span class="tab-cafe-branch">${esc(cafe.branch)}</span>
        <span class="tab-cafe-meta">${esc(plural(receiptsOf(cafe), 'receipt'))} · open bill →</span>
      </span>
    </button>
    <ul class="tab-people">${person(cafe)}</ul>
  </li>`;
}

export function renderTab(city: City, cafes: Cafe[], followable: number): string {
  const stats = statsOf(cafes);
  const zones = zonesIn(cafes).length;
  const areas = areasOf(cafes).sort((a, b) => b.cafes - a.cafes || a.area.localeCompare(b.area));
  const add = issueUrl({ city: city.name, request: 'Add a receipt' });
  const blocks = areas
    .map((a) => {
      const list = cafes.filter((c) => c.area === a.area).sort((x, y) => receiptsOf(y) - receiptsOf(x) || x.name.localeCompare(y.name));
      return `<section class="tab-area">
        <div class="tab-area-head">
          <h3>${esc(a.area)}</h3>
          ${zonePill(a.zone)}
          <p>${esc(plural(list.length, 'café'))} · ${esc(plural(facesOf(list).length, 'investor'))}</p>
        </div>
        <ol class="tab-rows">${list.map(row).join('')}</ol>
      </section>`;
    })
    .join('');
  const empty = `<p class="empty">No cafés here yet. Seen one with a receipt?${add ? ` <a href="${esc(add)}" target="_blank" rel="noopener noreferrer">Add it.</a>` : ' Add it.'}</p>`;
  return `
    <header class="tab-hero">
      <p class="eyebrow">Cheque, Please · The full tab</p>
      <h2 class="headline headline--tab">${esc(city.name)}, itemised.</h2>
      <p class="tab-lede">${esc(plural(zones, 'zone'))} · ${esc(plural(stats.cafes, 'café'))} · ${esc(plural(stats.investors, 'investor'))}. Every name is backed by a public receipt. Tap a café for its bill.</p>
      <div class="actions no-print">
        ${followable ? `<button type="button" class="btn" data-open-follow>Follow the ${followable} on X</button>` : ''}
        <button type="button" class="btn btn--ghost" data-copy-link>Copy link</button>
        <button type="button" class="btn btn--ghost" data-print title="Opens the print dialog: choose “Save as PDF”">Save as PDF</button>
      </div>
    </header>
    <div class="tab-cols" aria-hidden="true"><span>Neighbourhood</span><span>Café</span><span>Investors on record</span></div>
    ${cafes.length ? blocks : empty}
    <footer class="tab-foot">
      ${add && cafes.length ? `<a class="btn btn--small btn--ghost no-print" href="${esc(add)}" target="_blank" rel="noopener noreferrer">Add a receipt</a>` : ''}
      <p>${esc(DISCLAIMER)}</p>
      <p class="credit">${creditLine()}</p>
    </footer>`;
}
