import type { Vec2, Polygon } from '@/engine/solar/geometry';
import type { Building } from '@/engine/scene/types';
import { sunPosition, type DayWindow } from '@/engine';

const DEG = Math.PI / 180;

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function sceneBounds(buildings: { footprint: Polygon }[]): Bounds {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const b of buildings) {
    for (const [x, y] of b.footprint) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

export interface Projection {
  toScreen: (p: Vec2) => Vec2;
  center: Vec2;
  scale: number;
}

export function makeProjection(
  bounds: Bounds,
  opts: { cx: number; cy: number; fitRadius: number },
): Projection {
  const worldCX = (bounds.minX + bounds.maxX) / 2;
  const worldCY = (bounds.minY + bounds.maxY) / 2;
  const spanX = Math.max(1e-6, bounds.maxX - bounds.minX);
  const spanY = Math.max(1e-6, bounds.maxY - bounds.minY);
  const scale = (opts.fitRadius * 2) / Math.max(spanX, spanY);
  const toScreen = ([x, y]: Vec2): Vec2 => [
    opts.cx + (x - worldCX) * scale,
    opts.cy - (y - worldCY) * scale, // flip Y so world North (+y) points up
  ];
  return { toScreen, center: [opts.cx, opts.cy], scale };
}

export function ringPoint(azimuthDeg: number, radius: number, center: Vec2): Vec2 {
  const r = azimuthDeg * DEG;
  return [center[0] + radius * Math.sin(r), center[1] - radius * Math.cos(r)];
}

export function convexHull(points: Vec2[]): Vec2[] {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Vec2, a: Vec2, b: Vec2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function shadowPolygon(
  footprint: Polygon,
  azimuthDeg: number,
  elevationDeg: number,
  height: number,
  opts: { maxLength?: number } = {},
): Vec2[] | null {
  if (elevationDeg <= 0.5) return null;
  const tanE = Math.tan(elevationDeg * DEG);
  const L = Math.min(height / tanE, opts.maxLength ?? 300);
  const dx = -Math.sin(azimuthDeg * DEG) * L; // opposite the sun
  const dy = -Math.cos(azimuthDeg * DEG) * L;
  const swept: Vec2[] = [];
  for (const [x, y] of footprint) {
    swept.push([x, y]);
    swept.push([x + dx, y + dy]);
  }
  return convexHull(swept);
}

export function sunPathScreenPoints(
  day: DayWindow,
  latitudeDeg: number,
  declinationDeg: number,
  radius: number,
  center: Vec2,
  samples = 64,
): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = day.sunrise + (day.sunset - day.sunrise) * (i / samples);
    const s = sunPosition(t, latitudeDeg, declinationDeg);
    out.push(ringPoint(s.azimuth, radius, center));
  }
  return out;
}

export function azimuthToHour(
  azimuthDeg: number,
  latitudeDeg: number,
  declinationDeg: number,
  day: DayWindow,
): number {
  const riseAz = sunPosition(day.sunrise + 0.01, latitudeDeg, declinationDeg).azimuth;
  const setAz = sunPosition(day.sunset - 0.01, latitudeDeg, declinationDeg).azimuth;
  if (azimuthDeg <= riseAz) return day.sunrise;
  if (azimuthDeg >= setAz) return day.sunset;
  let lo = day.sunrise, hi = day.sunset;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (sunPosition(mid, latitudeDeg, declinationDeg).azimuth < azimuthDeg) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function cellCornersWorld(
  building: Building,
  row: number,
  col: number,
): [Vec2, Vec2, Vec2, Vec2] {
  const grid = building.unitGrid ?? { rows: 1, cols: 1 };
  const xs = building.footprint.map((p) => p[0]);
  const ys = building.footprint.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cellW = (maxX - minX) / grid.cols;
  const cellH = (maxY - minY) / grid.rows;
  const x0 = minX + col * cellW;
  const x1 = x0 + cellW;
  const yTop = maxY - row * cellH; // row 0 = North, matches facadeSamplesForUnit
  const yBot = yTop - cellH;
  return [
    [x0, yTop],
    [x1, yTop],
    [x1, yBot],
    [x0, yBot],
  ];
}
