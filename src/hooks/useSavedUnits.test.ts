import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSavedUnits, persistSavedUnits, toggleSavedUnit } from './useSavedUnits';

const KEY = 'apricity-saved-test';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    store: {} as Record<string, string>,
    getItem(k: string) { return (this as Record<string, unknown> & { store: Record<string, string> }).store[k] ?? null; },
    setItem(k: string, v: string) { (this as Record<string, unknown> & { store: Record<string, string> }).store[k] = v; },
    removeItem(k: string) { delete (this as Record<string, unknown> & { store: Record<string, string> }).store[k]; },
  });
});

describe('loadSavedUnits', () => {
  it('returns empty array when nothing stored', () => {
    expect(loadSavedUnits(KEY)).toEqual([]);
  });
  it('returns parsed units when stored', () => {
    localStorage.setItem(KEY, JSON.stringify([{ label: '5S', floor: 1, row: 1, col: 1 }]));
    expect(loadSavedUnits(KEY)).toEqual([{ label: '5S', floor: 1, row: 1, col: 1 }]);
  });
});

describe('persistSavedUnits', () => {
  it('writes units to localStorage', () => {
    const units = [{ label: '5W', floor: 2, row: 1, col: 0 }];
    persistSavedUnits(KEY, units);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(units);
  });
});

describe('toggleSavedUnit', () => {
  it('adds a unit not already in the list', () => {
    const result = toggleSavedUnit([], { label: '5S', floor: 1, row: 1, col: 1 });
    expect(result).toEqual([{ label: '5S', floor: 1, row: 1, col: 1 }]);
  });
  it('removes a unit already in the list', () => {
    const existing = [{ label: '5S', floor: 1, row: 1, col: 1 }];
    const result = toggleSavedUnit(existing, { label: '5S', floor: 1, row: 1, col: 1 });
    expect(result).toEqual([]);
  });
  it('keeps other units when removing one', () => {
    const existing = [
      { label: '5S', floor: 1, row: 1, col: 1 },
      { label: '5W', floor: 1, row: 1, col: 0 },
    ];
    const result = toggleSavedUnit(existing, { label: '5S', floor: 1, row: 1, col: 1 });
    expect(result).toEqual([{ label: '5W', floor: 1, row: 1, col: 0 }]);
  });
});
