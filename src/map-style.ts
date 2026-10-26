import type { StyleSpecification } from 'maplibre-gl';
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';

/** Cheque-paper basemap over OpenFreeMap's OpenMapTiles vector tiles. */
const C = {
  land: '#E6ECE6',
  green: '#D8E4D6',
  water: '#BFD3D9',
  waterLabel: '#6E8F99',
  road: '#FFFFFF',
  roadMinor: '#F6F8F5',
  building: '#DCE3DC',
  rail: '#CBD6CF',
  label: '#6B7480',
  halo: '#E6ECE6',
};

// Prefer English, then OpenMapTiles' transliteration — the bundled Noto glyphs don't cover Kannada or Devanagari.
const NAME: ExpressionSpecification = ['coalesce', ['get', 'name:en'], ['get', 'name:latin']];

const roadWidth = (base: number): ExpressionSpecification => [
  'interpolate', ['exponential', 1.6], ['zoom'],
  10, base * 0.35,
  13, base,
  16, base * 4,
  18, base * 9,
];

export const mapStyle: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
  },
  layers: [
    { id: 'land', type: 'background', paint: { 'background-color': C.land } },
    {
      id: 'green',
      type: 'fill',
      source: 'omt',
      'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'farmland']]],
      paint: { 'fill-color': C.green, 'fill-opacity': 0.7 },
    },
    {
      id: 'park',
      type: 'fill',
      source: 'omt',
      'source-layer': 'park',
      paint: { 'fill-color': C.green },
    },
    { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': C.water } },
    {
      id: 'waterway',
      type: 'line',
      source: 'omt',
      'source-layer': 'waterway',
      paint: { 'line-color': C.water, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 15, 2] },
    },
    {
      id: 'building',
      type: 'fill',
      source: 'omt',
      'source-layer': 'building',
      minzoom: 14,
      paint: { 'fill-color': C.building, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.5, 0.9] },
    },
    {
      id: 'rail',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      filter: ['==', ['get', 'class'], 'rail'],
      minzoom: 11,
      paint: { 'line-color': C.rail, 'line-width': 1.2, 'line-dasharray': [3, 2] },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'track']]],
      minzoom: 12,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': C.roadMinor, 'line-width': roadWidth(0.9) },
    },
    {
      id: 'road-mid',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': C.road, 'line-width': roadWidth(1.5) },
    },
    {
      id: 'road-major',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': C.road, 'line-width': roadWidth(2.4) },
    },
    {
      id: 'road-label',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'transportation_name',
      minzoom: 14,
      filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'trunk']]],
      layout: {
        'symbol-placement': 'line',
        'text-field': NAME,
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
      },
      paint: { 'text-color': C.label, 'text-halo-color': C.road, 'text-halo-width': 1.5 },
    },
    {
      id: 'water-label',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'water_name',
      layout: { 'text-field': NAME, 'text-font': ['Noto Sans Italic'], 'text-size': 12, 'text-letter-spacing': 0.1 },
      paint: { 'text-color': C.waterLabel, 'text-halo-color': C.water, 'text-halo-width': 1 },
    },
    {
      id: 'area-label',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'place',
      minzoom: 11,
      filter: ['in', ['get', 'class'], ['literal', ['suburb', 'quarter', 'neighbourhood']]],
      layout: {
        'text-field': NAME,
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 15, 12],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.14,
        'text-max-width': 8,
      },
      paint: { 'text-color': C.label, 'text-halo-color': C.halo, 'text-halo-width': 1.5 },
    },
    {
      id: 'city-label',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'place',
      maxzoom: 11,
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
      layout: {
        'text-field': NAME,
        'text-font': ['Noto Sans Bold'],
        'text-size': 13,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.2,
      },
      paint: { 'text-color': C.label, 'text-halo-color': C.halo, 'text-halo-width': 1.5 },
    },
  ],
};
