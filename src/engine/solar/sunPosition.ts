const DEG = Math.PI / 180;

export interface SunPosition {
  azimuth: number;
  elevation: number;
}

export interface DayWindow {
  sunrise: number;
  sunset: number;
}

export function sunPosition(solarHour: number, latitudeDeg: number, declinationDeg: number): SunPosition {
  const phi = latitudeDeg * DEG;
  const dec = declinationDeg * DEG;
  const H = (solarHour - 12) * 15 * DEG;
  let sinE = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  sinE = Math.max(-1, Math.min(1, sinE));
  const elevation = Math.asin(sinE) / DEG;
  const xEast = -Math.cos(dec) * Math.sin(H);
  const yNorth = Math.cos(phi) * Math.sin(dec) - Math.sin(phi) * Math.cos(dec) * Math.cos(H);
  let azimuth = Math.atan2(xEast, yNorth) / DEG;
  if (azimuth < 0) azimuth += 360;
  return { azimuth, elevation };
}

export function dayWindow(latitudeDeg: number, declinationDeg: number): DayWindow {
  const phi = latitudeDeg * DEG;
  const dec = declinationDeg * DEG;
  let c = -Math.tan(phi) * Math.tan(dec);
  c = Math.max(-1, Math.min(1, c));
  const H0 = Math.acos(c) / DEG / 15;
  return { sunrise: 12 - H0, sunset: 12 + H0 };
}

export function declinationForDate(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86400000);
  return 23.45 * Math.sin(((360 / 365) * (284 + day)) * DEG);
}
