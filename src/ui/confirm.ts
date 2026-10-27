import { html, mount } from '@/lib/html';
import { icon } from '@/lib/icons';

/** Briefly swaps a button's label for a confirmation, then puts it back. */
export function confirm(button: HTMLElement, text: string): void {
  const before = [...button.childNodes];
  mount(button, html`${icon('check')}<span>${text}</span>`);
  button.classList.add('is-done');
  window.setTimeout(() => {
    button.replaceChildren(...before);
    button.classList.remove('is-done');
  }, 1600);
}
