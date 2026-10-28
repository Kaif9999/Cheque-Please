import { Marker, type FillLayerSpecification, type GeoJSONSource, type Map as MapLibre } from 'maplibre-gl';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { areasOf } from '@/domain/areas';
import type { Cafe, Outline } from '@/domain/types';
import { ZONES } from '@/domain/zones';
import { mount } from '@/lib/html';
import { zonePill } from '@/ui/components/zone';

type AreaShape = Feature<Polygon | MultiPolygon, { color: string }>;

/** Area labels only make sense once neighbourhoods are distinguishable; phones need to be closer still. */
const LABEL_ZOOM = { wide: 12, narrow: 12.8 };

/**
 * Each neighbourhood as a tinted block with a coloured edge and its name on top. The tint and edge
 * sit under the roads, so the streets run through each block like a grid, and under a copy of the
 * water, so a block drawn past the shore stops at it. Call `install` once the style has loaded,
 * then `draw` whenever the cafés change.
 */
export function createZonesLayer(map: MapLibre, isWide: () => boolean) {
  let labels: Marker[] = [];
  const container = map.getContainer();

  function syncLabels(): void {
    container.classList.toggle('show-zone-labels', map.getZoom() >= (isWide() ? LABEL_ZOOM.wide : LABEL_ZOOM.narrow));
  }

  return {
    install(): void {
      map.addSource('areas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      // Strongest when the whole city is in view, fading as the streets take over.
      map.addLayer(
        {
          id: 'areas-fill',
          type: 'fill',
          source: 'areas',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.42, 12, 0.3, 15, 0.2, 17, 0.12],
          },
        },
        'rail',
      );
      map.addLayer(
        {
          id: 'areas-line',
          type: 'line',
          source: 'areas',
          layout: { 'line-join': 'round' },
          paint: {
            'line-color': ['get', 'color'],
            'line-opacity': 0.8,
            'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 14, 2.4],
          },
        },
        'rail',
      );
      const water = map.getStyle().layers.find((l) => l.id === 'water') as FillLayerSpecification | undefined;
      if (water) map.addLayer({ ...water, id: 'areas-water' }, 'rail');
      map.on('zoom', syncLabels);
      syncLabels();
    },

    draw(cafes: Cafe[], outlines: Record<string, Outline>): void {
      for (const m of labels) m.remove();
      const areas = areasOf(cafes, outlines);
      const shapes: AreaShape[] = areas.map((a) => ({
        type: 'Feature',
        geometry: a.outline,
        properties: { color: ZONES[a.zone].color },
      }));
      (map.getSource('areas') as GeoJSONSource).setData({ type: 'FeatureCollection', features: shapes });
      labels = areas.map((a) => {
        const el = document.createElement('div');
        el.className = 'pointer-events-none z-0';
        mount(el, zonePill(a.zone, a.area));
        return new Marker({ element: el, anchor: 'center' }).setLngLat(a.top).addTo(map);
      });
    },
  };
}
