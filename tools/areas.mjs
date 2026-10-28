/**
 * Builds an outline for every neighbourhood on the map, so its zone covers the neighbourhood rather
 * than a ring around its cafés. Writes src/data/areas/<city>.json.
 *
 * An outline is an official one when a source has the neighbourhood under the same name and it holds
 * at least half of the area's cafés: DataSF's SF Find Neighborhoods, NYC's 2020 Neighborhood
 * Tabulation Areas, or OpenStreetMap (pieces named after the area, such as Koramangala's blocks, are
 * joined). Otherwise it is a rectangle around the cafés, turned to the local street grid, which is
 * read from OpenStreetMap's roads. Where outlines overlap, the smaller keeps the overlap.
 * Outlines already on file are kept, so only new neighbourhoods are fetched; --refresh rebuilds all.
 *
 *   node tools/areas.mjs [city ...] [--refresh]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import polygonClipping from 'polygon-clipping';
import * as prettier from 'prettier';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({ root, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false } });
let CITIES;
try {
  ({ CITIES } = await vite.ssrLoadModule('/src/data/cities.ts'));
} finally {
  await vite.close();
}

const UA = { 'user-agent': 'captable-cafe-data/1.0 (neighbourhood outlines)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Metres a rectangle reaches past its outermost cafés, and the least it spans each way. */
const PAD_M = 240;
const MIN_SPAN_M = 560;
/** A café this close to an official outline counts as inside: cafés often sit on the boundary street. */
const EDGE_M = 60;
/** Simplification tolerance for official outlines, in degrees (about 8 m). */
const SIMPLIFY = 0.00007;
/** The data spells some neighbourhoods differently from the official sources. */
const ALIASES = { SoMa: ['South of Market'] };

// --- Geometry on a flat projection: fine at neighbourhood scale.
const M_PER_DEG = 111_320;
const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const asMulti = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
function ringKm2(ring) {
  const k = Math.cos((ring[0][1] * Math.PI) / 180);
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return (Math.abs(s / 2) * M_PER_DEG * M_PER_DEG * k) / 1e6;
}
const km2 = (multi) => multi.reduce((sum, [outer, ...holes]) => sum + ringKm2(outer) - holes.reduce((h, r) => h + ringKm2(r), 0), 0);
function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function edgeMetres([x, y], ring) {
  const k = Math.cos((y * Math.PI) / 180);
  let best = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[i + 1];
    const dx = (bx - ax) * k;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * k * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot((x - ax) * k - t * dx, y - ay - t * dy) * M_PER_DEG);
  }
  return best;
}
const holds = (multi, p) =>
  multi.some(([outer, ...holes]) => (inRing(p, outer) && !holes.some((h) => inRing(p, h))) || edgeMetres(p, outer) < EDGE_M);

/** Douglas–Peucker on one ring, keeping it closed. */
function simplifyRing(ring) {
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = -1;
    let at = -1;
    const [ax, ay] = ring[a];
    const [bx, by] = ring[b];
    for (let i = a + 1; i < b; i++) {
      const [px, py] = ring[i];
      const d = Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / (Math.hypot(bx - ax, by - ay) || 1);
      if (d > worst) [worst, at] = [d, i];
    }
    if (worst > SIMPLIFY) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  const out = ring.filter((_, i) => keep[i]);
  return out.length >= 4 ? out : ring;
}
const simplify = (multi) => multi.map((poly) => poly.map(simplifyRing));
const round = (multi) =>
  multi.map((poly) => poly.map((ring) => ring.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5])));

// --- Official sources.
/** Overpass servers turn busy callers away with 429s and 50xs; those are retried on the next server, waiting longer each round. */
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
async function getJson(url, init, tries = 6) {
  for (let i = 1; ; i++) {
    const at = url === OVERPASS[0] ? OVERPASS[(i - 1) % OVERPASS.length] : url;
    // A server that hangs counts as busy: give up on it after 45 s and try the next.
    const res = await fetch(at, { ...init, headers: { ...UA, ...init?.headers }, signal: AbortSignal.timeout(45_000) }).catch(() => null);
    if (res?.ok) return res.json();
    if (i >= tries || (res && !(res.status === 429 || res.status >= 500))) throw new Error(`${res?.status ?? 'network error'} ${at}`);
    await sleep(3000 * i);
  }
}

const OPEN_DATA = {
  'san-francisco': {
    url: 'https://data.sfgov.org/resource/gfpk-269f.geojson?$limit=300',
    name: (p) => p.name,
    label: 'DataSF, SF Find Neighborhoods',
  },
  'new-york': {
    url: 'https://data.cityofnewyork.us/resource/9nt8-h7nd.geojson?$limit=400',
    name: (p) => p.ntaname,
    label: 'NYC 2020 Neighborhood Tabulation Areas',
  },
};

