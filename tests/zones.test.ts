import { describe, expect, it } from 'vitest';
import type { Cafe, Crowd } from '../src/data/types';
import { statsLine, statsOf, zoneOf, zonesIn } from '../src/data/zones';

function cafe(crowds: Crowd[], scene = 0, handles?: string[]): Cafe {
  return {
    slug: crowds.join('-') || 'scene',
    name: 'Test',
    branch: '',
    area: 'Area',
    address: '',
    lat: 12.97,
    lon: 77.59,
    maps_url: '',
    note: '',
    vcs: crowds.map((crowd, i) => ({
      name: `VC ${i}`,
      fund: '',
      handle: handles?.[i] ?? `vc${i}`,
      crowd,
      proof: { kind: 'own', author: null, authorHandle: null, text: '', date: '', url: 'https://x.com/a/status/1' },
    })),
    scene: Array.from({ length: scene }, () => ({ kind: 'article' as const, author: 'Pub', authorHandle: null, text: '', date: '', url: 'https://example.com' })),
  };
}

describe('zoneOf', () => {
  it('marks cafés without a named investor as founder scene', () => {
    expect(zoneOf(cafe([], 2))).toBe('scene');
  });
  it('takes the majority crowd', () => {
    expect(zoneOf(cafe(['angel', 'angel', 'big']))).toBe('angel');
  });
  it('breaks ties toward the bigger cheque', () => {
    expect(zoneOf(cafe(['cohort', 'first']))).toBe('first');
    expect(zoneOf(cafe(['angel', 'big']))).toBe('big');
  });
  it('calls three or more crowd types mixed', () => {
    expect(zoneOf(cafe(['angel', 'big', 'cohort']))).toBe('mixed');
  });
});

describe('stats', () => {
  it('counts each investor once across cafés and scene receipts separately', () => {
    const cafes = [cafe(['angel'], 1, ['same']), cafe(['big'], 0, ['Same']), cafe([], 1)];
    expect(statsOf(cafes)).toEqual({ cafes: 3, investors: 1, receipts: 4 });
    expect(statsLine(statsOf(cafes))).toBe('3 cafés · 1 investor · 4 public receipts');
  });
  it('orders legend zones by café count', () => {
    const zones = zonesIn([cafe([], 1), cafe(['angel']), cafe(['angel'])]).map((z) => [z.zone.id, z.count]);
    expect(zones).toEqual([['angel', 2], ['scene', 1]]);
  });
});
