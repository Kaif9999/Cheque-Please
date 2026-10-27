import { followable, investorsAt } from '@/domain/people';
import type { Cafe, City, Investor, SceneItem } from '@/domain/types';
import { ZONES, zoneOf } from '@/domain/zones';
import { esc } from '@/lib/dom';
import { icon } from '@/lib/icons';
import { followUrl, hostOf } from '@/lib/links';
import { plural } from '@/lib/text';
import { MX, PX, SERIF_TITLE } from '../classes';
import { avatar } from '../components/avatar';
import { btn } from '../components/button';
import { logo } from '../components/logo';
import { post } from '../components/post';
import { zoneDot } from '../components/zone';

const BLOCK = `${PX} pb-1 pt-[30px]`;
const BLOCK_TITLE = 'mb-3.5 flex gap-1.5 text-[15px] font-semibold';
const BLOCK_COUNT = 'font-medium text-ink-3';

/** The post that puts an investor at the café, attributed to whoever wrote it. */
function proofOf(vc: Investor): string {
  const p = vc.proof;
  const base = { date: p.date, text: p.text, url: p.url, indent: true };
  if (p.kind === 'own') return post({ ...base, name: vc.name, handle: vc.handle, avatar: vc.avatar });
  if (p.kind === 'spotted') {
    return post({ ...base, name: p.author ?? 'Someone', handle: p.authorHandle, tag: `Spotted ${vc.name.split(' ')[0]}` });
  }
  return post({ ...base, name: p.author ?? hostOf(p.url), handle: null });
}

function person(vc: Investor): string {
  return `<article class="border-t border-line py-4 first-of-type:border-t-0 first-of-type:pt-0">
    <div class="flex items-center gap-3">
      ${avatar(vc, 'size-11 rounded-full text-sm')}
      <div class="flex min-w-0 flex-1 flex-col">
        <span class="text-[15.5px] font-semibold leading-[1.3]">${esc(vc.name)}</span>
        <span class="truncate text-[13.5px] text-ink-2">${esc(vc.fund || (vc.handle ? `@${vc.handle}` : 'Investor'))}</span>
      </div>
      ${vc.handle ? `<a class="${btn({ small: true })}" href="${followUrl(vc.handle)}" target="_blank" rel="noopener noreferrer">${icon('x', 12)}Follow</a>` : ''}
    </div>
    ${proofOf(vc)}
  </article>`;
}

function scenePost(item: SceneItem): string {
  return post({ name: item.author, handle: item.authorHandle, date: item.date, text: item.text, url: item.url });
}

function nearbyRow(cityId: string, cafe: Cafe): string {
  return `<li><a class="-mx-2 flex items-center gap-3 rounded-xl p-2 no-underline hover:bg-sunk [&.is-hover]:bg-sunk" href="#/${cityId}/${esc(cafe.slug)}" data-slug="${esc(cafe.slug)}">
    ${logo(cafe, 'size-9 rounded-[10px] text-lg shadow-[inset_0_0_0_1px_var(--color-line)]')}
    <span class="flex flex-1 flex-col text-[14.5px] font-[550]">${esc(cafe.name)}<small class="text-[13px] font-normal text-ink-2">${esc(cafe.branch)}</small></span>
    <span class="text-ink-3">${icon('forward', 14)}</span>
  </a></li>`;
}

/** A café's page: who was seen there, the posts that say so, and its neighbours. */
export function renderDetail(city: City, cafe: Cafe): string {
  const zone = ZONES[zoneOf(cafe)];
  const toFollow = followable([cafe]).length;
  const nearby = city.cafes.filter((c) => c.area === cafe.area && c !== cafe);
  const sources = cafe.vcs.length + cafe.scene.length;

  const investors = cafe.vcs.length
    ? `<section class="${BLOCK}"><h2 class="${BLOCK_TITLE}">Investors seen here <span class="${BLOCK_COUNT}">${investorsAt([cafe]).length}</span></h2>${cafe.vcs.map(person).join('')}</section>`
    : '';
  const scene = cafe.scene.length
    ? `<section class="${BLOCK}"><h2 class="${BLOCK_TITLE}">${cafe.vcs.length ? 'What founders say' : 'What founders say about it'} <span class="${BLOCK_COUNT}">${cafe.scene.length}</span></h2><div class="grid gap-2.5">${cafe.scene.map(scenePost).join('')}</div></section>`
    : '';
  const neighbours = nearby.length
    ? `<section class="${BLOCK}"><h2 class="${BLOCK_TITLE}">Also in ${esc(cafe.area)}</h2><ul class="m-0 grid list-none gap-0.5 p-0">${nearby.map((c) => nearbyRow(city.id, c)).join('')}</ul></section>`
    : '';

  return `
    <a class="ml-2 mt-3.5 inline-flex items-center gap-0.5 rounded-lg py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-ink-2 no-underline hover:bg-sunk hover:text-ink lg:ml-4" href="#/${city.id}">${icon('back')}All ${esc(city.name)} cafés</a>
    <header class="flex items-center gap-4 ${PX} pt-3.5">
      ${logo(cafe, 'size-16 rounded-2xl text-3xl shadow-[inset_0_0_0_1px_var(--color-line)]')}
      <div>
        <h1 class="${SERIF_TITLE} text-[32px] lg:text-[38px]">${esc(cafe.name)}</h1>
        <p class="mt-1.5 text-[14.5px] text-ink-2">${esc(cafe.branch)}, ${esc(cafe.area)}</p>
      </div>
    </header>
    <p class="${MX} mt-4 flex items-center gap-2 text-[13.5px] text-ink-2">${zoneDot(zone.id)}${esc(zone.label)}<span class="size-[3px] rounded-full bg-ink-3"></span>${esc(plural(sources, 'source'))}</p>
    <div class="${PX} mt-4 flex flex-wrap gap-2">
      ${toFollow ? `<button type="button" class="${btn({ primary: true })}" data-follow-cafe>${icon('x', 14)}Follow ${toFollow === 1 ? 'on X' : `all ${toFollow}`}</button>` : ''}
      <a class="${btn()}" href="${esc(cafe.maps_url)}" target="_blank" rel="noopener noreferrer">${icon('pin')}Directions</a>
      <button type="button" class="${btn()}" data-share>${icon('share')}<span>Share</span></button>
    </div>
    ${cafe.note ? `<p class="${MX} mt-6 border-l-2 border-line-2 pl-4 font-serif text-xl italic leading-[1.35] text-pretty">${esc(cafe.note)}</p>` : ''}
    ${investors}
    ${scene}
    ${neighbours}
    <div class="h-10"></div>`;
}
