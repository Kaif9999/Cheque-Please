import type { Cafe, Investor } from '../data/types';
import { issueUrl } from '../config';
import { ARROW, avatar, esc } from './dom';

/** Unique receipted investors: followable ones first, then by café count. */
export function investorsIn(cafes: Cafe[]): (Investor & { cafes: string[] })[] {
  const byKey = new Map<string, Investor & { cafes: string[] }>();
  for (const cafe of cafes) {
    for (const vc of cafe.vcs) {
      const key = (vc.handle ?? vc.name).toLowerCase();
      const seen = byKey.get(key);
      if (seen) {
        if (!seen.cafes.includes(cafe.name)) seen.cafes.push(cafe.name);
      } else byKey.set(key, { ...vc, cafes: [cafe.name] });
    }
  }
  return [...byKey.values()].sort(
    (a, b) => Number(!!b.handle) - Number(!!a.handle) || b.cafes.length - a.cafes.length || a.name.localeCompare(b.name),
  );
}

export function renderFollow(cityName: string, cafes: Cafe[]): string {
  const people = investorsIn(cafes);
  const onX = people.filter((p) => p.handle);
  const remove = issueUrl({ city: cityName, request: 'Remove me' });
  const rows = people
    .map(
      (p) => `<li class="follow-row">
        ${avatar(p.name, p.avatar, 36)}
        <span class="follow-main">
          <span class="follow-name">${esc(p.name)}</span>
          <span class="follow-meta">${esc([p.fund, p.handle ? `@${p.handle}` : ''].filter(Boolean).join(' · '))}</span>
          <span class="follow-cafes">${esc(p.cafes.join(', '))}</span>
        </span>
        ${
          p.handle
            ? `<a class="btn btn--small" href="https://x.com/intent/follow?screen_name=${encodeURIComponent(p.handle)}" target="_blank" rel="noopener noreferrer">Follow</a>`
            : ''
        }
      </li>`,
    )
    .join('');
  return `
    <header class="sheet-head">
      <h2 id="follow-title">Follow the ${onX.length} on X</h2>
      <p>Every name here has a public receipt on the ${esc(cityName)} map. Follow, read, then ask for a proper intro.</p>
      <button type="button" class="sheet-close" data-close aria-label="Close">×</button>
    </header>
    <ol class="follow-list">${rows || '<li class="empty">No named investors on this map yet.</li>'}</ol>
    <footer class="sheet-foot">
      ${onX.length ? '<button type="button" class="linkish" data-copy>Copy handles</button>' : ''}
      ${remove ? `<a class="linkish" href="${esc(remove)}" target="_blank" rel="noopener noreferrer">Listed and want out? Ask to be removed ${ARROW}</a>` : ''}
    </footer>`;
}

export function handlesText(cafes: Cafe[]): string {
  return investorsIn(cafes)
    .filter((p) => p.handle)
    .map((p) => `@${p.handle}`)
    .join('\n');
}
