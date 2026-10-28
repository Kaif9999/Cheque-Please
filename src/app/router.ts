import { parseRoute, routeHref, type Panel, type Route } from '@/domain/routes';
import type { CityId } from '@/domain/types';

export interface Router {
  /** Applies the current address, then follows every change to it. */
  start(): void;
  /** Moves to a city and panel. Going to the address already showing re-applies it. */
  go(city: CityId, panel: Panel): void;
}

/** Path routing: the address is the source of truth for the city and what the panel shows. */
export function createRouter(cities: readonly CityId[], apply: (route: Route) => void): Router {
  const read = () => apply(parseRoute(window.location.pathname, cities));
  const go = (city: CityId, panel: Panel) => {
    const next = routeHref(city, panel);
    if (window.location.pathname !== next) window.history.pushState(null, '', next);
    read();
  };

  /** Plain clicks on links to a route stay in the page; new tabs and other sites are left to the browser. */
  const follow = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!a || a.target || a.origin !== window.location.origin) return;
    const route = parseRoute(a.pathname, cities);
    if (!route.city) return;
    e.preventDefault();
    go(route.city, route.panel);
  };

  return {
    start() {
      // Links shared before paths, like /#/mumbai/subko-bandra, move to their path.
      const legacy = parseRoute(window.location.hash, cities);
      if (legacy.city) window.history.replaceState(null, '', routeHref(legacy.city, legacy.panel));
      window.addEventListener('popstate', read);
      document.addEventListener('click', follow);
      read();
    },
    go,
  };
}
