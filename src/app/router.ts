import { parseRoute, routeHref, type Panel, type Route } from '@/domain/routes';
import type { CityId } from '@/domain/types';

export interface Router {
  /** Applies the current address, then follows every change to it. */
  start(): void;
  /** Moves to a city and panel. Going to the address already showing re-applies it. */
  go(city: CityId, panel: Panel): void;
}

/** Hash routing: the address is the source of truth for the city and what the panel shows. */
export function createRouter(cities: readonly CityId[], apply: (route: Route) => void): Router {
  const read = () => apply(parseRoute(window.location.hash, cities));
  return {
    start() {
      window.addEventListener('hashchange', read);
      read();
    },
    go(city, panel) {
      const next = routeHref(city, panel);
      if (window.location.hash === next) read();
      else window.location.hash = next;
    },
  };
}
