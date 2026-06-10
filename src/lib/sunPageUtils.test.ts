import { describe, it, expect } from 'vitest';
import {
  declinationFromSeason,
  formatHours,
  formatDistance,
  hourToTimeLabel,
  compassDirection,
} from './sunPageUtils';

describe('declinationFromSeason', () => {
  it('returns −23.45 for winter', () => {
    expect(declinationFromSeason('winter')).toBe(-23.45);
  });
  it('returns 0 for equinox', () => {
    expect(declinationFromSeason('equinox')).toBe(0);
  });
  it('returns +23.45 for summer', () => {
    expect(declinationFromSeason('summer')).toBe(23.45);
  });
});

describe('formatHours', () => {
  it('formats 0 as "0.0 h"', () => {
    expect(formatHours(0)).toBe('0.0 h');
  });
  it('formats 7.5 as "7.5 h"', () => {
    expect(formatHours(7.5)).toBe('7.5 h');
  });
  it('rounds to one decimal', () => {
    expect(formatHours(3.14159)).toBe('3.1 h');
  });
});

describe('formatDistance', () => {
  it('formats meters in metric', () => {
    expect(formatDistance(30, 'metric')).toBe('30 m');
  });
  it('converts to feet in imperial', () => {
    expect(formatDistance(30, 'imperial')).toBe('98 ft');
  });
});

describe('hourToTimeLabel', () => {
  it('formats 6.0 as "06:00"', () => {
    expect(hourToTimeLabel(6)).toBe('06:00');
  });
  it('formats 14.5 as "14:30"', () => {
    expect(hourToTimeLabel(14.5)).toBe('14:30');
  });
  it('formats 23.75 as "23:45"', () => {
    expect(hourToTimeLabel(23.75)).toBe('23:45');
  });
});

describe('compassDirection', () => {
  it('maps cardinal azimuths to compass labels', () => {
    expect(compassDirection(0)).toBe('N');
    expect(compassDirection(90)).toBe('E');
    expect(compassDirection(180)).toBe('S');
    expect(compassDirection(270)).toBe('W');
  });
  it('rounds to the nearest 16-point heading and wraps 360 to N', () => {
    expect(compassDirection(45)).toBe('NE');
    expect(compassDirection(360)).toBe('N');
  });
});
