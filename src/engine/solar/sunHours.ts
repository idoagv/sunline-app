import { sunPosition, type DayWindow } from './sunPosition';
import { isFacadeLit, type FacadeSample, type Obstacle } from './shadowing';

export interface SunHours {
  total: number;
  morning: number;
  afternoon: number;
}

/**
 * `azimuthOffsetDeg` rotates the sun's azimuth relative to the (axis-aligned,
 * cardinal-facade) scene. It models orienting the buildings to their real-world
 * north: rotating the scene north by +θ on screen is equivalent to a fixed scene
 * lit by a sun at azimuth (A + θ). Defaults to 0 (no rotation).
 */
export function unitLitAt(
  samples: FacadeSample[],
  solarHour: number,
  latitudeDeg: number,
  declinationDeg: number,
  obstacles: Obstacle[],
  azimuthOffsetDeg = 0,
): boolean {
  const sun = sunPosition(solarHour, latitudeDeg, declinationDeg);
  const adjusted = azimuthOffsetDeg
    ? { ...sun, azimuth: sun.azimuth + azimuthOffsetDeg }
    : sun;
  return samples.some((s) => isFacadeLit(s, adjusted, obstacles));
}

export function sunHoursForUnit(
  samples: FacadeSample[],
  day: DayWindow,
  latitudeDeg: number,
  declinationDeg: number,
  obstacles: Obstacle[],
  steps = 240,
  azimuthOffsetDeg = 0,
): SunHours {
  const dt = (day.sunset - day.sunrise) / steps;
  let total = 0;
  let morning = 0;
  let afternoon = 0;
  for (let i = 0; i < steps; i++) {
    const t = day.sunrise + (i + 0.5) * dt;
    if (unitLitAt(samples, t, latitudeDeg, declinationDeg, obstacles, azimuthOffsetDeg)) {
      total += dt;
      if (t < 12) morning += dt;
      else afternoon += dt;
    }
  }
  return { total, morning, afternoon };
}

export function sunScore(hours: number, day: DayWindow): number {
  const daylight = day.sunset - day.sunrise;
  if (daylight <= 0) return 0;
  return Math.round(Math.min(100, Math.max(0, (hours / (daylight * 0.7)) * 100)));
}
