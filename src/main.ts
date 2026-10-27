import './styles.css';
import type { PaddingOptions } from 'maplibre-gl';
import { CITIES, CITY_ORDER } from './data/cities';
import type { CityId, ZoneId } from './data/types';
import { statsLine, statsOf, zoneOf } from './data/zones';
import { createMap } from './map';
import { renderBill } from './ui/bill';
import { $ } from './ui/dom';
import { handlesText, investorsIn, renderFollow } from './ui/follow';
import { renderLegend } from './ui/legend';
import { DISCLAIMER, renderTab } from './ui/tab';

interface State {
  city: CityId;
  zone: ZoneId | null;
  selected: string | null;
  /** False while the intro hero is up; true once the person has dived into the map. */
  dived: boolean;
  tab: boolean;
}

const state: State = { city: 'bengaluru', zone: null, selected: null, dived: false, tab: false };
const desktop = window.matchMedia('(min-width: 900px)');
const body = document.body;

const el = {
  hero: $('.hero'),
  eyebrow: $('#eyebrow'),
  headline: $('#headline'),
  stats: $('#stats'),
  legend: $('#legend'),
  legendZones: $('#legend-zones'),
  legendToggle: $<HTMLButtonElement>('#legend-toggle'),
  bill: $('#bill'),
  billBody: $('#bill-body'),
  tab: $('#tab'),
  tabBody: $('#tab-body'),
  follow: $<HTMLDialogElement>('#follow'),
  toast: $('#toast'),
  banner: $('#banner'),
};

$('#disclaimer').textContent = DISCLAIMER;

const city = () => CITIES[state.city];
const visible = () => city().cafes.filter((c) => !state.zone || zoneOf(c) === state.zone);
const followable = () => investorsIn(city().cafes).filter((p) => p.handle).length;

const map = createMap($('#map'), city(), {
  pick: (slug) => go(slug),
  userMove: () => dive(false),
  tilesFailing: () => (el.banner.hidden = false),
});

function padding(): PaddingOptions {
  const billOpen = !el.bill.hidden;
  // Café cards hang above their pin, so the top edge needs room for a whole card.
  if (desktop.matches) {
    const left = state.dived ? 120 : Math.round(el.hero.getBoundingClientRect().right) + 90;
    return { top: 190, bottom: 70, left, right: billOpen ? 520 : 120 };
  }
  if (billOpen) return { top: 160, bottom: Math.round(window.innerHeight * 0.66), left: 70, right: 70 };
  const top = (state.dived ? 70 : Math.round(el.hero.getBoundingClientRect().bottom)) + 90;
  return { top, bottom: state.dived ? 130 : 60, left: 70, right: 70 };
}

function renderCity(fit: boolean): void {
  const c = city();
  const n = followable();
  document.title = `Cheque, Please — ${c.name}`;
  document.documentElement.dataset.city = c.id;
  for (const opt of document.querySelectorAll<HTMLAnchorElement>('.switch-opt')) {
    opt.setAttribute('aria-current', String(opt.dataset.city === c.id));
  }
  el.eyebrow.textContent = `Cheque, Please · ${c.name}`;
  el.headline.textContent = c.headline;
  el.stats.textContent = statsLine(statsOf(c.cafes));
  for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-open-follow]')) {
    b.textContent = `Follow the ${n} on X`;
    b.hidden = n === 0;
  }
  el.legendZones.innerHTML = renderLegend(c.cafes, state.zone);
  if (state.tab) el.tabBody.innerHTML = renderTab(c, c.cafes, n);
  map.setPadding(padding());
  map.show(c, visible(), fit);
}

function dive(fit: boolean): void {
  if (state.dived) return;
  state.dived = true;
  body.classList.replace('intro', 'dived');
  map.setPadding(padding());
  if (fit) map.fit();
}

function surface(): void {
  closeBill();
  state.dived = false;
  body.classList.replace('dived', 'intro');
  map.setPadding(padding());
  map.fit();
}

function openCafe(slug: string): void {
  const c = city();
  const index = c.cafes.findIndex((x) => x.slug === slug);
  if (index < 0) return;
  const cafe = c.cafes[index];
  dive(false);
  state.selected = slug;
  el.billBody.innerHTML = renderBill(cafe, c, index + 1);
  el.bill.hidden = false;
  body.classList.add('bill-open');
  el.billBody.querySelector('.bill-paper')?.scrollTo(0, 0);
  map.select(slug);
  map.setPadding(padding());
  map.focus(cafe);
}

function closeBill(): void {
  if (el.bill.hidden) return;
  el.bill.hidden = true;
  body.classList.remove('bill-open');
  state.selected = null;
  map.select(null);
  map.setPadding(padding());
}

