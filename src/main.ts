import './styles.css';
import type { PaddingOptions } from 'maplibre-gl';
import { createRouter } from '@/app/router';
import { CITIES, CITY_ORDER } from '@/data/cities';
import { handlesText } from '@/domain/people';
import type { Panel, Route } from '@/domain/routes';
import type { Cafe, CityId, ZoneId } from '@/domain/types';
import { zoneOf } from '@/domain/zones';
import { $ } from '@/lib/dom';
import { html, mount } from '@/lib/html';
import { icon } from '@/lib/icons';
import { createMap } from '@/map';
import { renderDetail } from '@/ui/views/detail';
import { renderFollow } from '@/ui/views/follow';
import { renderHero } from '@/ui/views/hero';
import { renderLegend } from '@/ui/views/legend';
import { renderList } from '@/ui/views/list';
import { renderListPill, renderTopActions } from '@/ui/views/topbar';

interface State {
  city: CityId;
  filter: ZoneId | null;
  selected: string | null;
  /** The panel shows the café list (when no café is selected). */
  list: boolean;
  /** 'intro' while the cover is up; 'map' once the person has started exploring. */
  mode: 'intro' | 'map';
}

const state: State = { city: 'bengaluru', filter: null, selected: null, list: false, mode: 'intro' };
const wide = window.matchMedia('(min-width: 1024px)');
const el = {
  topbar: $('#topbar'),
  topActions: $('#top-actions'),
  hero: $('#hero'),
  heroBody: $('#hero-body'),
  legend: $('#legend'),
  listPill: $('#list-pill'),
  sheet: $('#sheet'),
  sheetBody: $('#sheet-body'),
  follow: $<HTMLDialogElement>('#follow'),
};
/** Where the list was scrolled to, so coming back from a café returns to the same spot. */
let listScroll = 0;

const city = () => CITIES[state.city];
const visible = () => city().cafes.filter((c) => !state.filter || zoneOf(c) === state.filter);
const selectedCafe = (): Cafe | undefined => city().cafes.find((c) => c.slug === state.selected);
const sheetOpen = () => !!state.selected || state.list;

const map = createMap(
  $('#map'),
  city(),
  {
    pick: (slug) => go({ kind: 'cafe', slug }),
    hover: (slug) => {
      for (const row of el.sheetBody.querySelectorAll<HTMLElement>('[data-slug]')) row.classList.toggle('is-hover', row.dataset.slug === slug);
    },
    userMove: () => dive(false),
    tilesFailing: () => ($('#banner').hidden = false),
  },
  () => wide.matches,
);

/** Keeps pins clear of whatever covers the map: the cover, the top bar, the legend and the panel. */
function padding(): PaddingOptions {
  const below = (node: HTMLElement) => node.getBoundingClientRect().bottom;
  if (wide.matches) {
    // Pins are labelled pills centred on the café, so the sides need room for half a label.
    // On the cover, pins start past the gradient, but always keep at least 40% of the width for them.
    const left = state.mode === 'intro' ? Math.min(el.heroBody.getBoundingClientRect().right + 200, window.innerWidth * 0.6) : 120;
    const right = sheetOpen() ? el.sheet.offsetWidth + 20 + 100 : 120;
    return { top: below(el.topbar) + 72, bottom: 64, left, right };
  }
  const top = (state.mode === 'intro' ? below(el.heroBody) : below(el.legend)) + 36;
  const bottom = sheetOpen() ? el.sheet.offsetHeight + 28 : 96;
  return { top, bottom, left: 72, right: 72 };
}

/** Everything outside the panel: page state, title, city switch, cover, legend and shortcuts. */
function renderChrome(): void {
  const c = city();
  const cafe = selectedCafe();
  document.body.dataset.mode = state.mode;
  document.body.dataset.sheet = sheetOpen() ? 'open' : 'closed';
  document.title = cafe ? `${cafe.name}, ${cafe.area} · Cheque, Please` : `Cheque, Please · ${c.name}`;
  for (const opt of document.querySelectorAll<HTMLAnchorElement>('.seg-opt')) {
    opt.setAttribute('aria-current', String(opt.dataset.city === c.id));
  }
  mount(el.heroBody, renderHero(c));
  mount(el.legend, renderLegend(c.cafes, state.filter));
  mount(el.topActions, renderTopActions(c));
  mount(el.listPill, renderListPill(c));
}

/** The panel keeps its last contents while closed, so it doesn't empty out as it slides away. */
function renderSheet(): void {
  const c = city();
  const cafe = selectedCafe();
  if (cafe) {
    mount(el.sheetBody, renderDetail(c, cafe));
    el.sheetBody.scrollTop = 0;
  } else if (state.list) {
    mount(el.sheetBody, renderList(c, state.filter));
    el.sheetBody.scrollTop = listScroll;
  }
}

/** Clears the cover. `fit` reframes the map now that the whole of it is free. */
function dive(fit: boolean): void {
  if (state.mode === 'map') return;
  state.mode = 'map';
  renderChrome();
  map.setPadding(padding());
  if (fit) map.fit();
}

/** Back to the cover for the current city. */
function surface(): void {
  state.mode = 'intro';
  state.filter = null;
  state.selected = null;
  state.list = false;
  listScroll = 0;
  renderChrome();
  map.setPadding(padding());
  map.show(city(), visible(), true);
  map.select(null);
  go(null);
}

