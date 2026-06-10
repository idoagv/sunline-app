import { describe, it, expect } from 'vitest';
import { analyzeUnit } from './analyze';
import type { Project } from './scene/types';

const project: Project = {
  id: 'P',
  name: 'Two towers',
  latitudeDeg: 32,
  displayUnits: 'metric',
  subjectBuildingId: 'A',
  buildings: [
    { id: 'A', source: 'authored', footprint: [[-15, -10], [15, -10], [15, 10], [-15, 10]], base: 0, height: 60, floors: 20, floorHeight: 3, unitGrid: { rows: 2, cols: 3 } },
    { id: 'B', source: 'authored', footprint: [[-15, -50], [15, -50], [15, -30], [-15, -30]], base: 0, height: 60, floors: 20, floorHeight: 3, unitGrid: { rows: 2, cols: 3 } },
  ],
};

const WINTER = -23.45;

describe('analyzeUnit', () => {
  it('gives an upper floor at least as much sun as a lower floor', () => {
    const low = analyzeUnit(project, 'A', { floor: 2, row: 1, col: 1 }, WINTER);
    const high = analyzeUnit(project, 'A', { floor: 19, row: 1, col: 1 }, WINTER);
    expect(high.hours.total).toBeGreaterThanOrEqual(low.hours.total - 1e-6);
  });

  it('the southern neighbour B steals winter sun from low south units of A', () => {
    const lowSouth = analyzeUnit(project, 'A', { floor: 1, row: 1, col: 1 }, WINTER);
    const highSouth = analyzeUnit(project, 'A', { floor: 20, row: 1, col: 1 }, WINTER);
    expect(highSouth.hours.total).toBeGreaterThan(lowSouth.hours.total);
  });

  it('reports facades, position and a 0-100 score', () => {
    const r = analyzeUnit(project, 'A', { floor: 10, row: 0, col: 0 }, 0);
    expect(r.facades.sort()).toEqual(['N', 'W']);
    expect(r.position).toBe('corner');
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
