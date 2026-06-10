import { describe, it, expect } from 'vitest';
import { validateProject, serializeProject, deserializeProject } from './validate';
import type { Project } from './types';

const valid: Project = {
  id: 'P1',
  name: 'Test',
  latitudeDeg: 32,
  displayUnits: 'metric',
  subjectBuildingId: 'B1',
  buildings: [
    { id: 'B1', source: 'authored', footprint: [[0, 0], [10, 0], [10, 10], [0, 10]], base: 0, height: 30, floors: 10, floorHeight: 3, unitGrid: { rows: 2, cols: 2 } },
  ],
};

describe('validateProject', () => {
  it('accepts a valid project', () => {
    expect(validateProject(valid)).toEqual([]);
  });
  it('flags a missing subject building', () => {
    const bad = { ...valid, subjectBuildingId: 'NOPE' };
    expect(validateProject(bad).length).toBeGreaterThan(0);
  });
  it('flags a footprint with fewer than 3 points', () => {
    const bad: Project = { ...valid, buildings: [{ ...valid.buildings[0], footprint: [[0, 0], [1, 1]] }] };
    expect(validateProject(bad).length).toBeGreaterThan(0);
  });
});

describe('serialize round-trip', () => {
  it('survives serialize then deserialize', () => {
    const json = serializeProject(valid);
    const back = deserializeProject(json);
    expect(back).toEqual(valid);
    expect(validateProject(back)).toEqual([]);
  });
});
