import { describe, it, expect } from 'vitest';
import { sunHoursForUnit, sunScore, unitLitAt } from './sunHours';
import { dayWindow } from './sunPosition';
import type { FacadeSample } from './shadowing';

const LAT = 32;
const south: FacadeSample = { point: [0, 0], height: 30, normal: [0, -1] };
const north: FacadeSample = { point: [0, 20], height: 30, normal: [0, 1] };

describe('azimuthOffsetDeg (scene north rotation)', () => {
  it('unitLitAt: a south wall lit by the noon sun goes dark when the sun azimuth is offset 180°', () => {
    // At solar noon the sun is due south (~az 180), front-lighting a south wall.
    expect(unitLitAt([south], 12, LAT, 0, [])).toBe(true);
    // Offsetting the sun azimuth by 180° puts it behind the south wall → not lit.
    expect(unitLitAt([south], 12, LAT, 0, [], 180)).toBe(false);
  });

  it('sunHoursForUnit: a +180° offset swaps a south wall’s sun onto the (mirror) north exposure', () => {
    const day = dayWindow(LAT, 0);
    const base = sunHoursForUnit([south], day, LAT, 0, []);
    const offset = sunHoursForUnit([south], day, LAT, 0, [], 240, 180);
    // The south wall (front-lit all day) loses its sun once the sun sits behind it.
    expect(base.total).toBeGreaterThan(1);
    expect(offset.total).toBeLessThan(0.05);
  });
});

describe('sunHoursForUnit', () => {
  it('gives a south wall more sun than a north wall in winter', () => {
    const day = dayWindow(LAT, -23.45);
    const s = sunHoursForUnit([south], day, LAT, -23.45, []);
    const n = sunHoursForUnit([north], day, LAT, -23.45, []);
    expect(s.total).toBeGreaterThan(n.total);
  });

  it('splits morning and afternoon that sum to the total', () => {
    const day = dayWindow(LAT, 0);
    const r = sunHoursForUnit([south], day, LAT, 0, []);
    expect(r.morning + r.afternoon).toBeCloseTo(r.total, 6);
  });

  it('a south wall gets symmetric morning and afternoon at the equinox', () => {
    const day = dayWindow(LAT, 0);
    const r = sunHoursForUnit([south], day, LAT, 0, []);
    expect(r.morning).toBeCloseTo(r.afternoon, 1);
  });
});

describe('sunScore', () => {
  it('is 0 for no sun and capped at 100', () => {
    const day = dayWindow(LAT, 0);
    expect(sunScore(0, day)).toBe(0);
    expect(sunScore(100, day)).toBe(100);
  });
});
