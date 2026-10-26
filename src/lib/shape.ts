export type LngLat = [number, number];
export type DrawMode = "corner" | "smooth" | "round" | "hand";

const PROFILES: number[][] = [
  [1.05, 0.9, 1.2, 0.74, 0.98, 1.24, 0.82, 1.08, 0.68, 1.0],
  [0.7, 1.08, 1.22, 0.84, 0.62, 0.94, 1.16, 0.76, 1.1, 0.72],
  [1.14, 1.06, 0.94, 1.16, 1.02, 0.9, 1.18, 1.0, 0.92, 1.12],
  [0.78, 1.16, 0.66, 1.04, 1.24, 0.7, 0.96, 1.18, 0.74, 1.02],
  [1.22, 0.8, 0.58, 0.92, 1.16, 0.68, 0.54, 1.08, 1.2, 0.76],
  [0.92, 1.22, 1.04, 0.66, 0.84, 1.18, 0.72, 1.1, 0.86, 0.64],
  [1.1, 0.72, 1.18, 0.88, 0.64, 1.22, 0.8, 1.04, 0.74, 1.14],
  [0.86, 1.12, 0.96, 1.22, 0.7, 1.06, 0.78, 1.16, 0.64, 0.98],
  [1.16, 0.78, 1.02, 0.66, 1.2, 0.86, 0.62, 1.1, 0.94, 1.14],
  [0.9, 1.1, 0.72, 1.22, 0.96, 0.66, 1.14, 0.8, 1.06, 0.74],
  [1.18, 0.84, 0.68, 1.08, 1.24, 0.76, 0.94, 1.1, 0.64, 1.0],
  [0.76, 1.14, 1.02, 0.64, 0.92, 1.2, 0.82, 0.7, 1.12, 0.96],
  [1.08, 0.68, 0.96, 1.18, 0.78, 1.06, 0.62, 1.22, 0.88, 1.0],
  [0.94, 1.16, 0.72, 0.88, 1.2, 0.68, 1.08, 0.8, 1.14, 0.66],
  [1.2, 0.82, 1.04, 0.66, 0.9, 1.16, 0.74, 1.08, 0.92, 0.7],
  [0.82, 1.1, 0.96, 1.18, 0.68, 0.88, 1.14, 0.74, 1.02, 0.66],
  [1.06, 0.7, 1.18, 0.9, 0.64, 1.12, 0.82, 1.22, 0.76, 0.98],
];

export function openRing(points: LngLat[]): LngLat[] {
  if (
    points.length >= 2 &&
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1]
  ) {
    return points.slice(0, -1);
  }
  return points;
}

export function chaikin(points: LngLat[], times = 3): LngLat[] {
  let current = openRing(points);
  if (current.length < 3) return current;
  for (let pass = 0; pass < times; pass += 1) {
    const next: LngLat[] = [];
    for (let index = 0; index < current.length; index += 1) {
      const start = current[index];
      const end = current[(index + 1) % current.length];
      next.push([start[0] * 0.75 + end[0] * 0.25, start[1] * 0.75 + end[1] * 0.25]);
      next.push([start[0] * 0.25 + end[0] * 0.75, start[1] * 0.25 + end[1] * 0.75]);
    }
    current = next;
  }
  return current;
}

export function roundRing(points: LngLat[]): LngLat[] {
  const soft = chaikin(points, 3);
  if (soft.length < 3) return points;
  return [...soft, soft[0]];
}

export function neighborhood(
  lng: number,
  lat: number,
  rx: number,
  ry: number,
  profile = 0,
): LngLat[] {
  const wobble = PROFILES[Math.abs(profile) % PROFILES.length];
  const raw = wobble.map((scale, index) => {
    const angle = (index / wobble.length) * Math.PI * 2 - Math.PI / 6;
    return [lng + Math.cos(angle) * rx * scale, lat + Math.sin(angle) * ry * scale] as LngLat;
  });
  const soft = chaikin(raw, 3);
  return [...soft, soft[0]];
}

export function circleRing(center: LngLat, edge: LngLat, steps = 36): LngLat[] {
  const dx = edge[0] - center[0];
  const dy = edge[1] - center[1];
  const rx = Math.hypot(dx, dy * 1.15);
  const ry = rx / 1.15;
  if (rx < 0.00035) return [];
  const points: LngLat[] = [];
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    points.push([center[0] + Math.cos(angle) * rx, center[1] + Math.sin(angle) * ry]);
  }
  points.push(points[0]);
  return points;
}

function distanceToSegment(point: LngLat, start: LngLat, end: LngLat) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = dx * dx + dy * dy;
  if (length === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const ratio = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length));
  return Math.hypot(point[0] - (start[0] + ratio * dx), point[1] - (start[1] + ratio * dy));
}

export function simplify(points: LngLat[], epsilon = 0.001): LngLat[] {
  if (points.length < 3) return points;
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop() as [number, number];
    let farthest = 0;
    let index = -1;
    for (let cursor = start + 1; cursor < end; cursor += 1) {
      const span = distanceToSegment(points[cursor], points[start], points[end]);
      if (span > farthest) {
        farthest = span;
        index = cursor;
      }
    }
    if (index !== -1 && farthest > epsilon) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, index) => keep[index]);
}
