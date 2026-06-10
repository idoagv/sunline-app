import { describe, it, expect } from 'vitest';
import { deriveFacades, classifyPosition, unitsForBuilding, facadeSamplesForUnit } from './deriveUnits';
import type { Building } from './types';

const building: Building = {
  id: 'B1',
  source: 'authored',
  footprint: [[0, 0], [30, 0], [30, 30], [0, 30]],
  base: 0,
  height: 30,
  floors: 10,
  floorHeight: 3,
  unitGrid: { rows: 2, cols: 3 },
};

describe('deriveFacades', () => {
  it('north-west corner has two facades', () => {
    expect(deriveFacades(0, 0, 2, 3).sort()).toEqual(['N', 'W']);
  });
  it('north-middle is a single-facade edge', () => {
    expect(deriveFacades(0, 1, 2, 3)).toEqual(['N']);
  });
  it('a true interior cell has no facades', () => {
    expect(deriveFacades(1, 1, 3, 3)).toEqual([]);
  });
});

describe('classifyPosition', () => {
  it('classifies by facade count', () => {
    expect(classifyPosition(['N', 'W'])).toBe('corner');
    expect(classifyPosition(['N'])).toBe('edge');
    expect(classifyPosition([])).toBe('interior');
  });
});

describe('unitsForBuilding', () => {
  it('produces floors x rows x cols units', () => {
    const units = unitsForBuilding(building);
    expect(units.length).toBe(10 * 2 * 3);
    expect(units.every((u) => u.floor >= 1 && u.floor <= 10)).toBe(true);
  });
});

describe('facadeSamplesForUnit', () => {
  it('places samples on the correct edges at the unit height', () => {
    const units = unitsForBuilding(building);
    const nwGround = units.find((u) => u.floor === 1 && u.row === 0 && u.col === 0)!;
    const samples = facadeSamplesForUnit(building, nwGround);
    expect(samples.length).toBe(2);
    const heights = samples.map((s) => s.height);
    expect(heights.every((h) => Math.abs(h - 1.5) < 1e-9)).toBe(true);
    const north = samples.find((s) => s.normal[1] === 1)!;
    expect(north.point[1]).toBeCloseTo(30, 6);
  });
});
