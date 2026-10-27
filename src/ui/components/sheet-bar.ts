import { html, type Html } from '@/lib/html';
import { icon } from '@/lib/icons';

/** The panel's top row: whatever `start` holds, and a close button. Stays put while the panel scrolls. */
export function sheetBar(start: Html): Html {
  return html`<div class="sticky top-0 z-[2] flex h-14 items-center justify-between gap-2 bg-paper/90 pl-3 pr-3 backdrop-blur-md">
    ${start}
    <button type="button" class="grid size-9 flex-none cursor-pointer place-items-center rounded-full border-0 bg-sunk text-ink hover:bg-line" data-close-sheet aria-label="Close">${icon('close', 18)}</button>
  </div>`;
}
