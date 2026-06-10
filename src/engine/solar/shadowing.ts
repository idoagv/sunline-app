import { add, dot, rayPolygonDistance, type Vec2, type Polygon } from './geometry';
import type { SunPosition } from './sunPosition';

const DEG = Math.PI / 180;
const MIN_ELEV = 0.5;
const FRONT_EPS = 0.03;
const WALL_OFFSET = 0.05;

export interface Obstacle {
  footprint: Polygon;
  base: number;
  top: number;
}

export interface FacadeSample {
  point: Vec2;
  height: number;
  normal: Vec2;
}

export function sunDirection(azimuthDeg: number): Vec2 {
  const r = azimuthDeg * DEG;
  return [Math.sin(r), Math.cos(r)];
}

export function isFacadeLit(sample: FacadeSample, sun: SunPosition, obstacles: Obstacle[]): boolean {
  if (sun.elevation <= MIN_ELEV) return false;
  const dir = sunDirection(sun.azimuth);
  if (dot(dir, sample.normal) <= FRONT_EPS) return false;
  const tanE = Math.tan(sun.elevation * DEG);
  const origin = add(sample.point, sample.normal, WALL_OFFSET);
  for (const ob of obstacles) {
    const d = rayPolygonDistance(origin, dir, ob.footprint);
    if (!isFinite(d) || d <= WALL_OFFSET) continue;
    const rayHeight = sample.height + d * tanE;
    if (rayHeight < ob.top && rayHeight >= ob.base) return false;
  }
  return true;
}
