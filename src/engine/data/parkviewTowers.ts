import type { Building, Project } from '../scene/types';

function tower(id: string, centerX: number, labels?: Record<string, string>): Building {
  return {
    id,
    source: 'authored',
    footprint: [
      [centerX - 15, -10],
      [centerX + 15, -10],
      [centerX + 15, 10],
      [centerX - 15, 10],
    ],
    base: 0,
    height: 60,
    floors: 20,
    floorHeight: 3,
    unitGrid: { rows: 2, cols: 3 },
    unitLabels: labels,
  };
}

export const parkviewTowers: Project = {
  id: 'parkview-towers',
  name: 'Parkview Towers',
  latitudeDeg: 32,
  displayUnits: 'metric',
  subjectBuildingId: 'tower-1',
  buildings: [
    tower('tower-1', -60, { '1-1': '5S', '1-0': '5W', '0-2': '4D' }),
    tower('tower-2', 0),
    tower('tower-3', 60),
  ],
};
