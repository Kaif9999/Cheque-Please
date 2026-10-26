import type { Cafe, City, CityId } from './types';
import bengaluru from './bengaluru.json';
import mumbai from './mumbai.json';

export const CITIES: Record<CityId, City> = {
  bengaluru: {
    id: 'bengaluru',
    name: 'Bengaluru',
    headline: 'Filter kaapi, filtered deal flow.',
    center: [77.61, 12.95],
    zoom: 11.4,
    bounds: [77.4, 12.8, 77.85, 13.2],
    cafes: bengaluru.cafes as Cafe[],
  },
  mumbai: {
    id: 'mumbai',
    name: 'Mumbai',
    headline: 'Cutting chai, cutting cheques.',
    center: [72.84, 19.05],
    zoom: 11.2,
    bounds: [72.76, 18.88, 73.12, 19.32],
    cafes: mumbai.cafes as Cafe[],
  },
};

export const CITY_ORDER: CityId[] = ['bengaluru', 'mumbai'];
