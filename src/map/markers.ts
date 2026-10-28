import { investorsAt, photosFirst } from '@/domain/people';
import type { Cafe } from '@/domain/types';
import { html, mount } from '@/lib/html';
import { plural } from '@/lib/text';
import { faces } from '@/ui/components/faces';
import { logo } from '@/ui/components/logo';

/**
 * Pins and clusters are HTML markers: cards that point at their café with a tail, showing who has
 * been seen there. Their state lives in classes on the button (`is-hover`, `is-selected`) so the
 * card can style itself with group variants.
 */
const BUTTON =
  'group z-[1] cursor-pointer border-0 bg-transparent p-0 text-left text-ink hover:z-[3] [&.is-hover]:z-[3] [&.is-selected]:z-[4] max-lg:[zoom:0.84]';
/** One shadow for the card and its tail, and the lift under the pointer. */
const LIFT =
  'relative block transition duration-200 ease-soft [filter:drop-shadow(0_1px_1px_rgb(23_21_17/0.12))_drop-shadow(0_10px_14px_rgb(23_21_17/0.16))] group-hover:-translate-y-1 group-[.is-hover]:-translate-y-1 group-[.is-selected]:-translate-y-1';
const CARD =
  'relative flex items-center gap-2.5 rounded-2xl bg-white p-2 pr-2.5 transition-colors duration-200 group-[.is-selected]:bg-ink group-[.is-selected]:text-white';
const TAIL =
  'absolute left-1/2 top-full -ml-[7px] size-0 border-x-[7px] border-t-[8px] border-x-transparent border-t-white transition-colors duration-200 group-[.is-selected]:border-t-ink';
const NAME = 'block whitespace-nowrap font-display text-[13.5px] font-bold leading-none tracking-[-0.01em]';
const CAPTION =
  'block whitespace-nowrap font-mono text-[9.5px] uppercase leading-none tracking-[0.08em] text-ink-3 group-[.is-selected]:text-white/60';
const BIG_LOGO = 'size-11 rounded-full text-lg shadow-[inset_0_0_0_1px_var(--color-line)]';
/** The marker's anchor is the card's bottom edge, so it sits this far up for the tail's tip to touch the café. */
export const TAIL_HEIGHT = 8;

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

function button(label: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = BUTTON;
  el.setAttribute('aria-label', label);
  return el;
}

export function pinElement(cafe: Cafe): HTMLButtonElement {
  const el = button(`${cafe.name}, ${cafe.branch}`);
  el.dataset.slug = cafe.slug;
  const people = photosFirst(investorsAt([cafe]));
  mount(
    el,
    html`<span class="${LIFT}">
      <span class="${CARD}">
        ${logo(cafe, BIG_LOGO)}
        <span class="flex flex-col gap-1.5">
          <span class="${NAME}">${cafe.name}</span>
          ${people.length > 0 ? faces(people, 'card') : html`<span class="${CAPTION}">Founders meet here</span>`}
        </span>
      </span>
      <span class="${TAIL}"></span>
    </span>`,
  );
  return el;
}

/** An empty cluster button; `fill` adds its cafés once MapLibre has resolved them. */
export function clusterElement(count: number): HTMLButtonElement {
  return button(`${count} cafés here. Zoom in.`);
}

/** The cards behind a cluster's front one, fanned a little to show there are more. */
const BEHIND = 'absolute inset-0 rounded-2xl bg-white shadow-[0_0_0_1px_rgb(23_21_17/0.1),0_2px_4px_rgb(23_21_17/0.08)]';

export function fillCluster(el: HTMLElement, cafes: Cafe[]): void {
  const withLogos = [...new Map(cafes.map((c) => [c.logo ?? c.name, c])).values()].slice(0, 3);
  const area = mostCommon(cafes.map((c) => c.area));
  const people = photosFirst(investorsAt(cafes));
  const caption = people.length ? `${plural(cafes.length, 'café')} · ${plural(people.length, 'VC')}` : plural(cafes.length, 'café');
  el.dataset.slugs = cafes.map((c) => c.slug).join(' ');
  el.setAttribute('aria-label', `${cafes.length} cafés in ${area}. Zoom in.`);
  mount(
    el,
    html`<span class="${LIFT}">
      ${cafes.length > 2 && html`<span class="${BEHIND} translate-x-[8px] -translate-y-[10px] rotate-[2deg]"></span>`}
      <span class="${BEHIND} translate-x-[4px] -translate-y-[5px] rotate-[1deg]"></span>
      <span class="${CARD}">
        <span class="flex flex-none">${withLogos.map((c) => logo(c, `${BIG_LOGO} -ml-3.5 first:ml-0 shadow-[0_0_0_2px_white,inset_0_0_0_1px_var(--color-line)] group-[.is-selected]:shadow-[0_0_0_2px_var(--color-ink)]`))}</span>
        <span class="flex flex-col gap-1.5">
          <span class="flex flex-col gap-1"><span class="${NAME}">${area}</span><span class="${CAPTION}">${caption}</span></span>
          ${people.length > 0 && faces(people, 'card')}
        </span>
      </span>
      <span class="absolute -right-2.5 -top-3 rounded-full bg-ink px-1.5 py-[3px] font-mono text-[10px] font-bold leading-none text-white tabular-nums shadow-[0_0_0_2px_white]">×${cafes.length}</span>
      <span class="${TAIL}"></span>
    </span>`,
  );
}

/** Selected and hovered state; a cluster lights up when it holds the café in question. */
export function paintMarker(el: HTMLElement, selected: string | null, hovered: string | null): void {
  const holds = (slug: string | null) => !!slug && (el.dataset.slug === slug || (el.dataset.slugs ?? '').split(' ').includes(slug));
  el.classList.toggle('is-selected', holds(selected));
  el.classList.toggle('is-hover', holds(hovered));
}
