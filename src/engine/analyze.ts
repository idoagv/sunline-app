import { dayWindow } from './solar/sunPosition';
import { sunHoursForUnit, sunScore, type SunHours } from './solar/sunHours';
import type { Obstacle } from './solar/shadowing';
import { deriveFacades, classifyPosition, facadeSamplesForUnit } from './scene/deriveUnits';
import type { Facade, Project, Unit, UnitPosition } from './scene/types';

export interface UnitRef {
  floor: number;
  row: number;
  col: number;
}

export interface UnitAnalysis {
  facades: Facade[];
  position: UnitPosition;
  hours: SunHours;
  score: number;
}

function obstaclesFor(project: Project): Obstacle[] {
  return project.buildings.map((b) => ({ footprint: b.footprint, base: b.base, top: b.base + b.height }));
}

export function analyzeUnit(project: Project, buildingId: string, ref: UnitRef, declinationDeg: number): UnitAnalysis {
  const building = project.buildings.find((b) => b.id === buildingId);
  if (!building) throw new Error(`building "${buildingId}" not found`);
  const grid = building.unitGrid ?? { rows: 1, cols: 1 };
  const facades = deriveFacades(ref.row, ref.col, grid.rows, grid.cols);
  const unit: Unit = {
    buildingId,
    floor: ref.floor,
    row: ref.row,
    col: ref.col,
    facades,
    position: classifyPosition(facades),
  };
  const samples = facadeSamplesForUnit(building, unit);
  const obstacles = obstaclesFor(project);
  const day = dayWindow(project.latitudeDeg, declinationDeg);
  const hours = samples.length
    ? sunHoursForUnit(samples, day, project.latitudeDeg, declinationDeg, obstacles)
    : { total: 0, morning: 0, afternoon: 0 };
  return { facades, position: unit.position, hours, score: sunScore(hours.total, day) };
}
