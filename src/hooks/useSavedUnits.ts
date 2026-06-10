'use client';
import { useState, useCallback, useEffect } from 'react';

export interface SavedUnit {
  label: string;
  floor: number;
  row: number;
  col: number;
}

export function loadSavedUnits(key: string): SavedUnit[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as SavedUnit[];
  } catch {
    return [];
  }
}

export function persistSavedUnits(key: string, units: SavedUnit[]): void {
  localStorage.setItem(key, JSON.stringify(units));
}

export function toggleSavedUnit(current: SavedUnit[], unit: SavedUnit): SavedUnit[] {
  const idx = current.findIndex(
    (u) => u.floor === unit.floor && u.row === unit.row && u.col === unit.col,
  );
  if (idx >= 0) return current.filter((_, i) => i !== idx);
  return [...current, unit];
}

export function useSavedUnits(projectId: string) {
  const key = `apricity-saved-${projectId}`;
  const [units, setUnits] = useState<SavedUnit[]>([]);

  useEffect(() => {
    setUnits(loadSavedUnits(key));
  }, [key]);

  const toggle = useCallback(
    (unit: SavedUnit) => {
      setUnits((prev) => {
        const next = toggleSavedUnit(prev, unit);
        persistSavedUnits(key, next);
        return next;
      });
    },
    [key],
  );

  const isSaved = useCallback(
    (floor: number, row: number, col: number) =>
      units.some((u) => u.floor === floor && u.row === row && u.col === col),
    [units],
  );

  return { units, toggle, isSaved };
}
