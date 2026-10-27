import { config } from '@/config';
import { groupByArea } from '@/domain/areas';
import { followable, investorsAt, photosFirst } from '@/domain/people';
import type { Cafe, City, ZoneId } from '@/domain/types';
import { statsOf, ZONES, zoneOf, zonesIn } from '@/domain/zones';
import { esc } from '@/lib/dom';
import { icon } from '@/lib/icons';
import { issueUrl } from '@/lib/links';
import { plural } from '@/lib/text';
import { MX, PX, SERIF_TITLE } from '../classes';
import { avatarStack } from '../components/avatar';
import { btn } from '../components/button';
import { logo } from '../components/logo';
import { zoneDot } from '../components/zone';

const DISCLAIMER = 'Every café here links to a public post. A post shows someone was there once, not that they will be there tomorrow.';

const CHIP =
  'group inline-flex h-8 flex-none cursor-pointer items-center gap-1.5 rounded-full border border-line-2 bg-white px-3 text-[13px] font-medium transition-colors hover:border-ink-3 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white';
const CHIP_COUNT = 'text-ink-3 tabular-nums group-aria-pressed:text-white/60';

function names(cafe: Cafe): string {
  const people = photosFirst(investorsAt([cafe])).map((p) => p.name);
  if (!people.length) return 'Founders post about meetings here';
  if (people.length <= 2) return people.join(' and ');
  return `${people[0]}, ${people[1]} and ${plural(people.length - 2, 'other')}`;
}

function row(cityId: string, cafe: Cafe): string {
  const zone = ZONES[zoneOf(cafe)];
  const people = photosFirst(investorsAt([cafe]));
  return `<li>
    <a class="group flex gap-3.5 rounded-[14px] p-3 no-underline transition-colors hover:bg-sunk [&.is-hover]:bg-sunk" href="#/${cityId}/${esc(cafe.slug)}" data-slug="${esc(cafe.slug)}">
      ${logo(cafe, 'size-12 rounded-xl text-2xl shadow-[inset_0_0_0_1px_var(--color-line)]')}
      <span class="flex min-w-0 flex-col gap-0.5">
        <span class="text-base font-semibold leading-tight tracking-[-0.005em]">${esc(cafe.name)}</span>
        <span class="flex items-center gap-1.5 text-[13.5px] text-ink-2">${zoneDot(zone.id)}<span>${esc(zone.label)}</span><span class="text-ink-3">·</span><span class="truncate">${esc(cafe.branch)}</span></span>
        <span class="mt-[7px] flex min-w-0 items-center gap-2 text-[13.5px] text-ink-2">
          ${people.length ? avatarStack(people, 3, '-ml-1.5 first:ml-0 size-6 rounded-full text-[9.5px] ring-2 ring-paper transition-shadow group-hover:ring-sunk group-[.is-hover]:ring-sunk') : ''}
          <span class="truncate">${esc(names(cafe))}</span>
        </span>
      </span>
    </a>
  </li>`;
}

function chips(all: Cafe[], filter: ZoneId | null): string {
  return [
    `<button type="button" class="${CHIP}" data-filter="" aria-pressed="${!filter}">All <span class="${CHIP_COUNT}">${all.length}</span></button>`,
    ...zonesIn(all).map(
      ({ zone, count }) =>
        `<button type="button" class="${CHIP}" data-filter="${zone.id}" aria-pressed="${filter === zone.id}" title="${esc(zone.blurb)}">${zoneDot(zone.id, 'size-2', 'group-aria-pressed:shadow-[0_0_0_1.5px_white]')}${esc(zone.label)} <span class="${CHIP_COUNT}">${count}</span></button>`,
    ),
  ].join('');
}

function group(city: City, area: string, list: Cafe[]): string {
  const note = city.areas[area];
  const sorted = [...list].sort((a, b) => b.vcs.length - a.vcs.length || a.name.localeCompare(b.name));
  return `<section class="pb-2.5">
    <header class="flex items-baseline justify-between gap-3 ${PX} pt-5">
      <h2 class="${SERIF_TITLE} text-2xl lg:text-[27px]">${esc(area)}</h2>
      <span class="whitespace-nowrap text-[13px] text-ink-3">${esc(plural(list.length, 'café'))}</span>
    </header>
    ${note ? `<p class="${MX} my-1.5 text-sm leading-[1.45] text-ink-2 text-pretty">${esc(note)}</p>` : ''}
    <ul class="mt-1 list-none px-1 lg:px-3">${sorted.map((c) => row(city.id, c)).join('')}</ul>
  </section>`;
}

/** The city view: title, follow and share, filters, then cafés grouped by neighbourhood. */
export function renderList(city: City, filter: ZoneId | null): string {
  const all = city.cafes;
  const shown = all.filter((c) => !filter || zoneOf(c) === filter);
  const stats = statsOf(all);
  const toFollow = followable(all).length;
  const groups = [...groupByArea(shown)]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([area, list]) => group(city, area, list))
    .join('');
  const suggest = issueUrl({ city: city.name, request: 'Add a receipt' });

  return `
    <section class="${PX} pb-3 pt-[22px] lg:pb-[18px] lg:pt-[30px]">
      <h1 class="${SERIF_TITLE} text-[36px] lg:text-[46px]">${esc(city.headline)}</h1>
      <p class="mt-3.5 max-w-[40ch] text-[15.5px] text-ink-2 text-pretty">${esc(plural(stats.cafes, 'café'))} where ${esc(plural(stats.investors, 'investor'))} have met founders, each linked to the public post that puts them there.</p>
      <div class="mt-[18px] flex flex-wrap gap-2">
        ${toFollow ? `<button type="button" class="${btn({ primary: true })}" data-follow-all>${icon('x', 14)}Follow all ${toFollow}</button>` : ''}
        <button type="button" class="${btn()}" data-share>${icon('share')}<span>Share</span></button>
      </div>
    </section>
    <div class="sticky top-0 z-[1] bg-linear-to-b from-paper from-80% to-paper/0">
      <div class="flex gap-1.5 overflow-x-auto ${PX} pb-3 pt-2.5 [mask-image:linear-gradient(to_right,#000_calc(100%-40px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="toolbar" aria-label="Filter by who meets there">${chips(all, filter)}<span class="w-6 flex-none"></span></div>
    </div>
    <div class="divide-y divide-line">${groups}</div>
    <footer class="mt-1.5 border-t border-line ${PX} pb-9 pt-5 text-[13px] leading-[1.55] text-ink-3 [&_a]:text-ink-2 [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-2">
      <p>${esc(DISCLAIMER)}</p>
      ${suggest ? `<p><a href="${esc(suggest)}" target="_blank" rel="noopener noreferrer">Suggest a café or ask to be removed</a></p>` : ''}
      <p>Idea from <a href="https://meetvc.cafe" target="_blank" rel="noopener noreferrer">meetvc.cafe</a>. Map data © OpenStreetMap contributors, tiles by OpenFreeMap.${config.maker ? ` Made by ${esc(config.maker)}.` : ''}</p>
    </footer>`;
}