/** Official outlines named after the area: whole-name matches, or parts of a hyphenated NTA name. */
async function fromOpenData(city, area) {
  const src = OPEN_DATA[city.id];
  if (!src) return null;
  src.features ??= (await getJson(src.url)).features;
  const names = [area, ...(ALIASES[area] ?? [])].map(norm);
  const f = src.features.find((x) => {
    const n = src.name(x.properties) ?? '';
    return names.includes(norm(n)) || n.split('-').some((part) => names.includes(norm(part)));
  });
  return f ? { multi: asMulti(f.geometry), source: `${src.label}: ${src.name(f.properties)}` } : null;
}

/** OpenStreetMap places and wards named after the area, joined: "Koramangala 3rd Block" counts for Koramangala. */
async function fromOsm(city, area) {
  const [w, s, e, n] = city.bounds;
  city.osmNames ??= (
    await getJson(OVERPASS[0], {
      method: 'POST',
      body: new URLSearchParams({
        data: `[out:json][timeout:90];(way["place"~"^(suburb|neighbourhood|quarter)$"]["name"](${s},${w},${n},${e});relation["place"~"^(suburb|neighbourhood|quarter)$"]["name"](${s},${w},${n},${e});relation["boundary"="administrative"]["admin_level"~"^(9|10|11)$"]["name"](${s},${w},${n},${e}););out tags;`,
      }),
    })
  ).elements;
  const a = norm(area);
  const named = city.osmNames.filter((el) =>
    [el.tags.name, el.tags['name:en']].filter(Boolean).some((x) => norm(x) === a || norm(x).startsWith(`${a} `)),
  );
  // Prefer places to wards when both exist: wards follow admin lines, not what people call the area.
  const places = named.filter((el) => el.tags.place);
  const pick = places.length ? places : named;
  if (!pick.length) return null;
  await sleep(1100);
  const ids = pick.map((el) => `${el.type[0].toUpperCase()}${el.id}`).join(',');
  const found = await getJson(`https://nominatim.openstreetmap.org/lookup?format=json&polygon_geojson=1&osm_ids=${ids}`);
  const parts = found.filter((r) => ['Polygon', 'MultiPolygon'].includes(r.geojson?.type)).map((r) => asMulti(r.geojson));
  if (!parts.length) return null;
  return {
    multi: parts.length === 1 ? parts[0] : polygonClipping.union(...parts),
    source: `OpenStreetMap: ${pick.map((el) => el.tags.name).join(', ')}`,
  };
}

// --- The fallback: a rectangle squared to the streets.
/** The bearing (0–90°) most of the nearby road length runs along, from OpenStreetMap. */
async function streetGrid(lon, lat) {
  await sleep(1500);
  const data = await getJson(OVERPASS[0], {
    method: 'POST',
    body: new URLSearchParams({
      data: `[out:json][timeout:60];way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street)$"](around:450,${lat},${lon});out geom;`,
    }),
  });
  const bins = new Float64Array(90);
  const k = Math.cos((lat * Math.PI) / 180);
  for (const way of data.elements) {
    const g = way.geometry ?? [];
    for (let i = 1; i < g.length; i++) {
      const dx = (g[i].lon - g[i - 1].lon) * k;
      const dy = g[i].lat - g[i - 1].lat;
      const len = Math.hypot(dx, dy);
      const deg = ((((Math.atan2(dy, dx) * 180) / Math.PI) % 90) + 90) % 90;
      bins[Math.floor(deg)] += len;
    }
  }
  // Smooth over ±3° so a grid drawn slightly off square still reads as one direction.
  let best = 0;
  let bestScore = -1;
  for (let d = 0; d < 90; d++) {
    let score = 0;
    for (let j = -3; j <= 3; j++) score += bins[(d + j + 90) % 90];
    if (score > bestScore) [best, bestScore] = [d, score];
  }
  return best;
}

/** The grid angle of the nearest rectangle already on file, for when Overpass can't be reached. */
function nearestGrid(kept, lon, lat) {
  let best = { deg: 0, d: Infinity, area: null };
  for (const [area, { source, outline }] of Object.entries(kept)) {
    const deg = source.match(/\((\d+)°\)/)?.[1];
    if (!deg) continue;
    const ring = asMulti(outline)[0][0];
    const [x, y] = ring.reduce(([sx, sy], [px, py]) => [sx + px / ring.length, sy + py / ring.length], [0, 0]);
    const d = Math.hypot(x - lon, y - lat);
    if (d < best.d) best = { deg: Number(deg), d, area };
  }
  return best;
}

