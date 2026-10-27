import type { Cafe, City, Investor, SceneItem } from '../data/types';
import { plural, ZONES, zoneOf } from '../data/zones';
import { btn, MX, PX, SERIF_TITLE } from './classes';
import { esc, icon } from './dom';
import { dot, face, facesOf, logo } from './markers';
import { followableCount } from './list';

export function followUrl(handle: string): string {
  return `https://x.com/intent/follow?screen_name=${encodeURIComponent(handle)}`;
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const isTweet = (url: string) => /^https:\/\/(x|twitter)\.com\//.test(url);

/** Shortened t.co links are noise once the post itself is one click away. */
const clean = (text: string) => text.replace(/\s*https:\/\/t\.co\/\w+/g, '').trim();

function post(opts: { name: string; handle: string | null; avatar?: string; date: string; text: string; url: string; tag?: string; indent?: boolean }): string {
  const tweet = isTweet(opts.url);
  const who = opts.handle ? `@${opts.handle}` : tweet ? '' : host(opts.url);
  return `<figure class="m-0 rounded-[14px] border border-line bg-white px-4 pb-3 pt-3.5 ${opts.indent ? 'mt-3 lg:ml-14' : ''}">
    <header class="flex min-w-0 items-center gap-2 text-[13.5px]">
      ${face({ name: opts.name, avatar: opts.avatar }, 'size-[22px] rounded-full text-[8.5px]')}
      <span class="flex min-w-0 gap-1.5 overflow-hidden whitespace-nowrap"><b class="font-semibold">${esc(opts.name)}</b>${who ? `<span class="truncate text-ink-3">${esc(who)}</span>` : ''}</span>
      ${tweet ? `<span class="ml-auto flex" title="Posted on X">${icon('x', 14)}</span>` : ''}
    </header>
    ${opts.tag ? `<p class="mt-2.5 inline-block rounded-full bg-sunk px-2.5 py-0.5 text-xs font-[550] text-ink-2">${esc(opts.tag)}</p>` : ''}
    <blockquote class="mt-2.5 line-clamp-6 whitespace-pre-line text-[15px] leading-normal [overflow-wrap:anywhere]">${esc(clean(opts.text))}</blockquote>
    <footer class="mt-3 flex items-center justify-between gap-3 text-[13px] text-ink-3">
      <time>${esc(opts.date)}</time>
      <a class="inline-flex items-center gap-[3px] font-[550] text-ink no-underline hover:underline hover:underline-offset-2" href="${esc(opts.url)}" target="_blank" rel="noopener noreferrer">${tweet ? 'View on X' : 'Read the source'}${icon('arrow', 14)}</a>
    </footer>
  </figure>`;
}

function proofOf(vc: Investor): string {
  const p = vc.proof;
  if (p.kind === 'own') return post({ name: vc.name, handle: vc.handle, avatar: vc.avatar, date: p.date, text: p.text, url: p.url, indent: true });
  if (p.kind === 'spotted') {
    return post({ name: p.author ?? 'Someone', handle: p.authorHandle, date: p.date, text: p.text, url: p.url, tag: `Spotted ${vc.name.split(' ')[0]}`, indent: true });
  }
  return post({ name: p.author ?? host(p.url), handle: null, date: p.date, text: p.text, url: p.url, indent: true });
}

function person(vc: Investor): string {
  return `<article class="border-t border-line py-4 first-of-type:border-t-0 first-of-type:pt-0">
    <div class="flex items-center gap-3">
      ${face(vc, 'size-11 rounded-full text-sm')}
      <div class="flex min-w-0 flex-1 flex-col">
        <span class="text-[15.5px] font-semibold leading-[1.3]">${esc(vc.name)}</span>
        <span class="truncate text-[13.5px] text-ink-2">${esc(vc.fund || (vc.handle ? `@${vc.handle}` : 'Investor'))}</span>
      </div>
      ${vc.handle ? `<a class="${btn({ small: true })}" href="${followUrl(vc.handle)}" target="_blank" rel="noopener noreferrer">${icon('x', 12)}Follow</a>` : ''}
    </div>
    ${proofOf(vc)}
  </article>`;
}

function scene(item: SceneItem): string {
  return post({ name: item.author, handle: item.authorHandle, date: item.date, text: item.text, url: item.url });
}

const BLOCK = `${PX} pb-1 pt-[30px]`;
const BLOCK_TITLE = 'mb-3.5 flex gap-1.5 text-[15px] font-semibold';
const BLOCK_COUNT = 'font-medium text-ink-3';

export function renderDetail(city: City, cafe: Cafe): string {
  const zone = ZONES[zoneOf(cafe)];
  const followable = followableCount([cafe]);
  const nearby = city.cafes.filter((c) => c.area === cafe.area && c !== cafe);
  const sources = cafe.vcs.length + cafe.scene.length;
  return `
    <a class="ml-2 mt-3.5 inline-flex items-center gap-0.5 rounded-lg py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-ink-2 no-underline hover:bg-sunk hover:text-ink lg:ml-4" href="#/${city.id}">${icon('back')}All ${esc(city.name)} cafés</a>
    <header class="flex items-center gap-4 ${PX} pt-3.5">
      ${logo(cafe, 'size-16 rounded-2xl text-3xl shadow-[inset_0_0_0_1px_var(--color-line)]')}
      <div>
        <h1 class="${SERIF_TITLE} text-[32px] lg:text-[38px]">${esc(cafe.name)}</h1>
        <p class="mt-1.5 text-[14.5px] text-ink-2">${esc(cafe.branch)}, ${esc(cafe.area)}</p>
      </div>
    </header>
    <p class="${MX} mt-4 flex items-center gap-2 text-[13.5px] text-ink-2">${dot(zone.id)}${esc(zone.label)}<span class="size-[3px] rounded-full bg-ink-3"></span>${esc(plural(sources, 'source'))}</p>
    <div class="${PX} mt-4 flex flex-wrap gap-2">
      ${followable ? `<button type="button" class="${btn({ primary: true })}" data-follow-cafe>${icon('x', 14)}Follow ${followable === 1 ? 'on X' : `all ${followable}`}</button>` : ''}
      <a class="${btn()}" href="${esc(cafe.maps_url)}" target="_blank" rel="noopener noreferrer">${icon('pin')}Directions</a>
      <button type="button" class="${btn()}" data-share>${icon('share')}<span>Share</span></button>
    </div>
    ${cafe.note ? `<p class="${MX} mt-6 border-l-2 border-line-2 pl-4 font-serif text-xl italic leading-[1.35] text-pretty">${esc(cafe.note)}</p>` : ''}
    ${
      cafe.vcs.length
        ? `<section class="${BLOCK}"><h2 class="${BLOCK_TITLE}">Investors seen here <span class="${BLOCK_COUNT}">${facesOf([cafe]).length}</span></h2>${cafe.vcs.map(person).join('')}</section>`
        : ''
    }
    ${
      cafe.scene.length
        ? `<section class="${BLOCK}"><h2 class="${BLOCK_TITLE}">${cafe.vcs.length ? 'What founders say' : 'What founders say about it'} <span class="${BLOCK_COUNT}">${cafe.scene.length}</span></h2><div class="grid gap-2.5">${cafe.scene.map(scene).join('')}</div></section>`
        : ''
    }
    ${
      nearby.length
        ? `<section class="${BLOCK}"><h2 class="${BLOCK_TITLE}">Also in ${esc(cafe.area)}</h2><ul class="m-0 grid list-none gap-0.5 p-0">${nearby
            .map(
              (c) => `<li><a class="-mx-2 flex items-center gap-3 rounded-xl p-2 no-underline hover:bg-sunk [&.is-hover]:bg-sunk" href="#/${city.id}/${esc(c.slug)}" data-slug="${esc(c.slug)}">
                ${logo(c, 'size-9 rounded-[10px] text-lg shadow-[inset_0_0_0_1px_var(--color-line)]')}
                <span class="flex flex-1 flex-col text-[14.5px] font-[550]">${esc(c.name)}<small class="text-[13px] font-normal text-ink-2">${esc(c.branch)}</small></span>
                <span class="text-ink-3">${icon('forward', 14)}</span>
              </a></li>`,
            )
            .join('')}</ul></section>`
        : ''
    }
    <div class="h-10"></div>`;
}
