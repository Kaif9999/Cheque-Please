import type { Cafe } from '@/domain/types';
import { esc } from '@/lib/dom';

/** The café's logo on white, or its first letter in the serif. `cls` sets size and shape. */
export function logo(cafe: Cafe, cls: string): string {
  if (cafe.logo) {
    return `<span class="${cls} grid flex-none place-items-center overflow-hidden bg-white"><img class="size-[70%] object-contain" src="${esc(cafe.logo)}" alt="" loading="lazy" decoding="async"></span>`;
  }
  return `<span class="${cls} grid flex-none place-items-center bg-sunk font-serif text-ink-2" aria-hidden="true">${esc(cafe.name.replace(/^the\s+/i, '')[0] ?? '')}</span>`;
}
