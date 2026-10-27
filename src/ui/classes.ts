/** Shared Tailwind class strings, kept whole so Tailwind's scanner sees every utility. */

export function btn(opts: { primary?: boolean; small?: boolean } = {}): string {
  return [
    'inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border font-[550] leading-none no-underline transition active:scale-[.97]',
    '[&.is-done]:border-ok [&.is-done]:bg-white [&.is-done]:text-ok',
    opts.small ? 'h-[30px] gap-1.5 px-[11px] text-[12.5px]' : 'h-9 gap-[7px] px-3.5 text-[13.5px]',
    opts.primary ? 'border-ink bg-ink text-white hover:bg-[#2e2b25]' : 'border-line-2 bg-white text-ink hover:border-ink-3',
  ].join(' ');
}

/** Horizontal page padding of the panel, matched by every section in it. */
export const PX = 'px-4 lg:px-6';
export const MX = 'mx-4 lg:mx-6';

export const SERIF_TITLE = 'm-0 font-serif font-normal leading-none tracking-[-0.015em] text-balance';
