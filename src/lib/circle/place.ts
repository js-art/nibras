export type MapCountry = "ae" | "om";
export type LngLat = [number, number];

export type CirclePlace = {
  kind: "point" | "range";
  country: MapCountry;
  point: LngLat;
  ring?: LngLat[];
};

const BOX: Record<MapCountry, { minLng: number; maxLng: number; minLat: number; maxLat: number }> = {
  ae: { minLng: 51.4, maxLng: 56.55, minLat: 22.45, maxLat: 26.4 },
  om: { minLng: 52, maxLng: 59.95, minLat: 16.45, maxLat: 26.45 },
};

function pair(value: unknown): LngLat | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lng = Number(value[0]);
  const lat = Number(value[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

export function inCountry(country: MapCountry, point: LngLat) {
  const box = BOX[country];
  return point[0] >= box.minLng && point[0] <= box.maxLng && point[1] >= box.minLat && point[1] <= box.maxLat;
}

export function ringHolds(ring: LngLat[], point: LngLat) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function pointRing(point: LngLat): LngLat[] {
  const [lng, lat] = point;
  const dx = 0.0034;
  const dy = 0.0025;
  const ring: LngLat[] = [
    [lng - dx, lat - dy],
    [lng + dx * 0.85, lat - dy * 0.55],
    [lng + dx, lat + dy * 0.75],
    [lng - dx * 0.35, lat + dy],
  ];
  ring.push(ring[0]);
  return ring;
}

export function centroid(points: LngLat[]): LngLat {
  const open =
    points.length >= 2 && points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1]
      ? points.slice(0, -1)
      : points;
  const count = Math.max(1, open.length);
  const lng = open.reduce((sum, point) => sum + point[0], 0) / count;
  const lat = open.reduce((sum, point) => sum + point[1], 0) / count;
  return [lng, lat];
}

export function parsePlace(value: unknown): CirclePlace | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { kind?: unknown; country?: unknown; point?: unknown; ring?: unknown };
  const country = raw.country === "ae" || raw.country === "om" ? raw.country : null;
  const point = pair(raw.point);
  if (!country || !point || !inCountry(country, point)) return null;
  if (raw.kind === "point") return { kind: "point", country, point };
  if (raw.kind !== "range" || !Array.isArray(raw.ring)) return null;
  const ring = raw.ring.map(pair).filter((item): item is LngLat => Boolean(item));
  if (ring.length < 3 || ring.length > 80 || ring.some((item) => !inCountry(country, item))) return null;
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring : [...ring, ring[0]];
  return { kind: "range", country, point, ring: closed };
}
