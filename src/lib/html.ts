const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for use inside markup, including quoted attribute values. */
export function escape(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESC[ch] ?? ch);
}

/** Markup that is safe to insert as is. Only `html` and `raw` make one. */
export class Html {
  readonly #markup: string;

  constructor(markup: string) {
    this.#markup = markup;
  }

  toString(): string {
    return this.#markup;
  }
}

/**
 * What a template accepts. Strings and numbers are escaped, `Html` goes in as is,
 * lists are joined, and null, undefined or false leave nothing. Booleans other
 * than false are refused so `aria-pressed="${on}"` has to spell out `String(on)`.
 */
export type Interpolation = Html | string | number | false | null | undefined | readonly Interpolation[];

function render(value: Interpolation): string {
  if (value instanceof Html) return value.toString();
  if (Array.isArray(value)) return value.map(render).join('');
  if (value === null || value === undefined || value === false) return '';
  return escape(String(value));
}

/** Template tag that escapes every interpolated value unless it is already `Html`. */
export function html(strings: TemplateStringsArray, ...values: Interpolation[]): Html {
  let markup = strings[0] ?? '';
  values.forEach((value, i) => {
    markup += render(value) + (strings[i + 1] ?? '');
  });
  return new Html(markup);
}

/** Trusts a string as markup. Only for constants written in this codebase, never for data. */
export function raw(markup: string): Html {
  return new Html(markup);
}

/** Replaces an element's contents. The only place markup reaches the page. */
export function mount(el: Element, content: Html): void {
  el.innerHTML = content.toString();
}
