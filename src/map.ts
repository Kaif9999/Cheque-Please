import {
  LngLatBounds,
  Map as MapLibre,
  Marker,
  NavigationControl,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type PaddingOptions,
} from 'maplibre-gl';
import type { Feature, Point } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapStyle } from './map-style';
import type { Cafe, City } from './data/types';
import { receiptsOf, ZONES, zoneOf } from './data/zones';

type CafePoint = Feature<Point, { slug: string; receipts: number; zone: string }>;

export interface CafeMap {
  /** Swap the pins; fits the camera to them unless `fit` is false. */
  show(city: City, cafes: Cafe[], fit: boolean): void;
  select(slug: string | null): void;
  focus(cafe: Cafe): void;
  setPadding(padding: PaddingOptions): void;
}

export function createMap(container: HTMLElement, city: City, onPick: (slug: string) => void): CafeMap {
  const map = new MapLibre({
    container,
    style: mapStyle,
    center: city.center,
    zoom: city.zoom,
    attributionControl: { compact: true, customAttribution: 'Tiles by <a href="https://openfreemap.org">OpenFreeMap</a>' },
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
  const ready = new Promise<void>((resolve) => map.on('load', () => resolve()));

  ready.then(() => {
    map.addSource('cafes', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterRadius: 46,
      clusterMaxZoom: 15,
      clusterProperties: { receipts: ['+', ['get', 'receipts']] },
    });
    // Clusters are drawn as HTML markers; this invisible layer just keeps the source's tiles loaded.
    map.addLayer({ id: 'cafes-anchor', type: 'circle', source: 'cafes', paint: { 'circle-radius': 0, 'circle-opacity': 0 } });
    map.on('render', sync);
  });

  function pinFor(cafe: Cafe): HTMLElement {
    const zone = zoneOf(cafe);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `pin${zone === 'scene' ? ' pin--scene' : ''}`;
    el.style.setProperty('--zone', ZONES[zone].color);
    // MapLibre positions the marker element with its own transform, so visuals live on an inner token.
    el.innerHTML = `<span class="pin-token">${receiptsOf(cafe)}</span>`;
    el.setAttribute('aria-label', `${cafe.name}, ${cafe.branch}: ${receiptsOf(cafe)} receipts`);
    el.dataset.slug = cafe.slug;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onPick(cafe.slug);
    });
    return el;
  }

  function clusterFor(id: number, count: number, receipts: number, coords: [number, number]): HTMLElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'cluster';
    el.innerHTML = `<span class="cluster-pill"><span class="cluster-stack" aria-hidden="true"><i></i><i></i><i></i></span><span class="cluster-count">${count} cafés</span><span class="cluster-receipts">${receipts}</span></span>`;
    el.setAttribute('aria-label', `${count} cafés, ${receipts} receipts. Zoom in.`);
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const zoom = await (map.getSource('cafes') as GeoJSONSource).getClusterExpansionZoom(id);
      map.easeTo({ center: coords, zoom: Math.min(zoom + 0.4, 17), padding, duration: 600 });
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
        const el = cafe ? pinFor(cafe) : clusterFor(p.cluster_id, p.point_count, p.receipts, coords);
        marker = new Marker({ element: el }).setLngLat(coords);
        cache.set(key, marker);
      }
      marker.getElement().classList.toggle('is-selected', key === selected);
      next.set(key, marker);
      if (!onScreen.has(key)) marker.addTo(map);
    }
    for (const [key, marker] of onScreen) if (!next.has(key)) marker.remove();
    onScreen = next;
  }

  function fit(list: Cafe[]): void {
    if (list.length === 0) return;
    if (list.length === 1) {
      map.easeTo({ center: [list[0].lon, list[0].lat], zoom: 14, padding, duration: 800 });
      return;
    }
    const bounds = new LngLatBounds();
    for (const c of list) bounds.extend([c.lon, c.lat]);
    map.fitBounds(bounds, { padding, maxZoom: 14.5, duration: 900 });
  }

  return {
    show(city, list, doFit) {
      cafes = list;
      ready.then(() => {
        for (const m of onScreen.values()) m.remove();
        onScreen = new Map();
        cache = new Map();
        const features: CafePoint[] = list.map((c) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
          properties: { slug: c.slug, receipts: receiptsOf(c), zone: zoneOf(c) },
        }));
        (map.getSource('cafes') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
        if (doFit) {
          if (list.length) fit(list);
          else map.jumpTo({ center: city.center, zoom: city.zoom });
        }
      });
    },
    select(slug) {
      selected = slug;
      for (const [key, m] of onScreen) m.getElement().classList.toggle('is-selected', key === slug);
    },
    focus(cafe) {
      map.easeTo({ center: [cafe.lon, cafe.lat], zoom: Math.max(map.getZoom(), 15.5), padding, duration: 800 });
    },
    setPadding(p) {
      padding = p;
    },
  };
}
