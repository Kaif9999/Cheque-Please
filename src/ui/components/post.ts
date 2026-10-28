import { html, type Html } from '@/lib/html';
import { icon } from '@/lib/icons';
import { hostOf, isTweetUrl } from '@/lib/links';
import { LABEL } from '../classes';
import { avatar } from './avatar';

export interface PostProps {
  name: string;
  handle: string | null;
  avatar?: string | undefined;
  date: string;
  text: string;
  url: string;
  /** Small label above the text, such as "Spotted Kunal". */
  tag?: string;
}

/** Shortened t.co links are noise once the post itself is one click away. */
export const withoutShortLinks = (text: string): string => text.replace(/\s*https:\/\/t\.co\/\w+/g, '').trim();

/** A quoted tweet or article, linking back to where it came from. */
export function post(p: PostProps): Html {
  const tweet = isTweetUrl(p.url);
  const who = p.handle ? `@${p.handle}` : tweet ? '' : hostOf(p.url);
  return html`<figure class="m-0 min-w-0 rounded-[14px] bg-white px-4 pb-3 pt-3.5 shadow-[0_0_0_1px_rgb(23_21_17/0.06),0_6px_16px_-8px_rgb(23_21_17/0.18)]">
    <header class="flex min-w-0 items-center gap-2 text-[13.5px]">
      ${avatar({ name: p.name, avatar: p.avatar }, 'size-[22px] rounded-full text-[8.5px]')}
      <span class="flex min-w-0 gap-1.5 overflow-hidden whitespace-nowrap"><b class="font-semibold">${p.name}</b>${who && html`<span class="truncate text-ink-3">${who}</span>`}</span>
      ${tweet && html`<span class="ml-auto flex" title="Posted on X">${icon('x', 14)}</span>`}
    </header>
    ${p.tag && html`<p class="mt-2.5 inline-block rounded-full bg-sunk px-2.5 py-0.5 text-xs font-[550] text-ink-2">${p.tag}</p>`}
    <blockquote class="mt-2.5 line-clamp-6 whitespace-pre-line text-[15px] leading-normal [overflow-wrap:anywhere]">${withoutShortLinks(p.text)}</blockquote>
    <footer class="mt-3 flex items-center justify-between gap-3">
      <time class="${LABEL}">${p.date}</time>
      <a class="${LABEL} inline-flex items-center gap-1 text-ink no-underline hover:underline hover:underline-offset-2" href="${p.url}" data-link="receipt" target="_blank" rel="noopener noreferrer">${tweet ? 'View on X' : 'Read the source'}${icon('arrow', 12)}</a>
    </footer>
  </figure>`;
}
