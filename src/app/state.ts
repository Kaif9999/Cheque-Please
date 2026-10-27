import { CITIES } from '@/data/cities';
import type { Cafe, City, CityId, ZoneId } from '@/domain/types';
import { zoneOf } from '@/domain/zones';

export interface AppState {
  city: CityId;
  filter: ZoneId | null;
  selected: string | null;
  /** The panel shows the café list (when no café is selected). */
  list: boolean;
  /** 'intro' while the cover is up; 'map' once the person has started exploring. */
  mode: 'intro' | 'map';
}

export const initialState: AppState = { city: 'bengaluru', filter: null, selected: null, list: false, mode: 'intro' };

export const cityOf = (s: AppState): City => CITIES[s.city];
export const visibleCafes = (s: AppState): Cafe[] => cityOf(s).cafes.filter((c) => !s.filter || zoneOf(c) === s.filter);
export const selectedCafe = (s: AppState): Cafe | undefined => cityOf(s).cafes.find((c) => c.slug === s.selected);
export const sheetOpen = (s: AppState): boolean => !!s.selected || s.list;
