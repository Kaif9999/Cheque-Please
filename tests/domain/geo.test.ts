import { describe, expect, it } from 'vitest';
import { circle, distance, hull } from '@/domain/geo';

describe('hull', () => {
  it('drops interior points', () => {
    const ring = hull([
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [1, 1],
    ]);
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
