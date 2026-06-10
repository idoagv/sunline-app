import type { Polygon } from '../solar/geometry';

export type UnitSystem = 'metric' | 'imperial';
export type Facade = 'N' | 'E' | 'S' | 'W';
export type BuildingSource = 'auto' | 'manual' | 'authored';
export type UnitPosition = 'corner' | 'edge' | 'interior';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Building {
  id: string;
  source: BuildingSource;
  footprint: Polygon;
  base: number;
  height: number;
  floors?: number;
  floorHeight?: number;
  unitGrid?: { rows: number; cols: number };
  unitLabels?: Record<string, string>;
}

export interface Project {
  id: string;
  name: string;
  latitudeDeg: number;
  location?: LatLon;
  displayUnits: UnitSystem;
  buildings: Building[];
  subjectBuildingId: string;
}

export interface Unit {
  buildingId: string;
  floor: number;
  row: number;
  col: number;
  label?: string;
  facades: Facade[];
  position: UnitPosition;
}
