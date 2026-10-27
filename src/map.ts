import {
  LngLatBounds,
  Map as MapLibre,
  Marker,
  NavigationControl,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  setWorkerUrl,
  type PaddingOptions,
} from 'maplibre-gl';
import type { Feature, Point, Polygon } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { mapStyle } from './map-style';
import { areasOf, circle, distance } from './data/areas';
import type { Cafe, City } from './data/types';
import { receiptsOf, ZONES, zoneOf } from './data/zones';
import { cafeCard, clusterCard, zonePill } from './ui/markers';

setWorkerUrl(workerUrl);

type CafePoint = Feature<Point, { slug: string; receipts: number; zone: string }>;
type AreaShape = Feature<Polygon, { color: string }>;

/** Clusters stop at this zoom; focusing a café goes one step past it so its own card shows. */
const CLUSTER_MAX_ZOOM = 16;
/** Zone pills only make sense once neighbourhoods are distinguishable; phones need to be closer still. */
const ZONE_LABEL_ZOOM = 12.6;
const ZONE_LABEL_ZOOM_PHONE = 13.4;

export interface CafeMap {
  /** Swap the pins; fits the camera to them unless `fit` is false. */
  show(city: City, cafes: Cafe[], fit: boolean): void;
  select(slug: string | null): void;
  focus(cafe: Cafe): void;
  fit(): void;
  setPadding(padding: PaddingOptions): void;
}

export interface MapHooks {
  pick(slug: string): void;
  /** The person grabbed, scrolled or pinched the map. */
  userMove(): void;
  tilesFailing(): void;
}

