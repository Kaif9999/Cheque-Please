import { describe, expect, it } from 'vitest';
import { areasOf, circle, distance, hull } from '../src/data/areas';
import type { Cafe, Crowd } from '../src/data/types';

function cafe(area: string, lon: number, lat: number, crowds: Crowd[]): Cafe {
  return {
    slug: `${area}-${lon}`,
    name: 'Test',
    branch: '',
    area,
    address: '',
    lat,
    lon,
    maps_url: '',
    note: '',
    vcs: crowds.map((crowd, i) => ({
      name: `VC ${i}`,
      fund: '',
      handle: `h${lon}${i}`,
      crowd,
      proof: { kind: 'own', author: null, authorHandle: null, text: 't', date: 'd', url: 'https://x.com/a/status/1' },
    })),
    scene: crowds.length ? [] : [{ kind: 'article', author: 'A', authorHandle: null, text: 't', date: 'd', url: 'https://a.b' }],
  };
}

describe('areasOf', () => {
  it('colours an area by the zone most of its cafés fall in, not by mixing every cheque', () => {
    const [area] = areasOf([
      cafe('Indiranagar', 77.64, 12.97, ['first']),
      cafe('Indiranagar', 77.641, 12.971, ['first']),
      cafe('Indiranagar', 77.642, 12.972, ['big', 'angel']),
    ]);
    expect(area.zone).toBe('first');
    expect(area.cafes).toBe(3);
  });

  it('wraps every café with margin to spare', () => {
    const list = [cafe('A', 72.83, 19.05, ['angel']), cafe('A', 72.84, 19.06, [])];
    const [area] = areasOf(list);
    expect(area.shape[0]).toEqual(area.shape[area.shape.length - 1]);
    for (const c of list) {
      const nearest = Math.min(...area.shape.map((p) => distance([c.lon, c.lat], p)));
      expect(nearest).toBeGreaterThan(300);
    }
    expect(area.top[1]).toBe(Math.max(...area.shape.map((p) => p[1])));
  });
});

describe('hull', () => {
  it('drops interior points', () => {
    const ring = hull([[0, 0], [2, 0], [2, 2], [0, 2], [1, 1]]);
    expect(ring).toHaveLength(5);
    expect(ring).not.toContainEqual([1, 1]);
  });
});

describe('circle', () => {
  it('returns a closed ring at the requested radius', () => {
    const ring = circle([77.6, 12.97], 1000, 36);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    for (const p of ring) expect(distance([77.6, 12.97], p)).toBeCloseTo(1000, -1);
  });
});
