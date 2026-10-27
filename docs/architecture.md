# Architecture

A static, single-page TypeScript app. There is no framework: views are functions that return
escaped HTML, and a small store tells them when to redraw.

## Layout

```
src/
  main.ts      the bootstrap: wires the store, router, views and map, and handles events
  app/         router.ts (hash routing), store.ts (observable store), state.ts (app state and selectors)
  domain/      types and pure logic: zones, areas, geometry, people, routes. No DOM, no map.
  data/        cities.ts (city definitions) and one JSON file of cafés per city
  lib/         html.ts (safe templates), dom.ts, icons.ts, links.ts, text.ts
  map/         MapLibre: index.ts (the map), markers.ts (pins and clusters), zones-layer.ts, style.ts
  ui/
    components/  avatar, logo, button, post, zone marks, the panel's top bar
    views/       hero (the cover), legend, topbar (shortcuts and city switch), list, detail, follow
  styles.css   Tailwind, the design tokens and the few rules that style MapLibre's own controls
tests/         mirrors src/
tools/         Node scripts: smoke test, screenshots, preview image, discovery and verification
```

Dependencies point one way. `domain` uses nothing outside itself. `ui` and `map` use `domain` and
`lib`. `app` and `main.ts` use everything. Imports use the `@/` alias for `src/`.

## How a click becomes a redraw

The address bar is the source of truth for the city and what the side panel shows.

```
#/<city>                  the city (the cover, or the open map)
#/<city>/list             the café list in the side panel
#/<city>/<café-slug>      one café in the side panel
```

1. **Router** (`app/router.ts`). It parses the hash with `domain/routes.ts`, which `routeHref`
   inverts, so every link in the views is built the same way. It hands the parsed route to
   `applyRoute` in `main.ts`.
2. **Store** (`app/store.ts`). `applyRoute` and the other actions (`dive`, `surface`, `setFilter`)
   merge changes into one state object: `{ city, filter, selected, list, mode }`. `mode` is
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
