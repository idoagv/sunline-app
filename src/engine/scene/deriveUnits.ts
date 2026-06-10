import type { Vec2 } from '../solar/geometry';
import type { FacadeSample } from '../solar/shadowing';
import type { Building, Facade, Unit, UnitPosition } from './types';

const FACADE_NORMALS: Record<Facade, Vec2> = {
  N: [0, 1],
  E: [1, 0],
  S: [0, -1],
  W: [-1, 0],
};

export function deriveFacades(row: number, col: number, rows: number, cols: number): Facade[] {
  const f: Facade[] = [];
  if (row === 0) f.push('N');
  if (row === rows - 1) f.push('S');
  if (col === 0) f.push('W');
  if (col === cols - 1) f.push('E');
  return f;
}

export function classifyPosition(facades: Facade[]): UnitPosition {
  if (facades.length >= 2) return 'corner';
  if (facades.length === 1) return 'edge';
  return 'interior';
}

export function unitsForBuilding(b: Building): Unit[] {
  const floors = b.floors ?? 1;
  const grid = b.unitGrid ?? { rows: 1, cols: 1 };
  const units: Unit[] = [];
  for (let floor = 1; floor <= floors; floor++) {
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const facades = deriveFacades(row, col, grid.rows, grid.cols);
        units.push({
          buildingId: b.id,
          floor,
          row,
          col,
          label: b.unitLabels?.[`${row}-${col}`],
          facades,
          position: classifyPosition(facades),
        });
      }
    }
  }
  return units;
}

export function facadeSamplesForUnit(b: Building, unit: Unit): FacadeSample[] {
  const grid = b.unitGrid ?? { rows: 1, cols: 1 };
  const xs = b.footprint.map((p) => p[0]);
  const ys = b.footprint.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cellW = (maxX - minX) / grid.cols;
  const cellH = (maxY - minY) / grid.rows;
  const cx = minX + (unit.col + 0.5) * cellW;
  const cy = maxY - (unit.row + 0.5) * cellH;
  const floorHeight = b.floorHeight ?? b.height / (b.floors ?? 1);
  const height = b.base + (unit.floor - 0.5) * floorHeight;

  return unit.facades.map((f) => {
    let point: Vec2;
    if (f === 'N') point = [cx, maxY];
    else if (f === 'S') point = [cx, minY];
    else if (f === 'E') point = [maxX, cy];
    else point = [minX, cy];
    return { point, height, normal: FACADE_NORMALS[f] };
  });
}
