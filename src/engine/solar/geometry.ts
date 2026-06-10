export type Vec2 = readonly [number, number];
export type Polygon = readonly Vec2[];

export function add(p: Vec2, v: Vec2, s = 1): Vec2 {
  return [p[0] + v[0] * s, p[1] + v[1] * s];
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}

export function dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1];
}

export function rayPolygonDistance(p: Vec2, dir: Vec2, poly: Polygon): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const det = ex * dir[1] - dir[0] * ey;
    if (Math.abs(det) < 1e-9) continue;
    const px = a[0] - p[0];
    const py = a[1] - p[1];
    const t = (-ey * px + ex * py) / det;
    const u = (dir[0] * py - dir[1] * px) / det;
    if (t > 1e-6 && u >= 0 && u <= 1 && t < best) best = t;
  }
  return best;
}

export function pointInPolygon(p: Vec2, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect = (yi > p[1]) !== (yj > p[1]) &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