async function rectangle(cafes, kept) {
  const lon0 = cafes.reduce((s, c) => s + c.lon, 0) / cafes.length;
  const lat0 = cafes.reduce((s, c) => s + c.lat, 0) / cafes.length;
  let deg;
  let from = 'from OpenStreetMap roads';
  try {
    deg = await streetGrid(lon0, lat0);
  } catch {
    const near = nearestGrid(kept, lon0, lat0);
    deg = near.deg;
    from = near.area ? `as ${near.area}'s, Overpass being down` : 'north-up, Overpass being down';
  }
  const t = (deg * Math.PI) / 180;
  const k = Math.cos((lat0 * Math.PI) / 180);
  // Into metres on axes along the grid, take the box, pad it, and back out.
  const toGrid = ({ lon, lat }) => {
    const x = (lon - lon0) * k * M_PER_DEG;
    const y = (lat - lat0) * M_PER_DEG;
    return [x * Math.cos(t) + y * Math.sin(t), -x * Math.sin(t) + y * Math.cos(t)];
  };
  const fromGrid = ([u, v]) => {
    const x = u * Math.cos(t) - v * Math.sin(t);
    const y = u * Math.sin(t) + v * Math.cos(t);
    return [lon0 + x / (k * M_PER_DEG), lat0 + y / M_PER_DEG];
  };
  const pts = cafes.map(toGrid);
  const span = (i) => {
    const lo = Math.min(...pts.map((p) => p[i])) - PAD_M;
    const hi = Math.max(...pts.map((p) => p[i])) + PAD_M;
    const grow = Math.max(0, MIN_SPAN_M - (hi - lo)) / 2;
    return [lo - grow, hi + grow];
  };
  const [[u0, u1], [v0, v1]] = [span(0), span(1)];
  const ring = [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1],
    [u0, v0],
  ].map(fromGrid);
  return { multi: [[ring]], source: `Rectangle on the street grid (${deg}°), ${from}` };
}

// --- Per city.
/** `kept` holds the outlines already on file, reused as they are. */
async function outlinesFor(city, kept) {
  const byArea = new Map();
  for (const cafe of city.cafes) byArea.set(cafe.area, [...(byArea.get(cafe.area) ?? []), cafe]);
  const found = [];
  for (const [area, cafes] of byArea) {
    const enough = (o) => o && cafes.filter((c) => holds(o.multi, [c.lon, c.lat])).length >= Math.ceil(cafes.length / 2);
    let o = kept[area] ? { multi: asMulti(kept[area].outline), source: kept[area].source } : null;
    if (!o) {
      o = await fromOpenData(city, area).catch(() => null);
      if (!enough(o)) o = await fromOsm(city, area).catch(() => null);
      if (!enough(o)) o = await rectangle(cafes, kept);
      else o.multi = simplify(o.multi);
    }
    const size = km2(o.multi);
    console.log(`${city.id.padEnd(14)} ${area.padEnd(20)} ${size.toFixed(2).padStart(6)} km²  ${o.source}`);
    found.push({ area, size, ...o });
  }
  // Smaller outlines keep the overlap, so neighbours never tint twice.
  found.sort((a, b) => a.size - b.size);
  const out = {};
  for (let i = 0; i < found.length; i++) {
    let multi = found[i].multi;
    for (let j = 0; j < i; j++) multi = polygonClipping.difference(multi, found[j].multi);
    if (!multi.length) continue;
    multi = round(multi);
    out[found[i].area] = {
      source: found[i].source,
      outline: multi.length === 1 ? { type: 'Polygon', coordinates: multi[0] } : { type: 'MultiPolygon', coordinates: multi },
    };
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

const refresh = process.argv.includes('--refresh');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
mkdirSync(fileURLToPath(new URL('../src/data/areas', import.meta.url)), { recursive: true });
for (const city of Object.values(CITIES)) {
  if (only.length && !only.includes(city.id)) continue;
  const file = fileURLToPath(new URL(`../src/data/areas/${city.id}.json`, import.meta.url));
  const kept = !refresh && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const out = await outlinesFor(city, kept);
  // Written as Prettier would, so the format check passes as is.
  writeFileSync(file, await prettier.format(JSON.stringify(out), { ...(await prettier.resolveConfig(file)), filepath: file }));
  console.log(`wrote ${Object.keys(out).length} outlines for ${city.id}\n`);
}
