import type { ZoneId } from '@/domain/types';
import { ZONES } from '@/domain/zones';
import { esc } from '@/lib/dom';

export function zoneDot(zoneId: ZoneId, size = 'size-2', extra = ''): string {
  return `<span class="${size} flex-none rounded-full bg-(--zone) ${extra}" style="--zone:${ZONES[zoneId].color}"></span>`;
}

/** `zone-pill` is a hook: the map hides these until it is zoomed in far enough. */
export function zonePill(zoneId: ZoneId, label: string): string {
  return `<span class="zone-pill inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/90 py-1 pl-2 pr-2.5 text-xs font-semibold text-ink-2 shadow-[0_1px_2px_rgb(23_21_17/0.1)] transition-opacity duration-300">${zoneDot(zoneId, 'size-[7px]')}${esc(label)}</span>`;
}
