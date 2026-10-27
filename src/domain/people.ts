import type { Cafe, Investor } from './types';

export interface InvestorAt extends Investor {
  /** Names of the cafés this investor has a post at. */
  cafes: string[];
}

const keyOf = (vc: Investor) => (vc.handle ?? vc.name).toLowerCase();

/** Each investor once, however many cafés they turn up at, in first-seen order. */
export function investorsAt(cafes: Cafe[]): InvestorAt[] {
  const byKey = new Map<string, InvestorAt>();
  for (const cafe of cafes) {
    for (const vc of cafe.vcs) {
      const seen = byKey.get(keyOf(vc));
      if (!seen) byKey.set(keyOf(vc), { ...vc, cafes: [cafe.name] });
      else if (!seen.cafes.includes(cafe.name)) seen.cafes.push(cafe.name);
    }
  }
  return [...byKey.values()];
}

/** Photos first, so a row of faces reads as faces rather than initials. */
export function photosFirst<T extends Investor>(people: T[]): T[] {
  return [...people].sort((a, b) => Number(!!b.avatar) - Number(!!a.avatar));
}

/** Investors with an X handle: those with the most cafés first, then by name. */
export function followable(cafes: Cafe[]): (InvestorAt & { handle: string })[] {
  return investorsAt(cafes)
    .filter((p): p is InvestorAt & { handle: string } => !!p.handle)
    .sort((a, b) => b.cafes.length - a.cafes.length || a.name.localeCompare(b.name));
}

export function handlesText(cafes: Cafe[]): string {
  return followable(cafes)
    .map((p) => `@${p.handle}`)
    .join('\n');
}
