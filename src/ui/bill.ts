import type { Cafe, City, Investor, SceneItem } from '../data/types';
import { plural, receiptsOf, ZONES, zoneOf } from '../data/zones';
import { issueUrl } from '../config';
import { ARROW, avatar, esc, shortDate } from './dom';

function source(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

function proofLabel(vc: Investor): string {
  const { proof } = vc;
  if (proof.kind === 'own') return 'tweet';
  if (proof.kind === 'spotted') return 'spotted';
  return proof.author ?? source(proof.url);
}

function spottedBy(vc: Investor): string {
  if (vc.proof.kind !== 'spotted') return '';
  return ` · posted by ${esc(vc.proof.authorHandle ? `@${vc.proof.authorHandle}` : vc.proof.author ?? 'someone else')}`;
}

function investorItem(vc: Investor): string {
  const who = vc.handle ? `@${vc.handle}` : vc.name;
  return `<li>
    <a class="item" href="${esc(vc.proof.url)}" target="_blank" rel="noopener noreferrer" title="Open the receipt">
      <span class="item-line">
        ${avatar(vc.name, vc.avatar, 20)}
        <span class="item-who">${esc(who)}</span>
        ${vc.fund ? `<span class="item-fund">(${esc(vc.fund)})</span>` : ''}
        <span class="leader" aria-hidden="true"></span>
        <span class="item-what">${esc(proofLabel(vc))} · ${esc(shortDate(vc.proof.date))} ${ARROW}</span>
      </span>
      <span class="item-name">${esc(vc.name)}${spottedBy(vc)}</span>
      <q class="item-quote">${esc(vc.proof.text)}</q>
    </a>
  </li>`;
}

function sceneItem(item: SceneItem): string {
  const who = item.authorHandle ? `@${item.authorHandle}` : item.author;
  return `<li>
    <a class="item" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" title="Open the receipt">
      <span class="item-line">
        <span class="item-who">${esc(who)}</span>
        <span class="leader" aria-hidden="true"></span>
        <span class="item-what">${item.kind === 'tweet' ? 'tweet' : esc(source(item.url))} · ${esc(shortDate(item.date))} ${ARROW}</span>
      </span>
      <q class="item-quote">${esc(item.text)}</q>
    </a>
  </li>`;
}

export function renderBill(cafe: Cafe, city: City, billNo: number): string {
  const zone = ZONES[zoneOf(cafe)];
  const n = receiptsOf(cafe);
  const sceneOnly = cafe.vcs.length === 0;
  const add = issueUrl({ city: city.name, cafe: `${cafe.name}, ${cafe.branch}`, request: 'Add a receipt' });
  return `
    <div class="bill-paper">
      <p class="bill-kicker">Bill no. ${String(billNo).padStart(2, '0')} · ${esc(city.name)}</p>
      <h2 class="bill-title" id="bill-title">${esc(cafe.name)}</h2>
      <p class="bill-sub">${esc(cafe.branch)}${cafe.branch === cafe.area ? '' : ` · ${esc(cafe.area)}`}</p>
      <p class="zone-tag" style="--zone:${zone.color}"><span class="zone-dot${sceneOnly ? ' zone-dot--hollow' : ''}"></span>${esc(zone.label)}</p>
      <div class="stamp${sceneOnly ? ' stamp--scene' : ''}" aria-hidden="true">${sceneOnly ? 'Scene only' : esc(plural(n, 'receipt'))}</div>
      ${cafe.note ? `<p class="bill-note">${esc(cafe.note)}</p>` : ''}
      ${cafe.vcs.length ? `<p class="bill-label">Investors on record</p><ol class="items">${cafe.vcs.map(investorItem).join('')}</ol>` : ''}
      ${cafe.scene.length ? `<p class="bill-label">The scene</p><ol class="items">${cafe.scene.map(sceneItem).join('')}</ol>` : ''}
      <p class="bill-total"><span>Total</span><span class="leader" aria-hidden="true"></span><span>${esc(plural(n, 'receipt'))}</span></p>
      <div class="bill-actions">
        <a class="btn btn--small" href="${esc(cafe.maps_url)}" target="_blank" rel="noopener noreferrer">Open in Maps ${ARROW}</a>
        ${add ? `<a class="btn btn--small btn--ghost" href="${esc(add)}" target="_blank" rel="noopener noreferrer">Add a receipt</a>` : ''}
      </div>
      <p class="bill-thanks">Thank you. Visit again.</p>
    </div>`;
}
