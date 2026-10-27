import { Marker, type GeoJSONSource, type Map as MapLibre } from 'maplibre-gl';
import type { Feature, Polygon } from 'geojson';
import { areasOf } from '@/domain/areas';
import type { Cafe } from '@/domain/types';
import { ZONES } from '@/domain/zones';
import { zonePill } from '@/ui/components/zone';

type AreaShape = Feature<Polygon, { color: string }>;

/** Area labels only make sense once neighbourhoods are distinguishable; phones need to be closer still. */
const LABEL_ZOOM = { wide: 12, narrow: 12.8 };

/**
 * Tinted outlines around each neighbourhood's cafés, with the area's name on top.
 * Call `install` once the style has loaded, then `draw` whenever the cafés change.
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
      map.addLayer(
        {
          id: 'areas-fill',
          type: 'fill',
          source: 'areas',
          // Fade the tint as you zoom in, or a whole street view turns one colour.
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.15, 14, 0.07, 16, 0.02] },
        },
        'road-label',
      );
      map.addLayer(
        {
          id: 'areas-line',
          type: 'line',
          source: 'areas',
          layout: { 'line-join': 'round' },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 2],
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.85, 16, 0.4],
          },
        },
        'road-label',
      );
      map.on('zoom', syncLabels);
      syncLabels();
    },

    draw(cafes: Cafe[]): void {
      for (const m of labels) m.remove();
      const areas = areasOf(cafes);
      const shapes: AreaShape[] = areas.map((a) => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [a.shape] },
        properties: { color: ZONES[a.zone].color },
      }));
      (map.getSource('areas') as GeoJSONSource).setData({ type: 'FeatureCollection', features: shapes });
      labels = areas.map((a) => {
        const el = document.createElement('div');
        el.className = 'pointer-events-none z-0';
        el.innerHTML = zonePill(a.zone, a.area);
        return new Marker({ element: el, anchor: 'center' }).setLngLat(a.top).addTo(map);
      });
    },
  };
}
