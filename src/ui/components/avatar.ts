import type { Investor } from '@/domain/types';
import { esc } from '@/lib/dom';
import { initials } from '@/lib/text';

const TINTS = ['#EADBC8', '#D8E3D1', '#D5DEEA', '#EBD7DF', '#E4DFC7', '#DCD6EA'];

/** Stable soft tint per name, so a person without a photo always gets the same tile. */
export function tintFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length]!;
}

/** A person's photo, or their initials on a tint. `cls` sets size, shape and ring. */
export function avatar(p: { name: string; avatar?: string | undefined }, cls: string): string {
  if (p.avatar) return `<img class="${cls} flex-none object-cover" src="${esc(p.avatar)}" alt="" loading="lazy" decoding="async">`;
  return `<span class="${cls} grid flex-none place-items-center font-[650] text-ink" style="background:${tintFor(p.name)}" aria-hidden="true">${esc(initials(p.name))}</span>`;
}

/** Overlapping faces with a "+N" tile when there are more than `max`. */
export function avatarStack(people: Investor[], max: number, cls: string): string {
  const shown = people
    .slice(0, max)
    .map((p) => avatar(p, cls))
    .join('');
  const more =
    people.length > max ? `<span class="${cls} grid flex-none place-items-center bg-ink font-[650] text-white">+${people.length - max}</span>` : '';
  return `<span class="flex flex-none">${shown}${more}</span>`;
}
