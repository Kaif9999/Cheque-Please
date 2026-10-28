import './styles.css';
import type { PaddingOptions } from 'maplibre-gl';
import { createRouter } from '@/app/router';
import { cityOf, initialState, selectedCafe, sheetOpen, visibleCafes, type AppState } from '@/app/state';
import { createStore } from '@/app/store';
import { CITIES, CITY_ORDER } from '@/data/cities';
import { handlesText } from '@/domain/people';
import type { Panel, Route } from '@/domain/routes';
import type { Cafe, CityId, ZoneId } from '@/domain/types';
import { zoneOf } from '@/domain/zones';
import { $ } from '@/lib/dom';
import { mount } from '@/lib/html';
import { createMap } from '@/map';
import { confirm } from '@/ui/confirm';
import { renderDetail } from '@/ui/views/detail';
import { renderFollow } from '@/ui/views/follow';
import { renderHero } from '@/ui/views/hero';
import { renderLegend } from '@/ui/views/legend';
import { renderList } from '@/ui/views/list';
import { renderCitySwitch, renderListPill, renderTopActions } from '@/ui/views/topbar';

const store = createStore(initialState);
const router = createRouter(CITY_ORDER, applyRoute);
const wide = window.matchMedia('(min-width: 1024px)');
const el = {
  topbar: $('#topbar'),
  topActions: $('#top-actions'),
  citySwitch: $('#city-switch'),
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

const map = createMap(
  $('#map'),
  cityOf(store.get()),
  {
    pick: (slug) => go({ kind: 'cafe', slug }),
    hover: (slug) => {
      for (const row of el.sheetBody.querySelectorAll<HTMLElement>('[data-slug]'))
        row.classList.toggle('is-hover', row.dataset.slug === slug);
    },
    userMove: () => dive(false),
    tilesFailing: () => ($('#banner').hidden = false),
  },
  () => wide.matches,
);

/** Keeps pins clear of whatever covers the map: the cover, the top bar, the legend and the panel. */
function padding(s: AppState): PaddingOptions {
  const below = (node: HTMLElement) => node.getBoundingClientRect().bottom;
  if (wide.matches) {
    // Pins are labelled pills centred on the café, so the sides need room for half a label.
    // On the cover, pins start past the gradient, but always keep at least 40% of the width for them.
    const left = s.mode === 'intro' ? Math.min(el.heroBody.getBoundingClientRect().right + 200, window.innerWidth * 0.6) : 120;
    const right = sheetOpen(s) ? el.sheet.offsetWidth + 20 + 100 : 120;
    return { top: below(el.topbar) + 72, bottom: 64, left, right };
  }
  const top = (s.mode === 'intro' ? below(el.heroBody) : below(el.legend)) + 36;
  const bottom = sheetOpen(s) ? el.sheet.offsetHeight + 28 : 96;
  return { top, bottom, left: 72, right: 72 };
}

/* Rendering. Each subscriber redraws its part of the page from the state; actions below only change state and move the camera. */

/** Everything outside the panel: page state, title, city switch, cover, legend and shortcuts. */
store.subscribe((s) => {
  const city = cityOf(s);
  const cafe = selectedCafe(s);
  document.body.dataset.mode = s.mode;
  document.body.dataset.sheet = sheetOpen(s) ? 'open' : 'closed';
  document.title = cafe ? `${cafe.name}, ${cafe.area} · VC Spotted` : `VC Spotted · ${city.name}`;
  mount(
    el.citySwitch,
    renderCitySwitch(
      CITY_ORDER.map((id) => CITIES[id]),
      city.id,
    ),
  );
  mount(el.heroBody, renderHero(city));
  mount(el.legend, renderLegend(city.cafes, s.filter));
  mount(el.topActions, renderTopActions(city));
  mount(el.listPill, renderListPill(city));
});

/** The panel keeps its last contents while closed, so it doesn't empty out as it slides away. */
store.subscribe((s, prev) => {
  if (s.city === prev.city && s.filter === prev.filter && s.selected === prev.selected && s.list === prev.list) return;
  const cafe = selectedCafe(s);
  if (cafe) {
    mount(el.sheetBody, renderDetail(cityOf(s), cafe));
    el.sheetBody.scrollTop = 0;
  } else if (s.list) {
    mount(el.sheetBody, renderList(cityOf(s), s.filter));
    el.sheetBody.scrollTop = listScroll;
  }
});

/** The map's framing follows the layout, and its selected pin follows the state. */
store.subscribe((s) => {
  map.setPadding(padding(s));
  map.select(s.selected);
});

/* Actions. */

/** Opens a panel (or closes it, with null) in the current city. */
function go(panel: Panel): void {
  router.go(store.get().city, panel);
}

/** Clears the cover. `fit` reframes the map now that the whole of it is free. */
function dive(fit: boolean): void {
  if (store.get().mode === 'map') return;
  store.set({ mode: 'map' });
  if (fit) map.fit();
}

/** Back to the cover for the current city. */
function surface(): void {
  listScroll = 0;
  store.set({ mode: 'intro', filter: null, selected: null, list: false });
  const s = store.get();
  map.show(cityOf(s), visibleCafes(s), true);
  go(null);
}

function setFilter(zone: ZoneId | null): void {
  const s = store.get();
  const filter = s.filter === zone ? null : zone;
  // A café the filter hides can't stay open.
  const hidden = !!s.selected && !CITIES[s.city].cafes.some((c) => c.slug === s.selected && (!filter || zoneOf(c) === filter));
  listScroll = 0;
  store.set({ filter, mode: 'map', selected: hidden ? null : s.selected });
  const next = store.get();
  map.show(cityOf(next), visibleCafes(next), true);
  if (hidden) go(null);
}

function applyRoute(route: Route): void {
  const s = store.get();
  const city = route.city ?? s.city;
  const cityChanged = city !== s.city || !el.heroBody.hasChildNodes();
  if (s.list && !s.selected) listScroll = el.sheetBody.scrollTop;
  if (cityChanged) listScroll = 0;
  const filter = cityChanged ? null : s.filter;
  const slug = route.panel?.kind === 'cafe' ? route.panel.slug : null;
  const cafe = slug ? CITIES[city].cafes.find((c) => c.slug === slug) : undefined;
  const list = route.panel?.kind === 'list';
  store.set({
    city,
    filter: cafe && filter && zoneOf(cafe) !== filter ? null : filter,
    selected: cafe?.slug ?? null,
    list,
    mode: cafe || list ? 'map' : s.mode,
  });
  const next = store.get();
  if (cityChanged) map.show(cityOf(next), visibleCafes(next), !cafe);
  // On phones the sheet leaves too little map to refit into; the pins stay where they were.
  else if (list && !sheetOpen(s) && wide.matches) map.fit();
  if (cafe) map.focus(cafe);
}

async function share(button: HTMLElement): Promise<void> {
  const s = store.get();
  const cafe = selectedCafe(s);
  const title = cafe ? `${cafe.name}, ${cafe.area}` : cityOf(s).headline;
  if (navigator.share && !wide.matches) {
    try {
      await navigator.share({ title, url: window.location.href });
      return;
    } catch {
      // Dismissed or unsupported; fall through to copying the link.
    }
  }
  try {
    await navigator.clipboard.writeText(window.location.href);
    confirm(button, 'Link copied');
  } catch {
    confirm(button, 'Copy the address bar');
  }
}

function openFollow(cafes: Cafe[], title: string): void {
  mount(el.follow, renderFollow(title, cafes, cityOf(store.get()).name));
  el.follow.dataset.slugs = cafes.map((c) => c.slug).join(' ');
  el.follow.showModal();
}

/* Events. */

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
  const city = cityOf(store.get());
  if (target.closest('[data-follow-all]')) return openFollow(city.cafes, `Follow all ${city.name} investors`);
  const cafe = selectedCafe(store.get());
  if (cafe && target.closest('[data-follow-cafe]')) openFollow([cafe], `Seen at ${cafe.name}`);
});

document.addEventListener('change', (e) => {
  const select = (e.target as HTMLElement).closest<HTMLSelectElement>('#city-select');
  if (select) router.go(select.value as CityId, null);
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
      await navigator.clipboard.writeText(handlesText(cityOf(store.get()).cafes.filter((c) => slugs.includes(c.slug))));
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
  if (e.key === 'Escape' && !el.follow.open && sheetOpen(store.get())) go(null);
});

window.addEventListener('resize', () => map.setPadding(padding(store.get())));
wide.addEventListener('change', () => {
  map.setPadding(padding(store.get()));
  map.resize();
});

router.start();

// Debug handle for the screenshot harness.
(window as unknown as Record<string, unknown>).__cheque = { store, go, dive, surface };
