import './styles.css';
import { CITIES, CITY_ORDER } from '@/data/cities';
import { handlesText } from '@/domain/people';
import type { Cafe, CityId, ZoneId } from '@/domain/types';
import { zoneOf } from '@/domain/zones';
import { $ } from '@/lib/dom';
import { html, mount } from '@/lib/html';
import { icon } from '@/lib/icons';
import { createMap } from '@/map';
import { renderDetail } from '@/ui/views/detail';
import { renderFollow } from '@/ui/views/follow';
import { renderList } from '@/ui/views/list';

interface State {
  city: CityId;
  filter: ZoneId | null;
  selected: string | null;
}

const state: State = { city: 'bengaluru', filter: null, selected: null };
const wide = window.matchMedia('(min-width: 1024px)');
const panel = $('#panel-body');
const follow = $<HTMLDialogElement>('#follow');
/** Where the list was scrolled to, so "back" returns to the same spot. */
let listScroll = 0;

const city = () => CITIES[state.city];
const visible = () => city().cafes.filter((c) => !state.filter || zoneOf(c) === state.filter);
const selectedCafe = (): Cafe | undefined => city().cafes.find((c) => c.slug === state.selected);

const map = createMap($('#map'), city(), {
  pick: (slug) => go(slug),
  hover: (slug) => {
    for (const row of panel.querySelectorAll<HTMLElement>('[data-slug]')) row.classList.toggle('is-hover', row.dataset.slug === slug);
  },
  tilesFailing: () => ($('#banner').hidden = false),
}, () => wide.matches);

function padding() {
  return wide.matches ? { top: 72, bottom: 72, left: 72, right: 72 } : { top: 48, bottom: 36, left: 36, right: 36 };
}

function render(): void {
  const c = city();
  const cafe = selectedCafe();
  document.title = cafe ? `${cafe.name}, ${cafe.area} · Coffee with VCs` : `${c.name} · Coffee with VCs`;
  for (const opt of document.querySelectorAll<HTMLAnchorElement>('.seg-opt')) {
    opt.setAttribute('aria-current', String(opt.dataset.city === c.id));
  }
  mount(panel, cafe ? renderDetail(c, cafe) : renderList(c, state.filter));
  panel.scrollTop = cafe ? 0 : listScroll;
}

/** Routes: #/<city> and #/<city>/<café-slug>. */
function go(slug: string | null): void {
  const next = `#/${state.city}${slug ? `/${slug}` : ''}`;
  if (location.hash === next) readHash();
  else location.hash = next;
}

function readHash(): void {
  const [cityId, slug] = location.hash.replace(/^#\/?/, '').split('/');
  const nextCity = CITY_ORDER.includes(cityId as CityId) ? (cityId as CityId) : state.city;
  const cityChanged = nextCity !== state.city || !panel.hasChildNodes();
  if (!state.selected) listScroll = panel.scrollTop;
  if (cityChanged) {
    state.city = nextCity;
    state.filter = null;
    listScroll = 0;
  }
  const cafe = slug ? CITIES[nextCity].cafes.find((c) => c.slug === slug) : undefined;
  if (cafe && state.filter && zoneOf(cafe) !== state.filter) state.filter = null;
  state.selected = cafe?.slug ?? null;
  map.setPadding(padding());
  if (cityChanged) map.show(city(), visible(), !cafe);
  render();
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
  const title = cafe ? `${cafe.name}, ${cafe.area}` : `Where ${city().name}'s VCs get coffee`;
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
  mount(follow, renderFollow(title, cafes, city().name));
  follow.dataset.slugs = cafes.map((c) => c.slug).join(' ');
  follow.showModal();
}

panel.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const chip = target.closest<HTMLButtonElement>('[data-filter]');
  if (chip) {
    state.filter = (chip.dataset.filter || null) as ZoneId | null;
    listScroll = 0;
    render();
    map.show(city(), visible(), true);
    return;
  }
  const shareBtn = target.closest<HTMLElement>('[data-share]');
  if (shareBtn) share(shareBtn);
  if (target.closest('[data-follow-all]')) openFollow(city().cafes, `Follow all ${city().name} investors`);
  const cafe = selectedCafe();
  if (cafe && target.closest('[data-follow-cafe]')) openFollow([cafe], `Seen at ${cafe.name}`);
});

panel.addEventListener('pointerover', (e) => {
  const row = (e.target as HTMLElement).closest<HTMLElement>('a[data-slug]');
  map.highlight(row?.dataset.slug ?? null);
});
panel.addEventListener('pointerleave', () => map.highlight(null));

follow.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  if (target === follow || target.closest('[data-close]')) follow.close();
  const copyBtn = target.closest<HTMLElement>('[data-copy]');
  if (copyBtn) {
    const slugs = (follow.dataset.slugs ?? '').split(' ');
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
  state.filter = null;
  listScroll = 0;
  go(null);
  map.show(city(), visible(), true);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !follow.open && state.selected) go(null);
});

window.addEventListener('hashchange', readHash);
wide.addEventListener('change', () => {
  map.setPadding(padding());
  map.resize();
});

readHash();

// Debug handle for the screenshot harness.
(window as unknown as Record<string, unknown>).__coffee = { state, go };
