import type { Investor } from '@/domain/types';
import { html, type Html } from '@/lib/html';
import { initials } from '@/lib/text';

const TINTS = ['#EADBC8', '#D8E3D1', '#D5DEEA', '#EBD7DF', '#E4DFC7', '#DCD6EA'];

/** Stable soft tint per name, so a person without a photo always gets the same tile. */
export function tintFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length]!;
}

/** A person's photo, or their initials on a tint. `cls` sets size, shape and ring. */
export function avatar(p: { name: string; avatar?: string | undefined }, cls: string): Html {
  if (p.avatar) return html`<img class="${cls} flex-none object-cover" src="${p.avatar}" alt="" loading="lazy" decoding="async">`;
  return html`<span class="${cls} grid flex-none place-items-center font-[650] text-ink" style="background:${tintFor(p.name)}" aria-hidden="true">${initials(p.name)}</span>`;
}

/** Overlapping faces with a "+N" tile when there are more than `max`. */
export function avatarStack(people: Investor[], max: number, cls: string): Html {
  const more =
    people.length > max && html`<span class="${cls} grid flex-none place-items-center bg-ink font-[650] text-white">+${people.length - max}</span>`;
  return html`<span class="flex flex-none">${people.slice(0, max).map((p) => avatar(p, cls))}${more}</span>`;
}
