import { config } from '@/config';
import { groupByArea } from '@/domain/areas';
import { followable, investorsAt, photosFirst } from '@/domain/people';
import { routeHref } from '@/domain/routes';
import type { Cafe, City, CityId, ZoneId } from '@/domain/types';
import { ZONES, zoneOf } from '@/domain/zones';
import { html, type Html } from '@/lib/html';
import { icon } from '@/lib/icons';
import { issueUrl } from '@/lib/links';
import { plural } from '@/lib/text';
import { DISPLAY, LABEL, MX, PX } from '../classes';
import { btn } from '../components/button';
import { faces } from '../components/faces';
import { logo } from '../components/logo';
import { areaLink } from '../components/area-link';
import { backToList, sheetBar } from '../components/sheet-bar';
import { zoneDot } from '../components/zone';

const DISCLAIMER = 'Every café here links to a public post. A post shows someone was there once, not that they will be there tomorrow.';

function names(cafe: Cafe): string {
  const people = photosFirst(investorsAt([cafe])).map((p) => p.name);
  if (!people.length) return 'Founders post about meetings here';
  if (people.length <= 2) return people.join(' and ');
  return `${people[0]}, ${people[1]} and ${plural(people.length - 2, 'other')}`;
}

function row(cityId: CityId, cafe: Cafe): Html {
  const zone = ZONES[zoneOf(cafe)];
  const people = photosFirst(investorsAt([cafe]));
  return html`<li>
    <a class="group flex gap-3.5 rounded-[14px] p-3 no-underline transition-colors hover:bg-sunk [&.is-hover]:bg-sunk" href="${routeHref(cityId, { kind: 'cafe', slug: cafe.slug })}" data-slug="${cafe.slug}">
      ${logo(cafe, 'size-12 rounded-full text-2xl shadow-[inset_0_0_0_1px_var(--color-line)]')}
      <span class="flex min-w-0 flex-col gap-1.5">
        <span class="font-display text-[16px] font-bold leading-tight tracking-[-0.015em]">${cafe.name}</span>
        <span class="${LABEL} flex min-w-0 items-center gap-1.5">${zoneDot(zone.id, 'size-1.5')}<span class="truncate">${zone.label} · ${cafe.branch}</span></span>
        <span class="mt-1 flex min-w-0 items-center gap-2.5 text-[13.5px] text-ink-2">
          ${people.length > 0 && faces(people, 'row')}
          <span class="truncate">${names(cafe)}</span>
        </span>
      </span>
    </a>
  </li>`;
}

function rows(city: City, list: Cafe[]): Html {
  const sorted = [...list].sort((a, b) => b.vcs.length - a.vcs.length || a.name.localeCompare(b.name));
  return html`<ul class="mt-1 list-none px-2">${sorted.map((c) => row(city.id, c))}</ul>`;
}

function group(city: City, area: string, list: Cafe[]): Html {
  const note = city.areas[area];
  return html`<section class="pb-2.5">
    <header class="flex items-baseline justify-between gap-3 ${PX} pt-5">
      <h2 class="${DISPLAY} text-[21px] leading-tight">${areaLink(city, area, 'text-inherit no-underline hover:underline hover:decoration-line-2 hover:underline-offset-4')}</h2>
      <span class="whitespace-nowrap text-[13px] text-ink-3">${plural(list.length, 'café')}</span>
    </header>
    ${note && html`<p class="${MX} my-1.5 text-sm leading-[1.45] text-ink-2 text-pretty">${note}</p>`}
    ${rows(city, list)}
  </section>`;
}

/** One neighbourhood's page: its name and note, then its cafés. */
function areaTop(city: City, area: string, count: number): Html {
  const note = city.areas[area];
  return html`${sheetBar(backToList(city))}
    <header class="${PX} pt-2">
      <h1 class="${DISPLAY} text-[28px] leading-[1.02]">${area}</h1>
      <p class="mt-1.5 text-[14.5px] text-ink-2">${plural(count, 'café')} in ${city.name}</p>
    </header>
    ${note && html`<p class="${MX} mt-4 border-l-2 border-line-2 pl-4 font-display text-[18px] font-medium leading-[1.4] tracking-[-0.01em] text-pretty">${note}</p>`}`;
}

/** Every café in the city (or in one neighbourhood), grouped by neighbourhood, narrowed to the map's filter when one is on. */
export function renderList(city: City, filter: ZoneId | null, area: string | null = null): Html {
  const all = area ? city.cafes.filter((c) => c.area === area) : city.cafes;
  const shown = all.filter((c) => !filter || zoneOf(c) === filter);
  const zone = filter && ZONES[filter];
  const toFollow = followable(all).length;
  const groups = area
    ? rows(city, shown)
    : [...groupByArea(shown)]
        .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
        .map(([name, list]) => group(city, name, list));
  const suggest = issueUrl({ city: city.name, request: 'Add a receipt' });

  return html`
    ${area ? areaTop(city, area, all.length) : sheetBar(html`<h2 class="${DISPLAY} pl-2 text-[20px] leading-none">All ${city.name} cafés</h2>`)}
    <div class="${PX} flex flex-wrap gap-2 ${area ? 'pt-5' : 'pt-1'}">
      ${toFollow > 0 && html`<button type="button" class="${btn({ primary: true })}" ${area ? 'data-follow-area' : 'data-follow-all'}>${icon('x', 14)}Follow all ${toFollow}</button>`}
      <button type="button" class="${btn()}" data-share>${icon('share')}<span>Share</span></button>
    </div>
    ${
      zone &&
      html`<p class="${MX} mt-4 flex items-center gap-2.5 rounded-xl bg-sunk py-2.5 pl-3 pr-2 text-[13.5px] text-ink-2">
        ${zoneDot(zone.id)}<span class="flex-1">${plural(shown.length, 'café')} for <b class="font-semibold text-ink">${zone.label}</b></span>
        <button type="button" class="${btn({ size: 'small' })}" data-filter="">Show all</button>
      </p>`
    }
    <div class="mt-2 divide-y divide-line">${groups}</div>
    <footer class="mt-1.5 border-t border-line ${PX} pb-9 pt-5 text-[13px] leading-[1.55] text-ink-3 [&_a]:text-ink-2 [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-2">
      <p>${DISCLAIMER}</p>
      ${suggest && html`<p><a href="${suggest}" target="_blank" rel="noopener noreferrer">Suggest a café or ask to be removed</a></p>`}
      <p>Idea from <a href="https://meetvc.cafe" target="_blank" rel="noopener noreferrer">meetvc.cafe</a>. Map data © OpenStreetMap contributors, tiles by OpenFreeMap.${config.maker && ` Made by ${config.maker}.`}</p>
    </footer>`;
}
