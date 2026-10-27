export type LngLat = [number, number];

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distance([lon1, lat1]: LngLat, [lon2, lat2]: LngLat): number {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Closed ring of points approximating a circle on the ground. */
export function circle([lon, lat]: LngLat, radius: number, steps = 72): LngLat[] {
  const ring: LngLat[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const dLat = (radius * Math.cos(t)) / R;
    const dLon = (radius * Math.sin(t)) / (R * Math.cos(rad(lat)));
    ring.push([lon + (dLon * 180) / Math.PI, lat + (dLat * 180) / Math.PI]);
  }
  return ring;
}

/** Closed convex hull (Andrew's monotone chain); points are close together, so lon/lat can be treated as planar. */
export function hull(points: LngLat[]): LngLat[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: LngLat, a: LngLat, b: LngLat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (input: LngLat[]) => {
    const out: LngLat[] = [];
    for (const p of input) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, p) <= 0) out.pop();
      out.push(p);
    }
    return out.slice(0, -1);
  };
  const ring = [...half(pts), ...half([...pts].reverse())];
  return [...ring, ring[0]!];
}