function openTab(): void {
  state.tab = true;
  el.tabBody.innerHTML = renderTab(city(), city().cafes, followable());
  el.tab.hidden = false;
  el.tab.scrollTop = 0;
  body.classList.add('tab-open');
  el.tab.focus({ preventScroll: true });
}

function closeTab(): void {
  if (!state.tab) return;
  state.tab = false;
  el.tab.hidden = true;
  body.classList.remove('tab-open');
}

/** Routes: #/<city>, #/<city>/list, #/<city>/<café-slug>. */
function go(rest: string | null): void {
  const next = `#/${state.city}${rest ? `/${rest}` : ''}`;
  if (location.hash === next) readHash();
  else location.hash = next;
}

function readHash(): void {
  const [cityId, rest] = location.hash.replace(/^#\/?/, '').split('/');
  const nextCity = CITY_ORDER.includes(cityId as CityId) ? (cityId as CityId) : state.city;
  if (nextCity !== state.city || !el.headline.textContent) {
    state.city = nextCity;
    state.zone = null;
    closeBill();
    renderCity(!rest || rest === 'list');
  }
  if (rest === 'list') {
    openTab();
    return;
  }
  closeTab();
  if (rest && rest !== state.selected) openCafe(rest);
  else if (!rest) closeBill();
}

function toast(message: string): void {
  el.toast.textContent = message;
  el.toast.classList.add('is-on');
  window.setTimeout(() => el.toast.classList.remove('is-on'), 1800);
}

async function copy(text: string, done: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast('Could not reach the clipboard');
  }
}

function openFollow(scoped: boolean): void {
  const c = city();
  const cafe = scoped ? c.cafes.find((x) => x.slug === state.selected) : null;
  el.follow.innerHTML = cafe
    ? renderFollow(c.name, [cafe], {
        title: `${cafe.name}, ${cafe.branch}`,
        intro: 'The investors with a receipt on this bill. Follow, read, then ask for a proper intro.',
      })
    : renderFollow(c.name, c.cafes);
  el.follow.dataset.scope = cafe ? cafe.slug : '';
  el.follow.showModal();
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('[data-open-follow]')) openFollow(false);
  else if (target.closest('[data-follow-bill]')) openFollow(true);
  else if (target.closest('[data-open-tab]')) go('list');
  else if (target.closest('[data-copy-link]')) copy(location.href, 'Link copied');
  else if (target.closest('[data-print]')) window.print();
});

$('#brand').addEventListener('click', (e) => {
  e.preventDefault();
  if (location.hash !== `#/${state.city}`) history.pushState(null, '', `#/${state.city}`);
  closeTab();
  surface();
});

$('#dive-hint').addEventListener('click', () => dive(true));

el.legendZones.addEventListener('click', (e) => {
  const row = (e.target as HTMLElement).closest<HTMLButtonElement>('.zone-row');
  if (!row) return;
  const zone = row.dataset.zone as ZoneId;
  state.zone = state.zone === zone ? null : zone;
  if (state.selected && !visible().some((c) => c.slug === state.selected)) go(null);
  dive(false);
  renderCity(true);
});

el.legendToggle.addEventListener('click', () => {
  const open = el.legendToggle.getAttribute('aria-expanded') !== 'true';
  el.legendToggle.setAttribute('aria-expanded', String(open));
  el.legendToggle.textContent = open ? '−' : '+';
  el.legendToggle.setAttribute('aria-label', open ? 'Collapse zones' : 'Expand zones');
  el.legend.classList.toggle('is-collapsed', !open);
});

$('#tab-close').addEventListener('click', () => go(null));
el.tabBody.addEventListener('click', (e) => {
  const row = (e.target as HTMLElement).closest<HTMLButtonElement>('.tab-cafe');
  if (row?.dataset.slug) go(row.dataset.slug);
});

$('#bill-close').addEventListener('click', () => go(null));

el.follow.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target === el.follow || target.closest('[data-close]')) el.follow.close();
  if (target.closest('[data-copy]')) {
    const scope = city().cafes.filter((c) => c.slug === el.follow.dataset.scope);
    copy(handlesText(scope.length ? scope : city().cafes), 'Handles copied');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || el.follow.open) return;
  if (state.tab || state.selected) go(null);
});

window.addEventListener('hashchange', readHash);
desktop.addEventListener('change', () => map.setPadding(padding()));
window.addEventListener('resize', () => map.setPadding(padding()));

readHash();

// Debug handle for the screenshot harness.
(window as unknown as Record<string, unknown>).__cheque = { state, go, dive };
