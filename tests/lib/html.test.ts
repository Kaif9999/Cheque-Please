import { describe, expect, it } from 'vitest';
import { CITIES } from '@/data/cities';
import type { Cafe } from '@/domain/types';
import { escape, html, raw } from '@/lib/html';
import { renderDetail } from '@/ui/views/detail';
import { renderList } from '@/ui/views/list';

const ATTACK = `"><img src=x onerror=alert(1)>`;

describe('escape', () => {
  it('escapes the five characters that can break out of text or a quoted attribute', () => {
    expect(escape(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });
});

describe('html', () => {
  it('escapes interpolated strings in text and attributes', () => {
    expect(String(html`<p title="${ATTACK}">${ATTACK}</p>`)).not.toContain('<img');
  });

  it('keeps nested templates and raw markup as markup', () => {
    const inner = html`<b>${'<i>'}</b>`;
    expect(String(html`<p>${inner}${raw('<br>')}</p>`)).toBe('<p><b>&lt;i&gt;</b><br></p>');
  });

  it('joins lists and drops null, undefined and false', () => {
    const items = ['a', 'b'].map((x) => html`<li>${x}</li>`);
    expect(String(html`<ul>${items}${null}${undefined}${false}</ul>`)).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  it('prints numbers, including zero', () => {
    expect(String(html`${0} of ${12}`)).toBe('0 of 12');
  });
});

describe('views', () => {
  const city = CITIES.bengaluru;
  const real = city.cafes[0]!;
  const hostile: Cafe = { ...real, name: ATTACK, branch: ATTACK, area: ATTACK, note: ATTACK };
  const tampered = { ...city, cafes: [hostile, ...city.cafes.slice(1)] };

  it('escapes café data in the list', () => {
    expect(String(renderList(tampered, null))).not.toContain('<img src=x');
  });

  it('escapes café data on the café page', () => {
    expect(String(renderDetail(tampered, hostile))).not.toContain('<img src=x');
  });
});