export function createMap(container: HTMLElement, city: City, hooks: MapHooks): CafeMap {
  const map = new MapLibre({
    container,
    style: mapStyle,
    center: city.center,
    zoom: city.zoom,
    maxZoom: 18.5,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
    maxPitch: 0,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

  let cafes: Cafe[] = [];
  let selected: string | null = null;
  let padding: PaddingOptions = { top: 40, right: 40, bottom: 40, left: 40 };
  let cache = new Map<string, Marker>();
  let onScreen = new Map<string, Marker>();
  let zoneLabels: Marker[] = [];
  let tileErrors = 0;
  const ready = new Promise<void>((resolve) => map.on('load', () => resolve()));

  ready.then(() => {
    map.addSource('areas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer(
      { id: 'areas-fill', type: 'fill', source: 'areas', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 } },
      'road-label',
    );
    map.addLayer(
      {
        id: 'areas-line',
        type: 'line',
        source: 'areas',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.6,
          'line-dasharray': [2, 1.6],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.25, 13, 0.75],
        },
      },
      'road-label',
    );
    map.addSource('cafes', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      // Cards are wide; phones get a bigger radius so neighbouring cards merge instead of overlapping.
      clusterRadius: window.matchMedia('(min-width: 900px)').matches ? 80 : 100,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterProperties: { receipts: ['+', ['get', 'receipts']] },
    });
    // Markers are HTML; this invisible layer just keeps the clustered source's tiles loaded.
    map.addLayer({ id: 'cafes-anchor', type: 'circle', source: 'cafes', paint: { 'circle-radius': 0, 'circle-opacity': 0 } });
    map.on('render', sync);
    map.on('zoom', zoneLabelVisibility);
    zoneLabelVisibility();
    // Start the credits folded; expanded they sit on top of the dive hint on phones.
    container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  });

  // Scroll zoom doesn't tag its zoomstart with the wheel event, so listen for the wheel itself.
  map.on('wheel', () => hooks.userMove());
  map.on('touchmove', () => hooks.userMove());
  for (const type of ['dragstart', 'zoomstart'] as const) {
    map.on(type, (e) => {
      if ('originalEvent' in e && e.originalEvent) hooks.userMove();
    });
  }
  map.on('error', (e) => {
    const sourceId = (e as { sourceId?: string }).sourceId;
    if (sourceId === 'omt' && ++tileErrors === 4) hooks.tilesFailing();
  });

  function zoneLabelVisibility(): void {
    const min = window.matchMedia('(min-width: 900px)').matches ? ZONE_LABEL_ZOOM : ZONE_LABEL_ZOOM_PHONE;
    container.classList.toggle('show-zone-labels', map.getZoom() >= min);
  }

  function cafeMarker(cafe: Cafe): HTMLElement {
    const zone = zoneOf(cafe);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `spot${zone === 'scene' ? ' spot--scene' : ''}`;
    el.style.setProperty('--zone', ZONES[zone].color);
    el.innerHTML = cafeCard(cafe);
    el.setAttribute('aria-label', `${cafe.name}, ${cafe.branch}: ${receiptsOf(cafe)} receipts. Open the bill.`);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      hooks.pick(cafe.slug);
    });
    return el;
  }

  function clusterMarker(id: number, count: number, coords: [number, number]): HTMLElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'stack';
    el.setAttribute('aria-label', `${count} cafés here. Zoom in.`);
    const source = map.getSource('cafes') as GeoJSONSource;
    source.getClusterLeaves(id, 200, 0).then((leaves) => {
      const list = leaves.map((l) => cafes.find((c) => c.slug === l.properties?.slug)).filter((c): c is Cafe => !!c);
      el.innerHTML = clusterCard(list);
      el.setAttribute('aria-label', `${list.length} cafés in ${list[0]?.area ?? 'this area'}. Zoom in.`);
    });
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const zoom = await source.getClusterExpansionZoom(id);
      map.easeTo({ center: coords, zoom: Math.min(zoom + 0.6, 18), padding, duration: 650 });
    });
    return el;
  }

  function sync(): void {
    if (!map.isSourceLoaded('cafes')) return;
    const next = new Map<string, Marker>();
    for (const f of map.querySourceFeatures('cafes') as MapGeoJSONFeature[]) {
      const coords = (f.geometry as Point).coordinates as [number, number];
      const p = f.properties;
      const key = p.cluster ? `cluster:${p.cluster_id}` : String(p.slug);
      if (next.has(key)) continue;
      let marker = cache.get(key);
      if (!marker) {
        const cafe = p.cluster ? null : cafes.find((c) => c.slug === p.slug);
        if (!p.cluster && !cafe) continue;
        const el = cafe ? cafeMarker(cafe) : clusterMarker(p.cluster_id, p.point_count, coords);
        marker = new Marker({ element: el, anchor: 'bottom' }).setLngLat(coords);
        cache.set(key, marker);
      }
      marker.getElement().classList.toggle('is-selected', key === selected);
      next.set(key, marker);
      if (!onScreen.has(key)) marker.addTo(map);
    }
    for (const [key, marker] of onScreen) if (!next.has(key)) marker.remove();
    onScreen = next;
  }

  function drawAreas(list: Cafe[]): void {
    for (const m of zoneLabels) m.remove();
    const areas = areasOf(list);
    const shapes: AreaShape[] = areas.map((a) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [circle(a.center, a.radius)] },
      properties: { color: ZONES[a.zone].color },
    }));
    (map.getSource('areas') as GeoJSONSource).setData({ type: 'FeatureCollection', features: shapes });
    zoneLabels = areas.map((a) => {
      const el = document.createElement('div');
      el.className = 'zone-label';
      el.innerHTML = zonePill(a.zone);
      // Sit the pill on the top edge of the neighbourhood circle.
      const top: [number, number] = [a.center[0], a.center[1] + (a.radius / 6371000) * (180 / Math.PI)];
      return new Marker({ element: el, anchor: 'center' }).setLngLat(top).addTo(map);
    });
  }

  function fitTo(list: Cafe[]): void {
    if (list.length === 0) return;
    if (list.length === 1) {
      map.easeTo({ center: [list[0].lon, list[0].lat], zoom: 15, padding, duration: 800 });
      return;
    }
    const bounds = new LngLatBounds();
    for (const c of list) bounds.extend([c.lon, c.lat]);
    map.fitBounds(bounds, { padding, maxZoom: 15, duration: 900 });
  }

  return {
    show(c, list, doFit) {
      cafes = list;
      ready.then(() => {
        for (const m of onScreen.values()) m.remove();
        onScreen = new Map();
        cache = new Map();
        const features: CafePoint[] = list.map((cafe) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [cafe.lon, cafe.lat] },
          properties: { slug: cafe.slug, receipts: receiptsOf(cafe), zone: zoneOf(cafe) },
        }));
        (map.getSource('cafes') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
        drawAreas(list);
        if (doFit) {
          if (list.length) fitTo(list);
          else map.jumpTo({ center: c.center, zoom: c.zoom });
        }
      });
    },
    select(slug) {
      selected = slug;
      for (const [key, m] of onScreen) m.getElement().classList.toggle('is-selected', key === slug);
    },
    focus(cafe) {
      // Close neighbours (12th Main has five cafés in 600 m) only separate past the cluster zoom.
      const crowded = cafes.some((c) => c !== cafe && distance([c.lon, c.lat], [cafe.lon, cafe.lat]) < 250);
      const zoom = Math.max(map.getZoom(), crowded ? CLUSTER_MAX_ZOOM + 1 : 15.5);
      map.easeTo({ center: [cafe.lon, cafe.lat], zoom, padding, duration: 800 });
    },
    fit() {
      ready.then(() => fitTo(cafes));
    },
    setPadding(p) {
      padding = p;
    },
  };
}
