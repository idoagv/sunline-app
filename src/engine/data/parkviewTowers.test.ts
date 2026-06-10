import { describe, it, expect } from 'vitest';
import { parkviewTowers } from './parkviewTowers';
import { validateProject } from '../scene/validate';
import { analyzeUnit } from '../analyze';

const SUMMER = 23.45;
const WINTER = -23.45;

describe('parkviewTowers data', () => {
  it('is a valid project', () => {
    expect(validateProject(parkviewTowers)).toEqual([]);
  });

  it('a south facade gets more sun in winter than summer at this latitude', () => {
    const summer = analyzeUnit(parkviewTowers, 'tower-1', { floor: 10, row: 1, col: 1 }, SUMMER);
    const winter = analyzeUnit(parkviewTowers, 'tower-1', { floor: 10, row: 1, col: 1 }, WINTER);
    expect(winter.hours.total).toBeGreaterThan(summer.hours.total);
  });

  it('a north facade gets summer sun but effectively none in winter', () => {
    const summer = analyzeUnit(parkviewTowers, 'tower-1', { floor: 10, row: 0, col: 1 }, SUMMER);
    const winter = analyzeUnit(parkviewTowers, 'tower-1', { floor: 10, row: 0, col: 1 }, WINTER);
    expect(summer.hours.total).toBeGreaterThan(2);
    expect(winter.hours.total).toBeLessThan(0.5);
  });

  it('a sunny south corner beats a shaded low unit facing the neighbours', () => {
    const southCornerHigh = analyzeUnit(parkviewTowers, 'tower-1', { floor: 20, row: 1, col: 0 }, WINTER);
    const eastEdgeLow = analyzeUnit(parkviewTowers, 'tower-1', { floor: 1, row: 0, col: 2 }, WINTER);
    expect(southCornerHigh.hours.total).toBeGreaterThan(eastEdgeLow.hours.total);
  });
});
