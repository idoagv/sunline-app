import { describe, it, expect } from 'vitest';
import { sunDirection, isFacadeLit, type Obstacle, type FacadeSample } from './shadowing';
import type { Polygon } from './geometry';

const southNormal: [number, number] = [0, -1];

describe('sunDirection', () => {
  it('points east at azimuth 90 and north at azimuth 0', () => {
    const e = sunDirection(90);
    expect(e[0]).toBeCloseTo(1, 6);
    expect(e[1]).toBeCloseTo(0, 6);
    const n = sunDirection(0);
    expect(n[0]).toBeCloseTo(0, 6);
    expect(n[1]).toBeCloseTo(1, 6);
  });
});

describe('isFacadeLit', () => {
  const sample: FacadeSample = { point: [0, 0], height: 0, normal: southNormal };

  it('is lit when the sun faces the wall and nothing blocks it', () => {
    const lit = isFacadeLit({ ...sample, height: 10 }, { azimuth: 180, elevation: 40 }, []);
    expect(lit).toBe(true);
  });

  it('is dark when the sun is behind the wall', () => {
    const lit = isFacadeLit(sample, { azimuth: 0, elevation: 40 }, []);
    expect(lit).toBe(false);
  });

  it('is dark below the horizon', () => {
    const lit = isFacadeLit(sample, { azimuth: 180, elevation: -1 }, []);
    expect(lit).toBe(false);
  });

  it('blocks a low sample but lets a high sample clear the same obstacle', () => {
    const wall: Polygon = [[-5, -12], [5, -12], [5, -8], [-5, -8]];
    const obstacle: Obstacle = { footprint: wall, base: 0, top: 30 };
    const sun = { azimuth: 180, elevation: 20 };
    expect(isFacadeLit({ ...sample, height: 0 }, sun, [obstacle])).toBe(false);
    expect(isFacadeLit({ ...sample, height: 35 }, sun, [obstacle])).toBe(true);
  });

  it('does not falsely self-block on its own convex footprint', () => {
    const own: Polygon = [[-10, 0], [10, 0], [10, 20], [-10, 20]];
    const self: Obstacle = { footprint: own, base: 0, top: 60 };
    const onSouthWall: FacadeSample = { point: [0, 0], height: 15, normal: southNormal };
    expect(isFacadeLit(onSouthWall, { azimuth: 180, elevation: 40 }, [self])).toBe(true);
  });
});
