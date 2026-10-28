import type { ZoneId } from '@/domain/types';
import { ZONES } from '@/domain/zones';
import { html, type Html } from '@/lib/html';

export function zoneDot(zoneId: ZoneId, size = 'size-2', extra = ''): Html {
  return html`<span class="${size} flex-none rounded-full bg-(--zone) ${extra}" style="--zone:${ZONES[zoneId].color}"></span>`;
}

/** `zone-pill` is a hook: the map hides these until it is zoomed in far enough. Its edge takes the zone's colour. */
export function zonePill(zoneId: ZoneId, label: string): Html {
  return html`<span class="zone-pill inline-flex items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-white py-1 pl-2 pr-2.5 font-display text-[13px] font-bold tracking-[-0.01em] text-ink shadow-[0_3px_0_var(--zone),0_0_0_1px_rgb(23_21_17/0.06),0_6px_12px_-4px_rgb(23_21_17/0.25)] transition-opacity duration-300" style="--zone:${ZONES[zoneId].color}">${zoneDot(zoneId, 'size-2')}${label}</span>`;
}
