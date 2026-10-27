import { followable, investorsAt } from '@/domain/people';
import { routeHref } from '@/domain/routes';
import type { Cafe, City, CityId, Investor, SceneItem } from '@/domain/types';
import { ZONES, zoneOf } from '@/domain/zones';
import { html, type Html } from '@/lib/html';
import { icon } from '@/lib/icons';
import { followUrl, hostOf } from '@/lib/links';
import { plural } from '@/lib/text';
import { DISPLAY, MX, PX } from '../classes';
import { avatar } from '../components/avatar';
import { btn } from '../components/button';
import { logo } from '../components/logo';
import { post } from '../components/post';
import { sheetBar } from '../components/sheet-bar';
import { zoneDot } from '../components/zone';

const BLOCK = `${PX} pb-1 pt-7`;
const BLOCK_TITLE = 'mb-3.5 flex items-baseline gap-1.5 font-display text-[17px] font-semibold tracking-[-0.015em]';
const BLOCK_COUNT = 'font-medium text-ink-3';

/** The post that puts an investor at the café, attributed to whoever wrote it. */
function proofOf(vc: Investor): Html {
  const p = vc.proof;
  const base = { date: p.date, text: p.text, url: p.url, indent: true };
  if (p.kind === 'own') return post({ ...base, name: vc.name, handle: vc.handle, avatar: vc.avatar });
  if (p.kind === 'spotted') {
    return post({ ...base, name: p.author ?? 'Someone', handle: p.authorHandle, tag: `Spotted ${vc.name.split(' ')[0]}` });
  }
  return post({ ...base, name: p.author ?? hostOf(p.url), handle: null });
}

function person(vc: Investor): Html {
  return html`<article class="border-t border-line py-4 first-of-type:border-t-0 first-of-type:pt-0">
    <div class="flex items-center gap-3">
      ${avatar(vc, 'size-11 rounded-full text-sm')}
      <div class="flex min-w-0 flex-1 flex-col">
        <span class="text-[15.5px] font-semibold leading-[1.3]">${vc.name}</span>
        <span class="truncate text-[13.5px] text-ink-2">${vc.fund || (vc.handle ? `@${vc.handle}` : 'Investor')}</span>
      </div>
      ${vc.handle && html`<a class="${btn({ size: 'small' })}" href="${followUrl(vc.handle)}" target="_blank" rel="noopener noreferrer">${icon('x', 12)}Follow</a>`}
    </div>
    ${proofOf(vc)}
  </article>`;
}

function scenePost(item: SceneItem): Html {
  return post({ name: item.author, handle: item.authorHandle, date: item.date, text: item.text, url: item.url });
}

function nearbyRow(cityId: CityId, cafe: Cafe): Html {
  return html`<li><a class="-mx-2 flex items-center gap-3 rounded-xl p-2 no-underline hover:bg-sunk [&.is-hover]:bg-sunk" href="${routeHref(cityId, { kind: 'cafe', slug: cafe.slug })}" data-slug="${cafe.slug}">
    ${logo(cafe, 'size-9 rounded-[10px] text-lg shadow-[inset_0_0_0_1px_var(--color-line)]')}
    <span class="flex flex-1 flex-col text-[14.5px] font-[550]">${cafe.name}<small class="text-[13px] font-normal text-ink-2">${cafe.branch}</small></span>
    <span class="text-ink-3">${icon('forward', 14)}</span>
  </a></li>`;
}

/** A café's page: who was seen there, the posts that say so, and its neighbours. */
export function renderDetail(city: City, cafe: Cafe): Html {
  const zone = ZONES[zoneOf(cafe)];
  const toFollow = followable([cafe]).length;
  const nearby = city.cafes.filter((c) => c.area === cafe.area && c !== cafe);
  const sources = cafe.vcs.length + cafe.scene.length;

  const investors =
    cafe.vcs.length > 0 &&
    html`<section class="${BLOCK}"><h2 class="${BLOCK_TITLE}">Investors seen here <span class="${BLOCK_COUNT}">${investorsAt([cafe]).length}</span></h2>${cafe.vcs.map(person)}</section>`;
  const scene =
    cafe.scene.length > 0 &&
    html`<section class="${BLOCK}"><h2 class="${BLOCK_TITLE}">${cafe.vcs.length ? 'What founders say' : 'What founders say about it'} <span class="${BLOCK_COUNT}">${cafe.scene.length}</span></h2><div class="grid gap-2.5">${cafe.scene.map(scenePost)}</div></section>`;
  const neighbours =
    nearby.length > 0 &&
    html`<section class="${BLOCK}"><h2 class="${BLOCK_TITLE}">Also in ${cafe.area}</h2><ul class="m-0 grid list-none gap-0.5 p-0">${nearby.map((c) => nearbyRow(city.id, c))}</ul></section>`;

  return html`
    ${sheetBar(html`<a class="inline-flex items-center gap-0.5 rounded-lg py-1.5 pl-1 pr-2.5 text-sm font-medium text-ink-2 no-underline hover:bg-sunk hover:text-ink" href="${routeHref(city.id, { kind: 'list' })}">${icon('back')}All ${city.name} cafés</a>`)}
    <header class="flex items-center gap-4 ${PX} pt-2">
      ${logo(cafe, 'size-[60px] rounded-2xl text-3xl shadow-[inset_0_0_0_1px_var(--color-line)]')}
      <div class="min-w-0">
        <h1 class="${DISPLAY} text-[28px] leading-[1.02]">${cafe.name}</h1>
        <p class="mt-1.5 text-[14.5px] text-ink-2">${cafe.branch}, ${cafe.area}</p>
      </div>
    </header>
    <p class="${MX} mt-4 flex items-center gap-2 text-[13.5px] text-ink-2">${zoneDot(zone.id)}${zone.label}<span class="size-[3px] rounded-full bg-ink-3"></span>${plural(sources, 'source')}</p>
    <div class="${PX} mt-4 flex flex-wrap gap-2">
      ${toFollow > 0 && html`<button type="button" class="${btn({ primary: true })}" data-follow-cafe>${icon('x', 14)}Follow ${toFollow === 1 ? 'on X' : `all ${toFollow}`}</button>`}
      <a class="${btn()}" href="${cafe.maps_url}" target="_blank" rel="noopener noreferrer">${icon('pin')}Directions</a>
      <button type="button" class="${btn()}" data-share>${icon('share')}<span>Share</span></button>
    </div>
    ${cafe.note && html`<p class="${MX} mt-6 border-l-2 border-line-2 pl-4 font-display text-[18px] font-medium leading-[1.4] tracking-[-0.01em] text-pretty">${cafe.note}</p>`}
    ${investors}
    ${scene}
    ${neighbours}
    <div class="h-10"></div>`;
}
