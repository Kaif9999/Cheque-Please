import { followable } from '@/domain/people';
import type { Cafe } from '@/domain/types';
import { esc } from '@/lib/dom';
import { icon } from '@/lib/icons';
import { followUrl, issueUrl } from '@/lib/links';
import { plural } from '@/lib/text';
import { avatar } from '../components/avatar';
import { btn } from '../components/button';

/** Contents of the follow dialog: everyone on X among `cafes`, each with a follow link. */
export function renderFollow(title: string, cafes: Cafe[], cityName: string): string {
  const people = followable(cafes);
  const remove = issueUrl({ city: cityName, request: 'Remove me' });
  const rows = people
    .map(
      (p) => `<li class="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-sunk">
        ${avatar(p, 'size-11 rounded-full text-sm')}
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="text-[15.5px] font-semibold leading-[1.3]">${esc(p.name)}</span>
          <span class="truncate text-[13.5px] text-ink-2">${esc([p.fund, `@${p.handle}`].filter(Boolean).join(' · '))}</span>
        </span>
        <a class="${btn({ small: true })}" href="${followUrl(p.handle)}" target="_blank" rel="noopener noreferrer">${icon('x', 12)}Follow</a>
      </li>`,
    )
    .join('');
  return `
    <header class="relative pb-3.5 pl-[22px] pr-[60px] pt-[22px]">
      <h2 id="follow-title" class="m-0 font-serif text-[28px] font-normal leading-[1.05] tracking-[-0.01em]">${esc(title)}</h2>
      <p class="mt-2 text-sm text-ink-2">${esc(plural(people.length, 'investor'))} on X, each with a public post on the ${esc(cityName)} map.</p>
      <button type="button" class="absolute right-4 top-4 grid size-[34px] cursor-pointer place-items-center rounded-full border-0 bg-sunk hover:bg-line" data-close aria-label="Close">${icon('close', 18)}</button>
    </header>
    <ul class="m-0 flex-1 list-none overflow-y-auto px-2.5 pb-2">${rows}</ul>
    <footer class="flex items-center justify-between gap-3 border-t border-line px-[22px] pb-[18px] pt-3.5 text-[13px] text-ink-2">
      <button type="button" class="${btn({ small: true })}" data-copy>Copy all handles</button>
      ${remove ? `<a class="underline underline-offset-2" href="${esc(remove)}" target="_blank" rel="noopener noreferrer">Listed and want out?</a>` : ''}
    </footer>`;
}
