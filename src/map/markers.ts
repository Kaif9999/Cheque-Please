import { investorsAt, photosFirst } from '@/domain/people';
import type { Cafe } from '@/domain/types';
import { ZONES, zoneOf } from '@/domain/zones';
import { html, mount } from '@/lib/html';
import { avatarStack } from '@/ui/components/avatar';
import { logo } from '@/ui/components/logo';

/**
 * Pins and clusters are HTML markers. Their state lives in classes on the button
 * (`is-hover`, `is-selected`) so the inner pill can style itself with group variants.
 */
const BUTTON =
  'group z-[1] cursor-pointer border-0 bg-transparent p-0 text-ink hover:z-[3] [&.is-hover]:z-[3] [&.is-selected]:z-[4] max-lg:[zoom:0.88]';
const BODY =
  'flex h-9 items-center gap-[7px] whitespace-nowrap rounded-full bg-white py-[3px] pl-[3px] pr-[11px] shadow-pin transition duration-200 ease-soft group-hover:scale-[1.06] group-[.is-hover]:scale-[1.06]';
const LOGO = 'size-[30px] rounded-full text-base';
const NAME = 'text-[13px] font-semibold tracking-[-0.005em]';

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
  el.style.setProperty('--zone', ZONES[zoneOf(cafe)].color);
  const people = photosFirst(investorsAt([cafe]));
  mount(
    el,
    html`<span class="${BODY} group-[.is-selected]:scale-[1.08] group-[.is-selected]:bg-ink group-[.is-selected]:text-white">
    ${logo(cafe, `${LOGO} ring-2 ring-(--zone)`)}
    <span class="${NAME}">${cafe.name}</span>
    ${people.length > 0 && avatarStack(people, 2, '-ml-1.5 first:ml-px size-[22px] rounded-full text-[8.5px] ring-2 ring-white group-[.is-selected]:ring-ink')}
  </span>`,
  );
  return el;
}

/** An empty cluster button; `fill` adds its cafés once MapLibre has resolved them. */
export function clusterElement(count: number): HTMLButtonElement {
  return button(`${count} cafés here. Zoom in.`);
}

export function fillCluster(el: HTMLElement, cafes: Cafe[]): void {
  const withLogos = [...new Map(cafes.map((c) => [c.logo ?? c.name, c])).values()].slice(0, 3);
  const area = mostCommon(cafes.map((c) => c.area));
  el.dataset.slugs = cafes.map((c) => c.slug).join(' ');
  el.setAttribute('aria-label', `${cafes.length} cafés in ${area}. Zoom in.`);
  mount(
    el,
    html`<span class="${BODY} group-[.is-selected]:shadow-[0_0_0_2px_var(--color-ink),var(--shadow-pin)]">
    <span class="flex">${withLogos.map((c) => logo(c, `${LOGO} -ml-2.5 first:ml-0 shadow-[0_0_0_2px_white,inset_0_0_0_1px_var(--color-line)]`))}</span>
    <span class="${NAME}">${area}</span>
    <span class="-mr-1.5 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-ink px-1.5 text-xs font-[650] text-white tabular-nums">${cafes.length}</span>
  </span>`,
  );
}

/** Selected and hovered state; a cluster lights up when it holds the café in question. */
export function paintMarker(el: HTMLElement, selected: string | null, hovered: string | null): void {
  const holds = (slug: string | null) => !!slug && (el.dataset.slug === slug || (el.dataset.slugs ?? '').split(' ').includes(slug));
  el.classList.toggle('is-selected', holds(selected));
  el.classList.toggle('is-hover', holds(hovered));
}
