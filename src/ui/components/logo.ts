import type { Cafe } from '@/domain/types';
import { html, type Html } from '@/lib/html';

/** The café's logo on white, or its first letter in the display face. `cls` sets size and shape. */
export function logo(cafe: Cafe, cls: string): Html {
  if (cafe.logo) {
    return html`<span class="${cls} grid flex-none place-items-center overflow-hidden bg-white"><img class="size-[70%] object-contain" src="${cafe.logo}" alt="" loading="lazy" decoding="async"></span>`;
  }
  return html`<span class="${cls} grid flex-none place-items-center bg-sunk font-display font-semibold text-ink-2" aria-hidden="true">${cafe.name.replace(/^the\s+/i, '')[0]}</span>`;
}
