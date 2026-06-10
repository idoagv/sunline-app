export type Season = 'winter' | 'equinox' | 'summer';

export function declinationFromSeason(season: Season): number {
  if (season === 'winter') return -23.45;
  if (season === 'summer') return 23.45;
  return 0;
}

export function formatHours(h: number): string {
  return `${h.toFixed(1)} h`;
}

export function formatDistance(meters: number, system: 'metric' | 'imperial'): string {
  if (system === 'imperial') return `${Math.round(meters * 3.28084)} ft`;
  return `${Math.round(meters)} m`;
}

export function hourToTimeLabel(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const COMPASS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function compassDirection(azimuthDeg: number): string {
  const idx = Math.round(((azimuthDeg % 360) + 360) % 360 / 22.5) % 16;
  return COMPASS_16[idx];
}
