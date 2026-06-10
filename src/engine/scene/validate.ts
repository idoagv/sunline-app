import type { Project } from './types';

export function validateProject(p: Project): string[] {
  const errors: string[] = [];
  if (!p.id) errors.push('project.id is required');
  if (!p.buildings.length) errors.push('project must have at least one building');
  if (!p.buildings.some((b) => b.id === p.subjectBuildingId)) {
    errors.push(`subjectBuildingId "${p.subjectBuildingId}" matches no building`);
  }
  for (const b of p.buildings) {
    if (b.footprint.length < 3) errors.push(`building ${b.id}: footprint needs >= 3 points`);
    if (b.height <= 0) errors.push(`building ${b.id}: height must be positive`);
    if (b.unitGrid && (b.unitGrid.rows < 1 || b.unitGrid.cols < 1)) {
      errors.push(`building ${b.id}: unitGrid rows/cols must be >= 1`);
    }
  }
  return errors;
}

export function serializeProject(p: Project): string {
  return JSON.stringify(p);
}

export function deserializeProject(json: string): Project {
  return JSON.parse(json) as Project;
}
