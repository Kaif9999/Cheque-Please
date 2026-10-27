import { followable, investorsAt, photosFirst } from '@/domain/people';
import { routeHref } from '@/domain/routes';
import type { City } from '@/domain/types';
import { statsOf } from '@/domain/zones';
import { html, type Html } from '@/lib/html';
import { icon } from '@/lib/icons';
import { plural } from '@/lib/text';
import { DISPLAY } from '../classes';
import { avatarStack } from '../components/avatar';
import { btn } from '../components/button';

/** The cover for a city: who has been seen, the headline, and the ways in. */
export function renderHero(city: City): Html {
  const people = photosFirst(investorsAt(city.cafes));
  const stats = statsOf(city.cafes);
  const toFollow = followable(city.cafes).length;
  return html`
    <div class="flex items-center gap-3">
      ${avatarStack(people, 5, '-ml-2 first:ml-0 size-8 rounded-full text-[10px] ring-2 ring-paper')}
      <p class="text-[13.5px] leading-snug text-ink-2"><b class="font-semibold text-ink">${plural(stats.investors, 'investor')}</b> spotted at ${plural(stats.cafes, 'café')}</p>
    </div>
    <h1 id="hero-title" class="${DISPLAY} mt-5 text-[42px] leading-[0.98] tracking-[-0.035em] lg:mt-7 lg:text-[clamp(54px,5vw,76px)]">${city.headline}</h1>
    <p class="mt-4 max-w-[34ch] text-[16.5px] leading-[1.5] text-ink-2 text-pretty lg:mt-6 lg:text-[19px]">The cafés where investors have met founders, each pinned to the public post that puts them there.</p>
    <div class="mt-6 flex flex-wrap items-center gap-2.5 lg:mt-8">
      <button type="button" class="${btn({ primary: true, size: 'large' })}" data-explore>Explore the map${icon('forward')}</button>
      ${toFollow > 0 && html`<button type="button" class="${btn({ size: 'large' })}" data-follow-all>${icon('x', 15)}Follow all ${toFollow}</button>`}
    </div>
    <a class="mt-5 hidden self-start text-[14.5px] font-medium text-ink-2 underline decoration-line-2 underline-offset-4 hover:text-ink hover:decoration-ink-3 lg:inline" href="${routeHref(city.id, { kind: 'list' })}">Or browse all ${stats.cafes} cafés as a list</a>`;
}
