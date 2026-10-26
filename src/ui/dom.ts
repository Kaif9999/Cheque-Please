const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for interpolation into innerHTML. */
export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESC[ch]);
}

export function $<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

/** "Mar 24, 2023" -> "Mar '23"; leaves anything else alone. */
export function shortDate(date: string): string {
  const m = /^([A-Z][a-z]{2})[a-z]*\.? \d{1,2}, \d{2}(\d{2})$/.exec(date.trim());
  return m ? `${m[1]} '${m[2]}` : date;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function avatar(name: string, src: string | undefined, size = 22): string {
  if (src) return `<img class="avatar" src="${esc(src)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
  return `<span class="avatar avatar--initials" style="width:${size}px;height:${size}px" aria-hidden="true">${esc(initials(name))}</span>`;
}

export const ARROW = '<span class="arrow" aria-hidden="true">↗</span>';