function setFilter(zone: ZoneId | null): void {
  state.filter = state.filter === zone ? null : zone;
  state.mode = 'map';
  listScroll = 0;
  // A café the filter hides can't stay open.
  const hidden = !!state.selected && !visible().some((c) => c.slug === state.selected);
  if (hidden) state.selected = null;
  renderChrome();
  renderSheet();
  map.setPadding(padding());
  map.show(city(), visible(), true);
  map.select(state.selected);
  if (hidden) go(null);
}

/** Opens a panel (or closes it, with null) in the current city. */
function go(panel: Panel): void {
  router.go(state.city, panel);
}

function applyRoute(route: Route): void {
  const nextCity = route.city ?? state.city;
  const cityChanged = nextCity !== state.city || !el.heroBody.hasChildNodes();
  const wasOpen = sheetOpen();
  if (state.list && !state.selected) listScroll = el.sheetBody.scrollTop;
  if (cityChanged) {
    state.city = nextCity;
    state.filter = null;
    listScroll = 0;
  }
  const slug = route.panel?.kind === 'cafe' ? route.panel.slug : null;
  const cafe = slug ? CITIES[nextCity].cafes.find((c) => c.slug === slug) : undefined;
  if (cafe && state.filter && zoneOf(cafe) !== state.filter) state.filter = null;
  state.selected = cafe?.slug ?? null;
  state.list = route.panel?.kind === 'list';
  if (sheetOpen()) state.mode = 'map';
  renderChrome();
  renderSheet();
  map.setPadding(padding());
  if (cityChanged) map.show(city(), visible(), !cafe);
  // On phones the sheet leaves too little map to refit into; the pins stay where they were.
  else if (state.list && !wasOpen && wide.matches) map.fit();
  map.select(state.selected);
  if (cafe) map.focus(cafe);
}

/** Briefly swaps a button's label for a confirmation, then puts it back. */
function confirm(button: HTMLElement, text: string): void {
  const before = [...button.childNodes];
  mount(button, html`${icon('check')}<span>${text}</span>`);
  button.classList.add('is-done');
  window.setTimeout(() => {
    button.replaceChildren(...before);
    button.classList.remove('is-done');
  }, 1600);
}

async function share(button: HTMLElement): Promise<void> {
  const cafe = selectedCafe();
  const title = cafe ? `${cafe.name}, ${cafe.area}` : city().headline;
  if (navigator.share && !wide.matches) {
    try {
      await navigator.share({ title, url: location.href });
      return;
    } catch {
      // Dismissed or unsupported; fall through to copying the link.
    }
  }
  try {
    await navigator.clipboard.writeText(location.href);
    confirm(button, 'Link copied');
  } catch {
    confirm(button, 'Copy the address bar');
  }
}

function openFollow(cafes: Cafe[], title: string): void {
  mount(el.follow, renderFollow(title, cafes, city().name));
  el.follow.dataset.slugs = cafes.map((c) => c.slug).join(' ');
  el.follow.showModal();
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (el.follow.contains(target)) return;
  const filter = target.closest<HTMLElement>('[data-filter]');
  if (filter) return setFilter((filter.dataset.filter || null) as ZoneId | null);
  if (target.closest('[data-explore]')) return dive(true);
  if (target.closest('[data-open-list]')) return go({ kind: 'list' });
  if (target.closest('[data-close-sheet]')) return go(null);
  const shareBtn = target.closest<HTMLElement>('[data-share]');
  if (shareBtn) return void share(shareBtn);
  if (target.closest('[data-follow-all]')) return openFollow(city().cafes, `Follow all ${city().name} investors`);
  const cafe = selectedCafe();
  if (cafe && target.closest('[data-follow-cafe]')) openFollow([cafe], `Seen at ${cafe.name}`);
});

el.sheetBody.addEventListener('pointerover', (e) => {
  const row = (e.target as HTMLElement).closest<HTMLElement>('a[data-slug]');
  map.highlight(row?.dataset.slug ?? null);
});
el.sheetBody.addEventListener('pointerleave', () => map.highlight(null));

// Scrolling or swiping over the cover is the same gesture as diving into the map.
el.hero.addEventListener('wheel', () => dive(true), { passive: true });
el.hero.addEventListener('touchmove', () => dive(true), { passive: true });

el.follow.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  if (target === el.follow || target.closest('[data-close]')) el.follow.close();
  const copyBtn = target.closest<HTMLElement>('[data-copy]');
  if (copyBtn) {
    const slugs = (el.follow.dataset.slugs ?? '').split(' ');
    try {
      await navigator.clipboard.writeText(handlesText(city().cafes.filter((c) => slugs.includes(c.slug))));
      confirm(copyBtn, 'Copied');
    } catch {
      confirm(copyBtn, 'Clipboard blocked');
    }
  }
});

$('#home').addEventListener('click', (e) => {
  e.preventDefault();
  surface();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !el.follow.open && sheetOpen()) go(null);
});

window.addEventListener('resize', () => map.setPadding(padding()));
wide.addEventListener('change', () => {
  map.setPadding(padding());
  map.resize();
});

const router = createRouter(CITY_ORDER, applyRoute);
router.start();

// Debug handle for the screenshot harness.
(window as unknown as Record<string, unknown>).__cheque = { state, go, dive, surface };
