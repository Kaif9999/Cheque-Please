import { describe, expect, it } from 'vitest';
import { CITIES } from '@/data/cities';

const TWEET = /^https:\/\/(x|twitter)\.com\/\w+\/status\/\d+/;
const CROWDS = ['big', 'first', 'angel', 'cohort'];

for (const city of Object.values(CITIES)) {
  describe(city.name, () => {
    it('describes every neighbourhood it has cafés in', () => {
      for (const cafe of city.cafes) expect(city.areas[cafe.area], cafe.area).toBeTruthy();
    });

    it('has unique slugs', () => {
      const slugs = city.cafes.map((c) => c.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    for (const cafe of city.cafes) {
      describe(cafe.slug, () => {
        it('has at least one receipt', () => {
          expect(cafe.vcs.length + cafe.scene.length).toBeGreaterThan(0);
        });

        it('sits inside the city', () => {
          const [w, s, e, n] = city.bounds;
          expect(cafe.lon).toBeGreaterThan(w);
          expect(cafe.lon).toBeLessThan(e);
          expect(cafe.lat).toBeGreaterThan(s);
          expect(cafe.lat).toBeLessThan(n);
        });

        it('keeps the note short', () => {
          expect(cafe.note.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(20);
          expect(cafe.maps_url).toMatch(/^https:\/\/www\.google\.com\/maps\//);
        });

        it('backs every investor with a sourced quote', () => {
          for (const vc of cafe.vcs) {
            expect(CROWDS).toContain(vc.crowd);
            expect(vc.proof.text.trim()).not.toBe('');
            expect(vc.proof.date.trim()).not.toBe('');
            expect(vc.proof.url).toMatch(/^https:\/\//);
            if (vc.proof.kind !== 'other') expect(vc.proof.url).toMatch(TWEET);
          }
        });

        it('backs every scene item with a sourced quote', () => {
          for (const item of cafe.scene) {
            expect(item.text.trim()).not.toBe('');
            expect(item.url).toMatch(item.kind === 'tweet' ? TWEET : /^https:\/\//);
          }
        });
      });
    }
  });
}
