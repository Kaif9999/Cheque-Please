/** Who a receipted investor writes cheques as. Drives the café's zone. */
export type Crowd = 'big' | 'first' | 'angel' | 'cohort';
export type ZoneId = Crowd | 'scene';
export type CityId = 'bengaluru' | 'mumbai' | 'san-francisco' | 'new-york';

export interface Proof {
  /** own = the investor posted it; spotted = someone else named them there; other = article/podcast/blog. */
  kind: 'own' | 'spotted' | 'other';
  author: string | null;
  authorHandle: string | null;
  text: string;
  date: string;
  url: string;
}

export interface Investor {
  name: string;
  fund: string;
  handle: string | null;
  crowd: Crowd;
  /** Path under public/, when we have their X profile photo. */
  avatar?: string;
  proof: Proof;
}

/** Evidence that a café is a startup meeting spot, without naming an investor. */
export interface SceneItem {
  kind: 'tweet' | 'article';
  author: string;
  authorHandle: string | null;
  text: string;
  date: string;
  url: string;
}

export interface Cafe {
  slug: string;
  name: string;
  /** Path under public/ to the café's own logo, when we have a reliable one. */
  logo?: string;
  branch: string;
  area: string;
  address: string;
  lat: number;
  lon: number;
  maps_url: string;
  note: string;
  vcs: Investor[];
  scene: SceneItem[];
}

export interface City {
  id: CityId;
  name: string;
  /** ISO 3166-1 alpha-2, for addresses in structured data. */
  country: string;
  headline: string;
  /** Initial camera before pins are fitted. */
  center: [number, number];
  zoom: number;
  /** [west, south, east, north]; every café must sit inside. */
  bounds: [number, number, number, number];
  /** One factual line per neighbourhood, shown with its zone. */
  areas: Record<string, string>;
  cafes: Cafe[];
}
