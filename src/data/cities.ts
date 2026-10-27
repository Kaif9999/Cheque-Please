import type { Cafe, City, CityId } from '@/domain/types';
import bengaluru from './bengaluru.json';
import mumbai from './mumbai.json';
import sanFrancisco from './san-francisco.json';

export const CITIES: Record<CityId, City> = {
  bengaluru: {
    id: 'bengaluru',
    name: 'Bengaluru',
    headline: "Where Bengaluru's VCs get coffee",
    center: [77.61, 12.95],
    zoom: 11.4,
    bounds: [77.4, 12.8, 77.85, 13.2],
    areas: {
      Indiranagar: 'Five of these cafés sit on one stretch of 12th Main Road.',
      Koramangala: 'In 2018 a Lightspeed partner said Third Wave here reminded him of University Ave, Palo Alto.',
      'HSR Layout': 'An angel counted about five VCs at one Third Wave in 45 minutes.',
      'Shanti Nagar': 'Three days of free founder office hours at Ajji House, Nov 2025.',
    },
    cafes: bengaluru.cafes as Cafe[],
  },
  mumbai: {
    id: 'mumbai',
    name: 'Mumbai',
    headline: "Where Mumbai's VCs get coffee",
    center: [72.84, 19.05],
    zoom: 11.2,
    bounds: [72.76, 18.88, 73.12, 19.32],
    areas: {
      'Bandra West': 'Nikhil Kamath was spotted upstairs at Subko in Aug 2025.',
      'Lower Parel': '100X.VC backed the coffee kiosk in One World Center.',
      'Khar West': 'An angel called the Starbucks here his Saturday office in 2016.',
      BKC: 'A meetup check-in at the G Block Starbucks, 2014.',
      'Kala Ghoda': 'An angel checked in at The Pantry in 2013.',
      Chowpatty: 'An Inuka Capital founder checked in at the Starbucks here in 2014.',
      Matunga: 'A 100X.VC partner posted from Cafe Madras in 2014.',
      'Santacruz East': 'A coffee check-in at the Grand Hyatt, 2012.',
      Juhu: 'Someone said they were at Soho House with "the Seq India guys" in 2020.',
    },
    cafes: mumbai.cafes as Cafe[],
  },
  'san-francisco': {
    id: 'san-francisco',
    name: 'San Francisco',
    headline: "Where San Francisco's VCs get coffee",
    center: [-122.3, 37.62],
    zoom: 9.8,
    bounds: [-122.55, 37.38, -122.1, 37.84],
    areas: {
      'South Park': "A Lightspeed partner jokes his deal flow comes from the Blue Bottle below the firm's offices.",
      SoMa: 'An FPV partner posts overheard founder and angel talk from Sightglass on 7th St.',
      'Rincon Hill': 'A 2026 post joked that founders queue at Saint Frank on Folsom between pitch practice.',
      'Russian Hill': 'Audacious and Bloomberg Beta partners posted from Saint Frank on Polk St in Jan 2025.',
      Mission: "The Information said Homebrew's Hunter Walk is often at Ritual on Valencia St at 9am, 2023.",
      'Pacific Heights': 'A Gradient partner said Blue Bottle on Fillmore "has more deal activity", 2023.',
      'Jackson Square': "Hunter Walk was at a VC party at The Battery, a members' club, in Jun 2024.",
      'Downtown Palo Alto': 'Solo VC Oren Zeev takes almost all his meetings at Café Venetia, per The Information, 2023.',
      'Menlo Park': "Bloomberg Beta's James Cham called Saint Frank here the Valley's smartest coffee shop, 2022.",
      'Sand Hill Road': 'Ben Narasin called Madera at the Rosewood "normally VC central", Jan 2024.',
      Woodside: "NPR says Buck's quickly became a hangout for venture capitalists after 1991.",
    },
    cafes: sanFrancisco.cafes as Cafe[],
  },
};

export const CITY_ORDER: CityId[] = ['bengaluru', 'mumbai', 'san-francisco'];
