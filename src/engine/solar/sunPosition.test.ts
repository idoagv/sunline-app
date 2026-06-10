import { describe, it, expect } from 'vitest';
import { sunPosition, dayWindow, declinationForDate } from './sunPosition';

const LAT = 32;

describe('sunPosition at solar noon', () => {
  it('equinox: 58 deg elevation, due south', () => {
    const s = sunPosition(12, LAT, 0);
    expect(s.elevation).toBeCloseTo(58, 2);
    expect(s.azimuth).toBeCloseTo(180, 2);
  });
  it('summer solstice: ~81.45 deg elevation', () => {
    const s = sunPosition(12, LAT, 23.45);
    expect(s.elevation).toBeCloseTo(81.45, 2);
  });
  it('winter solstice: ~34.55 deg elevation', () => {
    const s = sunPosition(12, LAT, -23.45);
    expect(s.elevation).toBeCloseTo(34.55, 2);
  });
});

describe('sunPosition at the equinox horizon', () => {
  it('rises due east', () => {
    const s = sunPosition(6, LAT, 0);
    expect(s.elevation).toBeCloseTo(0, 2);
    expect(s.azimuth).toBeCloseTo(90, 2);
  });
  it('sets due west', () => {
    const s = sunPosition(18, LAT, 0);
    expect(s.azimuth).toBeCloseTo(270, 2);
  });
});

describe('dayWindow', () => {
  it('equinox is 06:00 to 18:00', () => {
    const d = dayWindow(LAT, 0);
    expect(d.sunrise).toBeCloseTo(6, 4);
    expect(d.sunset).toBeCloseTo(18, 4);
  });
  it('summer day is longer than winter day', () => {
    expect(dayWindow(LAT, 23.45).sunset - dayWindow(LAT, 23.45).sunrise)
      .toBeGreaterThan(dayWindow(LAT, -23.45).sunset - dayWindow(LAT, -23.45).sunrise);
  });
});

describe('declinationForDate', () => {
  it('is near zero at the spring equinox', () => {
    expect(declinationForDate(new Date(Date.UTC(2026, 2, 21)))).toBeCloseTo(0, 0);
  });
  it('is near +23.4 at the summer solstice', () => {
    expect(declinationForDate(new Date(Date.UTC(2026, 5, 21)))).toBeGreaterThan(23);
  });
  it('is near -23.4 at the winter solstice', () => {
    expect(declinationForDate(new Date(Date.UTC(2026, 11, 21)))).toBeLessThan(-23);
  });
});
