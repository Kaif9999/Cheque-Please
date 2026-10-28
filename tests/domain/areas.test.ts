import { describe, expect, it } from 'vitest';
import { areaNamed, areaPages, areasOf } from '@/domain/areas';
import { distance } from '@/domain/geo';
import type { Cafe, Crowd, Outline } from '@/domain/types';

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
    const area = areasOf([
      cafe('Indiranagar', 77.64, 12.97, ['first']),
      cafe('Indiranagar', 77.641, 12.971, ['first']),
      cafe('Indiranagar', 77.642, 12.972, ['big', 'angel']),
    ])[0]!;
    expect(area.zone).toBe('first');
    expect(area.cafes).toBe(3);
  });

  it('without an outline, wraps every café with margin to spare', () => {
    const list = [cafe('A', 72.83, 19.05, ['angel']), cafe('A', 72.84, 19.06, [])];
    const area = areasOf(list)[0]!;
    const ring = (area.outline.coordinates as [number, number][][])[0]!;
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    for (const c of list) {
      const nearest = Math.min(...ring.map((p) => distance([c.lon, c.lat], p)));
      expect(nearest).toBeGreaterThan(300);
    }
    expect(area.top[1]).toBe(Math.max(...ring.map((p) => p[1])));
  });

  it("uses the neighbourhood's own outline when there is one", () => {
    const square: Outline = {
      type: 'Polygon',
      coordinates: [
        [
          [72.8, 19.0],
          [72.9, 19.0],
          [72.9, 19.1],
          [72.8, 19.1],
          [72.8, 19.0],
        ],
      ],
    };
    const area = areasOf([cafe('A', 72.83, 19.05, ['angel'])], { A: square })[0]!;
    expect(area.outline).toBe(square);
    expect(area.top[1]).toBe(19.1);
  });
});

describe('areaPages', () => {
  it('gives a page only to neighbourhoods with two or more cafés, biggest first', () => {
    const list = [
      cafe('HSR Layout', 77.64, 12.91, []),
      cafe('Indiranagar', 77.64, 12.97, []),
      cafe('Indiranagar', 77.641, 12.971, []),
      cafe('Koramangala', 77.62, 12.93, []),
    ];
    list.push(cafe('Indiranagar', 77.642, 12.972, []), cafe('HSR Layout', 77.641, 12.911, []));
    expect(areaPages(list).map(([area, cafes]) => [area, cafes.length])).toEqual([
      ['Indiranagar', 3],
      ['HSR Layout', 2],
    ]);
  });
});

describe('areaNamed', () => {
  it('finds the neighbourhood a slug stands for', () => {
    const list = [cafe('HSR Layout', 77.64, 12.91, [])];
    expect(areaNamed(list, 'hsr-layout')).toBe('HSR Layout');
    expect(areaNamed(list, 'nowhere')).toBeUndefined();
  });
});
