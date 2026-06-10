import { describe, it, expect } from 'vitest';
import {
  sceneBounds, makeProjection, ringPoint, convexHull, shadowPolygon, cellCornersWorld,
} from './sceneProjection';
import { parkviewTowers } from '@/engine/data/parkviewTowers';

describe('sceneBounds', () => {
  it('computes the bounding box of all footprints', () => {
    const b = sceneBounds(parkviewTowers.buildings);
    expect(b).toEqual({ minX: -75, maxX: 75, minY: -10, maxY: 10 });
  });
});

describe('makeProjection', () => {
  const proj = makeProjection({ minX: -75, maxX: 75, minY: -10, maxY: 10 }, { cx: 340, cy: 290, fitRadius: 150 });

  it('maps the world centre to the screen centre', () => {
    expect(proj.toScreen([0, 0])).toEqual([340, 290]);
  });

  it('maps North (+y world) to up (smaller screen y)', () => {
    const [, sy] = proj.toScreen([0, 10]);
    expect(sy).toBeLessThan(290);
  });

  it('maps East (+x world) to the right (larger screen x)', () => {
    const [sx] = proj.toScreen([75, 0]);
    expect(sx).toBeGreaterThan(340);
  });

  it('uses px-per-metre scale that fits the larger span into fitRadius*2', () => {
    expect(proj.scale).toBeCloseTo(2, 5); // span 150m -> 300px
  });
});

describe('ringPoint', () => {
  it('places azimuth 0 (North) straight up', () => {
    const [x, y] = ringPoint(0, 205, [340, 290]);
    expect(x).toBeCloseTo(340, 5);
    expect(y).toBeCloseTo(85, 5);
  });
  it('places azimuth 90 (East) to the right', () => {
    const [x, y] = ringPoint(90, 205, [340, 290]);
    expect(x).toBeCloseTo(545, 5);
    expect(y).toBeCloseTo(290, 5);
  });
});

describe('convexHull', () => {
  it('returns the 4 corners of a square (ignores interior points)', () => {
    const hull = convexHull([[0, 0], [2, 0], [2, 2], [0, 2], [1, 1]]);
    expect(hull).toHaveLength(4);
  });
});

describe('shadowPolygon', () => {
  const square = [[-10, -10], [10, -10], [10, 10], [-10, 10]] as const;

  it('returns null when the sun is at/below the horizon', () => {
    expect(shadowPolygon(square, 180, 0, 60)).toBeNull();
  });

  it('casts the shadow opposite the sun (sun in South -> shadow extends North)', () => {
    const hull = shadowPolygon(square, 180, 45, 60)!; // tanE=1, L=60, dir=[0,+60]
    const maxY = Math.max(...hull.map((p) => p[1]));
    expect(maxY).toBeGreaterThan(10);
  });
});

describe('cellCornersWorld', () => {
  it('row 0 col 0 of the subject tower is the North-West cell', () => {
    const subject = parkviewTowers.buildings.find((b) => b.id === 'tower-1')!;
    const corners = cellCornersWorld(subject, 0, 0); // footprint x[-75,-45] y[-10,10], 2x3 grid
    // NW cell: x[-75,-65], y[0,10]
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    expect(Math.min(...xs)).toBeCloseTo(-75, 5);
    expect(Math.max(...xs)).toBeCloseTo(-65, 5);
    expect(Math.min(...ys)).toBeCloseTo(0, 5);
    expect(Math.max(...ys)).toBeCloseTo(10, 5);
  });
});
