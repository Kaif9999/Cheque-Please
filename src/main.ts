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
import { DISCLAIMER, renderList } from './ui/list';

interface State {
  city: CityId;
  zone: ZoneId | null;
  selected: string | null;
}

const state: State = { city: 'bengaluru', zone: null, selected: null };
const desktop = window.matchMedia('(min-width: 900px)');

const el = {
  hero: $('.hero'),
  eyebrow: $('#eyebrow'),
  headline: $('#headline'),
  stats: $('#stats'),
  followOpen: $<HTMLButtonElement>('#follow-open'),
  listOpen: $<HTMLButtonElement>('#list-open'),
  legend: $('#legend'),
  bill: $('#bill'),
  billBody: $('#bill-body'),
  list: $('#list'),
  listTitle: $('#list-title'),
  listBody: $('#list-body'),
  follow: $<HTMLDialogElement>('#follow'),
  toast: $('#toast'),
};

$('#disclaimer').textContent = DISCLAIMER;

const city = () => CITIES[state.city];
const visible = () => city().cafes.filter((c) => !state.zone || zoneOf(c) === state.zone);

const map = createMap($('#map'), city(), (slug) => openCafe(slug));

function padding(): PaddingOptions {
  const billOpen = !el.bill.hidden;
  if (desktop.matches) {
    const hero = el.hero.getBoundingClientRect();
    return { top: 96, bottom: 96, left: Math.round(hero.right) + 24, right: billOpen ? 460 : 72 };
  }
  const top = Math.round(el.hero.getBoundingClientRect().bottom) + 8;
  return { top, bottom: billOpen ? Math.round(window.innerHeight * 0.55) : 88, left: 28, right: 28 };
}

function renderCity(fit: boolean): void {
  const c = city();
  const stats = statsOf(c.cafes);
  const people = investorsIn(c.cafes).filter((p) => p.handle).length;
  document.title = `Cheque, Please — ${c.name}`;
  document.documentElement.dataset.city = c.id;
  for (const opt of document.querySelectorAll<HTMLAnchorElement>('.switch-opt')) {
    opt.setAttribute('aria-current', String(opt.dataset.city === c.id));
  }
  el.eyebrow.textContent = `Cheque, Please · ${c.name}`;
  el.headline.textContent = c.headline;
  el.stats.textContent = statsLine(stats);
  el.followOpen.textContent = `Follow the ${people} on X`;
  el.followOpen.hidden = people === 0;
  el.legend.innerHTML = renderLegend(c.cafes, state.zone);
  el.listTitle.textContent = `${c.name} · ${statsLine(statsOf(visible()))}`;
  el.listBody.innerHTML = renderList(c, visible());
  map.setPadding(padding());
  map.show(c, visible(), fit);
}

function openCafe(slug: string, fly = true): void {
  const c = city();
  const index = c.cafes.findIndex((x) => x.slug === slug);
  if (index < 0) return;
  const cafe = c.cafes[index];
  state.selected = slug;
  el.billBody.innerHTML = renderBill(cafe, c, index + 1);
  el.bill.hidden = false;
  el.bill.scrollTop = 0;
  closeList();
  map.select(slug);
  map.setPadding(padding());
  if (fly) map.focus(cafe);
  writeHash();
}

function closeBill(): void {
  if (el.bill.hidden) return;
  el.bill.hidden = true;
  state.selected = null;
  map.select(null);
  map.setPadding(padding());
  writeHash();
}

function openList(): void {
  el.list.hidden = false;
  document.body.classList.add('list-open');
  $('#list-close').focus();
}

function closeList(): void {
  el.list.hidden = true;
  document.body.classList.remove('list-open');
}

function writeHash(): void {
  const next = `#/${state.city}${state.selected ? `/${state.selected}` : ''}`;
  if (location.hash !== next) history.replaceState(null, '', next);
}

function readHash(): void {
  const [cityId, slug] = location.hash.replace(/^#\/?/, '').split('/');
  const nextCity = CITY_ORDER.includes(cityId as CityId) ? (cityId as CityId) : state.city;
  const cityChanged = nextCity !== state.city || !el.headline.textContent;
  state.city = nextCity;
  if (cityChanged) {
    state.zone = null;
    el.bill.hidden = true;
    state.selected = null;
    renderCity(!slug);
  }
  if (slug && slug !== state.selected) openCafe(slug);
  else if (!slug) closeBill();
}

function toast(message: string): void {
  el.toast.textContent = message;
  el.toast.classList.add('is-on');
  window.setTimeout(() => el.toast.classList.remove('is-on'), 1800);
}

el.legend.addEventListener('click', (e) => {
  const chip = (e.target as HTMLElement).closest<HTMLButtonElement>('.chip');
  if (!chip) return;
  const zone = chip.dataset.zone as ZoneId;
  state.zone = state.zone === zone ? null : zone;
  if (state.selected && !visible().some((c) => c.slug === state.selected)) closeBill();
  renderCity(true);
});

el.listOpen.addEventListener('click', openList);
$('#list-close').addEventListener('click', closeList);
el.listBody.addEventListener('click', (e) => {
  const row = (e.target as HTMLElement).closest<HTMLButtonElement>('.list-row');
  if (row?.dataset.slug) openCafe(row.dataset.slug);
});

$('#bill-close').addEventListener('click', closeBill);

el.followOpen.addEventListener('click', () => {
  el.follow.innerHTML = renderFollow(city().name, city().cafes);
  el.follow.showModal();
});
el.follow.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  if (target === el.follow || target.closest('[data-close]')) el.follow.close();
  if (target.closest('[data-copy]')) {
    try {
      await navigator.clipboard.writeText(handlesText(city().cafes));
      toast('Handles copied');
    } catch {
      toast('Could not reach the clipboard');
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || el.follow.open) return;
  if (!el.list.hidden) closeList();
  else closeBill();
});

window.addEventListener('hashchange', readHash);
desktop.addEventListener('change', () => map.setPadding(padding()));
window.addEventListener('resize', () => map.setPadding(padding()));

readHash();

// Debug handle for the screenshot harness.
(window as unknown as Record<string, unknown>).__cheque = { state, open: openCafe, openList, closeBill };
