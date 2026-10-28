import { followable, investorsAt } from '@/domain/people';
import { routeHref } from '@/domain/routes';
import type { Cafe, City, CityId, Investor, SceneItem } from '@/domain/types';
import { ZONES, zoneOf } from '@/domain/zones';
import { html, type Html } from '@/lib/html';
import { icon } from '@/lib/icons';
import { followUrl, hostOf } from '@/lib/links';
import { plural } from '@/lib/text';
import { DISPLAY, LABEL, MX, PX } from '../classes';
import { areaLink } from '../components/area-link';
import { avatar } from '../components/avatar';
import { btn } from '../components/button';
import { logo } from '../components/logo';
import { post } from '../components/post';
import { backToList, sheetBar } from '../components/sheet-bar';

const BLOCK = `${PX} pb-1 pt-8`;
/** A section's label on the left and, optionally, a note on the right, in the mono caps. */
const blockHead = (left: string, right?: string): Html =>
  html`<header class="mb-4 flex items-baseline justify-between gap-3"><h2 class="${LABEL} m-0">${left}</h2>${right && html`<span class="${LABEL}">${right}</span>`}</header>`;

/** The post that puts an investor at the café, attributed to whoever wrote it. */
function proofOf(vc: Investor): Html {
  const p = vc.proof;
  const base = { date: p.date, text: p.text, url: p.url };
  if (p.kind === 'own') return post({ ...base, name: vc.name, handle: vc.handle, avatar: vc.avatar });
  if (p.kind === 'spotted') {
    return post({ ...base, name: p.author ?? 'Someone', handle: p.authorHandle, tag: `Spotted ${vc.name.split(' ')[0]}` });
  }
  return post({ ...base, name: p.author ?? hostOf(p.url), handle: null });
}

/** One investor: who they are on the left, the post that puts them here on the right (stacked on phones). */
function person(vc: Investor): Html {
  const zone = ZONES[vc.crowd];
  return html`<article class="grid gap-3 lg:grid-cols-[148px_minmax(0,1fr)] lg:gap-4">
    <div class="flex items-start gap-3 lg:flex-col lg:gap-2.5">
      <span class="relative flex-none">
        ${avatar(vc, 'size-12 rounded-xl text-sm shadow-[inset_0_0_0_1px_rgb(23_21_17/0.06)]')}
        <span class="absolute -bottom-1 -right-1 size-4 rounded-[5px] border-2 border-paper" style="background:${zone.color}" title="${zone.label}"></span>
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-1.5 lg:flex-none">
        <span class="font-display text-[16px] font-bold leading-tight tracking-[-0.015em]">${vc.name}</span>
        <span class="${LABEL} leading-snug">${vc.fund || zone.label}</span>
        ${vc.handle && html`<a class="${btn({ size: 'small' })} mt-1 self-start" href="${followUrl(vc.handle)}" target="_blank" rel="noopener noreferrer">${icon('x', 12)}Follow</a>`}
      </div>
    </div>
    ${proofOf(vc)}
  </article>`;
}

function scenePost(item: SceneItem): Html {
  return post({ name: item.author, handle: item.authorHandle, date: item.date, text: item.text, url: item.url });
}

function nearbyRow(cityId: CityId, cafe: Cafe): Html {
  return html`<li><a class="-mx-2 flex items-center gap-3 rounded-xl p-2 no-underline hover:bg-sunk [&.is-hover]:bg-sunk" href="${routeHref(cityId, { kind: 'cafe', slug: cafe.slug })}" data-slug="${cafe.slug}">
    ${logo(cafe, 'size-9 rounded-full text-lg shadow-[inset_0_0_0_1px_var(--color-line)]')}
    <span class="flex flex-1 flex-col text-[14.5px] font-[550]">${cafe.name}<small class="text-[13px] font-normal text-ink-2">${cafe.branch}</small></span>
    <span class="text-ink-3">${icon('forward', 14)}</span>
  </a></li>`;
}

/** A café's page: who was seen there beside the posts that say so, then its neighbours. */
export function renderDetail(city: City, cafe: Cafe): Html {
  const zone = ZONES[zoneOf(cafe)];
  const toFollow = followable([cafe]).length;
  const nearby = city.cafes.filter((c) => c.area === cafe.area && c !== cafe);
  const seen = investorsAt([cafe]).length;

  const investors =
    cafe.vcs.length > 0 &&
    html`<section class="${BLOCK}">${blockHead(`Spotted here · ${plural(seen, 'VC')}`, 'Proof from X')}<div class="grid gap-6">${cafe.vcs.map(person)}</div></section>`;
  const scene =
    cafe.scene.length > 0 &&
    html`<section class="${BLOCK}">${blockHead(`${cafe.vcs.length ? 'What founders say' : 'What founders say about it'} · ${cafe.scene.length}`)}<div class="grid gap-3">${cafe.scene.map(scenePost)}</div></section>`;
  const neighbours =
    nearby.length > 0 &&
    html`<section class="${BLOCK}">${blockHead(`Also in ${cafe.area}`)}<ul class="m-0 grid list-none gap-0.5 p-0">${nearby.map((c) => nearbyRow(city.id, c))}</ul></section>`;

  return html`
    ${sheetBar(backToList(city))}
    <header class="flex items-start gap-4 ${PX} pt-2" style="--zone:${zone.color}">
      ${logo(cafe, 'size-16 rounded-full text-3xl shadow-[0_0_0_3px_var(--zone),inset_0_0_0_1px_var(--color-line)]')}
      <div class="min-w-0 pt-0.5">
        <span class="inline-flex items-center gap-1.5 rounded-md bg-ink px-2 py-1 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-white"><span class="size-1.5 rounded-full bg-(--zone)"></span>${zone.label} · ${cafe.area}</span>
        <h1 class="${DISPLAY} mt-2 text-[30px] leading-[1.02] lg:text-[34px]">${cafe.name}</h1>
        <p class="mt-1.5 text-[14.5px] text-ink-2">${cafe.branch}, ${areaLink(city, cafe.area)}</p>
      </div>
    </header>
    ${cafe.note && html`<p class="${MX} mt-5 rounded-lg px-4 py-2.5 text-center font-display text-[15px] font-medium italic leading-[1.45] tracking-[-0.005em] text-pretty" style="background:color-mix(in srgb, ${zone.color} 18%, var(--color-paper))">${cafe.note}</p>`}
    <div class="${PX} mt-5 flex flex-wrap gap-2">
      ${toFollow > 0 && html`<button type="button" class="${btn({ primary: true })}" data-follow-cafe>${icon('x', 14)}Follow ${toFollow === 1 ? 'on X' : `all ${toFollow}`}</button>`}
      <a class="${btn()}" href="${cafe.maps_url}" target="_blank" rel="noopener noreferrer">${icon('pin')}Directions</a>
      <button type="button" class="${btn()}" data-share>${icon('share')}<span>Share</span></button>
    </div>
    ${investors}
    ${scene}
    ${neighbours}
    <div class="h-10"></div>`;
}
