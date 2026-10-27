import { LngLatBounds, Map as MapLibre, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapGeoJSONFeature, type PaddingOptions } from 'maplibre-gl';
import type { Feature, Point } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { distance, type LngLat } from '@/domain/geo';
import type { Cafe, City } from '@/domain/types';
import { clusterElement, fillCluster, paintMarker, pinElement } from './markers';
import { mapStyle } from './style';
import { createZonesLayer } from './zones-layer';

setWorkerUrl(workerUrl);

type CafePoint = Feature<Point, { slug: string }>;

/** Clusters stop at this zoom; focusing a crowded café goes one step past it so its own pin shows. */
const CLUSTER_MAX_ZOOM = 16;
/** Cafés closer than this to a neighbour stay clustered until CLUSTER_MAX_ZOOM. */
const CROWDED_METRES = 250;

export interface CafeMap {
  /** Swap the pins; fits the camera to them unless `fit` is false. */
  show(city: City, cafes: Cafe[], fit: boolean): void;
  select(slug: string | null): void;
  /** Mirrors hover from the list onto the matching pin. */
  highlight(slug: string | null): void;
  focus(cafe: Cafe): void;
  fit(): void;
  resize(): void;
  setPadding(padding: PaddingOptions): void;
}

export interface MapHooks {
  pick(slug: string): void;
  hover(slug: string | null): void;
  /** The person dragged, scrolled or pinched the map themselves. */
  userMove(): void;
  tilesFailing(): void;
}

export function createMap(container: HTMLElement, city: City, hooks: MapHooks, isWide: () => boolean): CafeMap {
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

  const zones = createZonesLayer(map, isWide);
  let cafes: Cafe[] = [];
  let selected: string | null = null;
  let hovered: string | null = null;
  let padding: PaddingOptions = { top: 40, right: 40, bottom: 40, left: 40 };
  let cache = new Map<string, Marker>();
  let onScreen = new Map<string, Marker>();
  let tileErrors = 0;
  const ready = new Promise<void>((resolve) => map.on('load', () => resolve()));

  ready.then(() => {
    zones.install();
    map.addSource('cafes', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      // Pins carry the café name, so neighbours merge early rather than overlap.
      clusterRadius: isWide() ? 64 : 72,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
    });
    // Markers are HTML; this invisible layer just keeps the clustered source's tiles loaded.
    map.addLayer({ id: 'cafes-anchor', type: 'circle', source: 'cafes', paint: { 'circle-radius': 0, 'circle-opacity': 0 } });
    map.on('render', syncMarkers);
    // Start the credits folded; expanded they cover the corner of a small map.
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
    if ((e as { sourceId?: string }).sourceId === 'omt' && ++tileErrors === 4) hooks.tilesFailing();
  });

  const source = () => map.getSource('cafes') as GeoJSONSource;
  const repaint = () => {
    for (const m of onScreen.values()) paintMarker(m.getElement(), selected, hovered);
  };

  function pin(cafe: Cafe): HTMLElement {
    const el = pinElement(cafe);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      hooks.pick(cafe.slug);
    });
    el.addEventListener('mouseenter', () => hooks.hover(cafe.slug));
    el.addEventListener('mouseleave', () => hooks.hover(null));
    return el;
  }

  function cluster(id: number, count: number, coords: LngLat): HTMLElement {
    const el = clusterElement(count);
    source()
      .getClusterLeaves(id, 200, 0)
      .then((leaves) => {
        fillCluster(
          el,
          leaves.map((l) => cafes.find((c) => c.slug === l.properties?.slug)).filter((c): c is Cafe => !!c),
        );
        paintMarker(el, selected, hovered);
      });
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      hooks.userMove();
      const zoom = await source().getClusterExpansionZoom(id);
      map.easeTo({ center: coords, zoom: Math.min(zoom + 0.6, 18), padding, duration: 650 });
    });
    return el;
  }

  /** Keeps one HTML marker per visible pin or cluster, reusing them between frames. */
  function syncMarkers(): void {
    if (!map.isSourceLoaded('cafes')) return;
    const next = new Map<string, Marker>();
    for (const f of map.querySourceFeatures('cafes') as MapGeoJSONFeature[]) {
      const coords = (f.geometry as Point).coordinates as LngLat;
      const p = f.properties;
      const key = p.cluster ? `cluster:${p.cluster_id}` : String(p.slug);
      if (next.has(key)) continue;
      let marker = cache.get(key);
      if (!marker) {
        const cafe = p.cluster ? null : cafes.find((c) => c.slug === p.slug);
        if (!p.cluster && !cafe) continue;
        const el = cafe ? pin(cafe) : cluster(p.cluster_id, p.point_count, coords);
        marker = new Marker({ element: el, anchor: 'center' }).setLngLat(coords);
        cache.set(key, marker);
      }
      paintMarker(marker.getElement(), selected, hovered);
      next.set(key, marker);
      if (!onScreen.has(key)) marker.addTo(map);
    }
    for (const [key, marker] of onScreen) if (!next.has(key)) marker.remove();
    onScreen = next;
  }

  /** The first framing is instant; later ones glide. */
  let framed = false;
  function fitTo(list: Cafe[]): void {
    const [only] = list;
    if (!only) return;
    const duration = framed ? 900 : 0;
    framed = true;
    if (list.length === 1) {
      map.easeTo({ center: [only.lon, only.lat], zoom: 15, padding, duration });
      return;
    }
    const bounds = new LngLatBounds();
    for (const c of list) bounds.extend([c.lon, c.lat]);
    map.fitBounds(bounds, { padding, maxZoom: 15, duration });
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
          properties: { slug: cafe.slug },
        }));
        source().setData({ type: 'FeatureCollection', features });
        zones.draw(list);
        if (!doFit) return;
        if (list.length) fitTo(list);
        else map.jumpTo({ center: c.center, zoom: c.zoom });
      });
    },
    select(slug) {
      selected = slug;
      repaint();
    },
    highlight(slug) {
      hovered = slug;
      repaint();
    },
    focus(cafe) {
      const crowded = cafes.some((c) => c !== cafe && distance([c.lon, c.lat], [cafe.lon, cafe.lat]) < CROWDED_METRES);
      const zoom = Math.max(map.getZoom(), crowded ? CLUSTER_MAX_ZOOM + 1 : 15.5);
      map.easeTo({ center: [cafe.lon, cafe.lat], zoom, padding, duration: 800 });
    },
    fit() {
      ready.then(() => fitTo(cafes));
    },
    resize() {
      map.resize();
    },
    setPadding(p) {
      padding = p;
    },
  };
}
