import { describe, it, expect } from 'vitest';
import { sunHoursForUnit, sunScore } from './sunHours';
import { dayWindow } from './sunPosition';
import type { FacadeSample } from './shadowing';

const LAT = 32;
const south: FacadeSample = { point: [0, 0], height: 30, normal: [0, -1] };
const north: FacadeSample = { point: [0, 20], height: 30, normal: [0, 1] };

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
