# Architecture

A static, single-page TypeScript app. There is no framework: views are functions that return
escaped HTML, and a small store tells them when to redraw.

## Layout

```
src/
  main.ts      the bootstrap: wires the store, router, views and map, and handles events
  app/         router.ts (path routing), store.ts (observable store), state.ts (app state and selectors)
  domain/      types and pure logic: zones, areas, geometry, people, routes. No DOM, no map.
  data/        cities.ts (city definitions) and one JSON file of cafés per city
  lib/         html.ts (safe templates), dom.ts, icons.ts, links.ts, text.ts
  map/         MapLibre: index.ts (the map), markers.ts (pins and clusters), zones-layer.ts, style.ts
  seo/         pages.ts (every address, its title, description and breadcrumbs), schema.ts (JSON-LD),
               prerender.ts (each page's head and first render, the sitemap and robots.txt)
  ui/
    components/  avatar, logo, button, post, zone marks, the panel's top bar
    views/       hero (the cover), legend, topbar (shortcuts and city switch), list, detail, follow
  styles.css   Tailwind, the design tokens and the few rules that style MapLibre's own controls
tests/         mirrors src/
tools/         Node scripts: smoke test, screenshots, preview image, discovery and verification
```

Dependencies point one way. `domain` uses nothing outside itself. `ui` and `map` use `domain` and
`lib`. `seo` uses those and the views, never the DOM. `app` and `main.ts` use everything. Imports use the `@/` alias for `src/`.

## How a click becomes a redraw

The address bar is the source of truth for the city and what the side panel shows.

```
/<city>/                     the city (the cover, or the open map)
/<city>/list/                the café list in the side panel
/<city>/area/<area-slug>/    one neighbourhood's cafés in the side panel
/<city>/<café-slug>/         one café in the side panel
```

Links shared before paths (`/#/<city>/<café-slug>`) are moved to their path on load.

1. **Router** (`app/router.ts`). It parses the path with `domain/routes.ts`, which `routeHref`
   inverts, so every link in the views is built the same way. Plain clicks on those links stay in
   the page through the History API; back and forward replay them. It hands the parsed route to
   `applyRoute` in `main.ts`.
2. **Store** (`app/store.ts`). `applyRoute` and the other actions (`dive`, `surface`, `setFilter`)
   merge changes into one state object: `{ city, filter, selected, list, area, mode }`. `mode` is
   `'intro'` while the cover is up and `'map'` once the person starts exploring.
3. **Subscribers** in `main.ts` redraw from the state, in order:
   - the chrome: the body's `data-mode` and `data-sheet`, the title, the city switch, the cover,
     the legend and the shortcuts;
   - the side panel, only when the city, filter or panel changed;
   - the map's padding and selected pin.
4. **Camera moves** stay in the actions, because they depend on why the state changed. A new city
   reframes the map, and opening a café focuses it. A drag that clears the cover leaves the camera
   where the person put it.

Page-level states are data attributes on `<body>`. Tailwind's `group-data-[mode=map]/app:` and
`group-data-[sheet=open]/app:` variants style the cover, legend and panel transitions from them.

## Pages for search engines

The app is one page, but every address in it is also built as a file: `/`, each city, its list,
each neighbourhood with two or more cafés, and each café (`npm run build` runs
`tools/prerender.mjs` after Vite). The tool loads `seo/prerender.ts` through Vite, so the views and
data are the app's own, and fills the built `index.html` once per page:

- the title, description, canonical link, Open Graph and X card tags, and a JSON-LD graph (the
  site, the page, the cafés it lists or the café it describes, and its breadcrumbs);
- the first render of each region (cover, city switch, legend, shortcuts and panel), with
  `data-mode` and `data-sheet` set to match, so the page reads the same before the script runs.

The app then takes over and redraws the same markup. It sets the title from `seo/pages.ts` too, so
the title stays the same after it does. The list pages point their canonical link at their city.
`sitemap.xml` dates each page by its newest post; `404.html` is the app with `noindex`.

## Safe markup

Views return `Html` built with the `html` tag from `lib/html.ts`:

- every interpolated value is escaped unless it is already `Html`;
- lists are joined, and `null`, `undefined` and `false` render nothing;
- `true` is a type error, so `aria-pressed="${on}"` has to be written `String(on)`;
- `raw()` is for constants such as icon paths, never data;
- `mount(el, html)` is the only place markup reaches the page.

## The map

- **Pins and clusters** are HTML markers synced to a clustered GeoJSON source on every render
  (`map/index.ts`). Markers are cached by key and reused between frames. Selected and hovered
  states are classes on the marker (`is-selected`, `is-hover`) that the pill styles itself from.
- **Zones** (`map/zones-layer.ts`) are rounded hulls around each neighbourhood's cafés
  (`domain/areas.ts` and `domain/geo.ts`). They are coloured by the neighbourhood's main investor
  type, and their name labels appear once the map is zoomed in far enough.
- **Padding.** The cover, top bar, legend and side panel cover parts of the map. `main.ts`
  measures them and passes the result to the map as padding, so pins land in the visible part.
  When the padding would leave less than 120 px, the map shrinks it rather than refusing to move.
  This happens on short screens, where the cover alone is taller than the map.
- MapLibre's worker is loaded with `setWorkerUrl` and Vite's `?url` import. MapLibre's own CSS is
  unlayered and beats Tailwind's layered utilities, so `#map` is sized with `fixed!`.

## Styling

Tokens live in the `@theme` block of `src/styles.css`: colours, fonts, shadows, easing and the
`rise` animation. Everything else is Tailwind utilities in the markup. Class strings shared
between views are in `ui/classes.ts` and `ui/components/button.ts`, kept whole so Tailwind's
scanner finds them.

Buttons, chips, pins and the city switch share a raised style. It combines a light-to-paper
gradient, a lit top edge, a darker lip and a soft drop (`shadow-raised`, or `shadow-raised-ink`
for dark buttons). Controls lift a pixel on hover and sink when pressed (`shadow-pressed`).

## Tests

- **Unit** (Vitest, `npm test`): domain logic, routes, the store, HTML escaping, every city's data,
  and the views rendered into a DOM (happy-dom).
- **Smoke** (`npm run smoke`): Playwright drives Chrome through the cover, map, clusters, panel,
  list, filters, follow dialog, city switch (including on a short screen) and the console.
- **CI** (`.github/workflows/ci.yml`): typecheck, lint, formatting, unit tests, build and the smoke
  test on every push to `main`. Smoke failures are reported as annotations on the run.
