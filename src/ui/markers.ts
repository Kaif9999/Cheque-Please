import type { Cafe, Investor, ZoneId } from '../data/types';
import { ZONES } from '../data/zones';
import { esc, initials } from './dom';

/** Unique investors across cafés, those with photos first so a row reads as faces. */
export function facesOf(cafes: Cafe[]): Investor[] {
  const seen = new Map<string, Investor>();
  for (const vc of cafes.flatMap((c) => c.vcs)) {
    const key = (vc.handle ?? vc.name).toLowerCase();
    if (!seen.has(key)) seen.set(key, vc);
  }
  return [...seen.values()].sort((a, b) => Number(!!b.avatar) - Number(!!a.avatar));
}

const TINTS = ['#EADBC8', '#D8E3D1', '#D5DEEA', '#EBD7DF', '#E4DFC7', '#DCD6EA'];

/** Stable soft tint per name, so a person without a photo always gets the same tile. */
export function tintFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** A person's photo, or their initials on a tint. `cls` sets size, shape and ring. */
export function face(p: { name: string; avatar?: string }, cls: string): string {
  if (p.avatar) return `<img class="${cls} flex-none object-cover" src="${esc(p.avatar)}" alt="" loading="lazy" decoding="async">`;
  return `<span class="${cls} grid flex-none place-items-center font-[650] text-ink" style="background:${tintFor(p.name)}" aria-hidden="true">${esc(initials(p.name))}</span>`;
}

/** The café's logo on white, or its first letter in the serif. `cls` sets size and shape. */
export function logo(cafe: Cafe, cls: string): string {
  if (cafe.logo) {
    return `<span class="${cls} grid flex-none place-items-center overflow-hidden bg-white"><img class="size-[70%] object-contain" src="${esc(cafe.logo)}" alt="" loading="lazy" decoding="async"></span>`;
  }
  return `<span class="${cls} grid flex-none place-items-center bg-sunk font-serif text-ink-2" aria-hidden="true">${esc(cafe.name.replace(/^the\s+/i, '')[0] ?? '')}</span>`;
}

export function faceStack(people: Investor[], max: number, cls: string, moreCls: string): string {
  const shown = people.slice(0, max).map((p) => face(p, cls)).join('');
  const more = people.length > max ? `<span class="${cls} ${moreCls} grid flex-none place-items-center bg-ink font-[650] text-white">+${people.length - max}</span>` : '';
  return `<span class="flex flex-none">${shown}${more}</span>`;
}

const PIN_BODY =
  'flex h-9 items-center gap-[7px] whitespace-nowrap rounded-full bg-white py-[3px] pl-[3px] pr-[11px] shadow-pin transition duration-200 ease-soft group-hover:scale-[1.06] group-[.is-hover]:scale-[1.06]';
const PIN_LOGO = 'size-[30px] rounded-full text-base';
const PIN_FACE = '-ml-1.5 first:ml-px size-[22px] rounded-full text-[8.5px] ring-2 ring-white group-[.is-selected]:ring-ink';

export const PIN_BUTTON =
  'group z-[1] cursor-pointer border-0 bg-transparent p-0 text-ink hover:z-[3] [&.is-hover]:z-[3] [&.is-selected]:z-[4] max-lg:[zoom:0.88]';

export function pinHtml(cafe: Cafe): string {
  const people = facesOf([cafe]);
  return `<span class="${PIN_BODY} group-[.is-selected]:scale-[1.08] group-[.is-selected]:bg-ink group-[.is-selected]:text-white">
    ${logo(cafe, `${PIN_LOGO} ring-2 ring-(--zone)`)}
    <span class="text-[13px] font-semibold tracking-[-0.005em]">${esc(cafe.name)}</span>
    ${people.length ? faceStack(people, 2, PIN_FACE, '') : ''}
  </span>`;
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

export function clusterHtml(cafes: Cafe[]): string {
  const withLogos = [...new Map(cafes.map((c) => [c.logo ?? c.name, c])).values()].slice(0, 3);
  return `<span class="${PIN_BODY} group-[.is-selected]:shadow-[0_0_0_2px_var(--color-ink),var(--shadow-pin)]">
    <span class="flex">${withLogos.map((c) => logo(c, `${PIN_LOGO} -ml-2.5 first:ml-0 shadow-[0_0_0_2px_white,inset_0_0_0_1px_var(--color-line)]`)).join('')}</span>
    <span class="text-[13px] font-semibold tracking-[-0.005em]">${esc(mostCommon(cafes.map((c) => c.area)))}</span>
    <span class="-mr-1.5 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-ink px-1.5 text-xs font-[650] text-white tabular-nums">${cafes.length}</span>
  </span>`;
}

export function dot(zoneId: ZoneId, size = 'size-2', extra = ''): string {
  return `<span class="${size} flex-none rounded-full bg-(--zone) ${extra}" style="--zone:${ZONES[zoneId].color}"></span>`;
}

/** `zone-pill` is a hook: the map hides these until it is zoomed in far enough. */
export function zonePill(zoneId: ZoneId, label: string): string {
  return `<span class="zone-pill inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/90 py-1 pl-2 pr-2.5 text-xs font-semibold text-ink-2 shadow-[0_1px_2px_rgb(23_21_17/0.1)] transition-opacity duration-300">${dot(zoneId, 'size-[7px]')}${esc(label)}</span>`;
}
