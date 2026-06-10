# Apricity Phase 0 — Foundations Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tested, framework-agnostic solar engine and scene data model (per-floor, height-aware sun computation with neighbour + self shadowing), and port the 3 existing towers onto it — with no new UI.

**Architecture:** Two pure-TypeScript packages under `src/engine/`: `solar` (sun position + 2.5D shadowing + sun-hours + score) and `scene` (project/building/unit data model + grid→facade derivation + validation). The engine has zero React/Next imports so Vitest runs it directly. The existing `src/utils/*.js` and `src/app/page.js` stay untouched and working; Phase 1 will rebuild the UI on this engine.

**Tech Stack:** TypeScript, Vitest (test runner), Next.js 16 project (engine is framework-independent). All geometry in SI: plan coordinates `x = East (m)`, `y = North (m)`, `z = up (m)`; azimuth in degrees clockwise from North.

> **Conventions used throughout this plan**
> - All paths are relative to `sunline-app/` (the git repo). Run all commands from `sunline-app/`.
> - **Branch first:** before Task 1, run `git checkout -b phase0-engine`.
> - Coordinate system: `Vec2 = [x, y]` with `x` East, `y` North. Azimuth 0=N, 90=E, 180=S, 270=W. `sunDirection(az) = [sin(az), cos(az)]` (horizontal unit vector pointing toward the sun).
> - Grid orientation: row 0 = North edge, last row = South edge; col 0 = West edge, last col = East edge.
> - **Next.js 16 note:** per `sunline-app/AGENTS.md`, this Next version has breaking changes — but Phase 0 writes no Next runtime code, only plain `.ts` modules run by Vitest. Consult `node_modules/next/dist/docs/` only if a tooling step interacts with Next config.

---

### Task 1: Tooling — add TypeScript + Vitest

**Files:**
- Create: `vitest.config.mjs`
- Create: `tsconfig.json`
- Modify: `package.json` (add devDeps + scripts)
- Create: `src/engine/smoke.test.ts` (temporary, deleted at end of task)

- [ ] **Step 1: Install dev dependencies**

Run: `npm install -D vitest typescript @types/node`
Expected: installs succeed; `package.json` devDependencies now include `vitest`, `typescript`, `@types/node`.

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

(If `next dev` later regenerates parts of this file, that is expected and fine.)

- [ ] **Step 3: Create `vitest.config.mjs`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Add scripts to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Write a smoke test to prove the runner works**

Create `src/engine/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs typescript tests', () => {
    const x: number = 2 + 2;
    expect(x).toBe(4);
  });
});
```

- [ ] **Step 6: Run the smoke test**

Run: `npm run test:run`
Expected: PASS — 1 test passed.

- [ ] **Step 7: Delete the smoke test and commit**

```bash
rm src/engine/smoke.test.ts
git add package.json package-lock.json tsconfig.json vitest.config.mjs
git commit -m "chore: add typescript and vitest tooling"
```

---

### Task 2: Geometry primitives

**Files:**
- Create: `src/engine/solar/geometry.ts`
- Test: `src/engine/solar/geometry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/solar/geometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { add, sub, dot, rayPolygonDistance, pointInPolygon, type Vec2, type Polygon } from './geometry';

const square: Polygon = [[0, 0], [2, 0], [2, 2], [0, 2]];

describe('vector helpers', () => {
  it('add scales the vector', () => {
    expect(add([1, 1], [2, 0], 3)).toEqual([7, 1]);
  });
  it('sub subtracts', () => {
    expect(sub([5, 3], [2, 1])).toEqual([3, 2]);
  });
  it('dot products', () => {
    expect(dot([1, 0], [0, 1])).toBe(0);
    expect(dot([2, 3], [4, 5])).toBe(23);
  });
});

describe('rayPolygonDistance', () => {
  it('returns distance to the near edge when the ray hits', () => {
    const d = rayPolygonDistance([1, -1], [0, 1], square);
    expect(d).toBeCloseTo(1, 6);
  });
  it('returns Infinity when the ray misses', () => {
    const d = rayPolygonDistance([5, -1], [0, 1], square);
    expect(d).toBe(Infinity);
  });
});

describe('pointInPolygon', () => {
  it('detects inside and outside', () => {
    expect(pointInPolygon([1, 1], square)).toBe(true);
    expect(pointInPolygon([3, 3], square)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- geometry`
Expected: FAIL — cannot find module `./geometry`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/solar/geometry.ts`:

```ts
export type Vec2 = readonly [number, number];
export type Polygon = readonly Vec2[];

export function add(p: Vec2, v: Vec2, s = 1): Vec2 {
  return [p[0] + v[0] * s, p[1] + v[1] * s];
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}

export function dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1];
}

export function rayPolygonDistance(p: Vec2, dir: Vec2, poly: Polygon): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const det = ex * dir[1] - dir[0] * ey;
    if (Math.abs(det) < 1e-9) continue;
    const px = a[0] - p[0];
    const py = a[1] - p[1];
    const t = (-ey * px + ex * py) / det;
    const u = (dir[0] * py - dir[1] * px) / det;
    if (t > 1e-6 && u >= 0 && u <= 1 && t < best) best = t;
  }
  return best;
}

export function pointInPolygon(p: Vec2, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect = (yi > p[1]) !== (yj > p[1]) &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- geometry`
Expected: PASS — all geometry tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/solar/geometry.ts src/engine/solar/geometry.test.ts
git commit -m "feat(engine): geometry primitives with ray-polygon intersection"
```

---

### Task 3: Sun position and day window

**Files:**
- Create: `src/engine/solar/sunPosition.ts`
- Test: `src/engine/solar/sunPosition.test.ts`

These tests use closed-form reference values: at solar noon, elevation = `90 - |lat - decl|` and azimuth = 180 (sun due south in the northern hemisphere). At the equinox (decl 0), sunrise is 06:00 due east (az 90) and sunset 18:00 due west (az 270).

- [ ] **Step 1: Write the failing test**

Create `src/engine/solar/sunPosition.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- sunPosition`
Expected: FAIL — cannot find module `./sunPosition`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/solar/sunPosition.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- sunPosition`
Expected: PASS — all sun position tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/solar/sunPosition.ts src/engine/solar/sunPosition.test.ts
git commit -m "feat(engine): sun position and day window validated vs reference values"
```

---

### Task 4: Height-aware facade shadowing (the 2.5D core)

**Files:**
- Create: `src/engine/solar/shadowing.ts`
- Test: `src/engine/solar/shadowing.test.ts`

A facade sample is a point on a wall at a given height, with an outward normal. It is lit when the sun is up, in front of the facade, and the sun ray (rising `tan(elevation)` per metre travelled toward the sun) clears the top of every obstacle it would otherwise pass through. Higher samples (upper floors) clear obstacles a lower sample cannot — this is the per-floor behaviour.

- [ ] **Step 1: Write the failing test**

Create `src/engine/solar/shadowing.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sunDirection, isFacadeLit, type Obstacle, type FacadeSample } from './shadowing';
import type { Polygon } from './geometry';

const southNormal: [number, number] = [0, -1];

describe('sunDirection', () => {
  it('points east at azimuth 90 and north at azimuth 0', () => {
    const e = sunDirection(90);
    expect(e[0]).toBeCloseTo(1, 6);
    expect(e[1]).toBeCloseTo(0, 6);
    const n = sunDirection(0);
    expect(n[0]).toBeCloseTo(0, 6);
    expect(n[1]).toBeCloseTo(1, 6);
  });
});

describe('isFacadeLit', () => {
  const sample: FacadeSample = { point: [0, 0], height: 0, normal: southNormal };

  it('is lit when the sun faces the wall and nothing blocks it', () => {
    const lit = isFacadeLit({ ...sample, height: 10 }, { azimuth: 180, elevation: 40 }, []);
    expect(lit).toBe(true);
  });

  it('is dark when the sun is behind the wall', () => {
    const lit = isFacadeLit(sample, { azimuth: 0, elevation: 40 }, []);
    expect(lit).toBe(false);
  });

  it('is dark below the horizon', () => {
    const lit = isFacadeLit(sample, { azimuth: 180, elevation: -1 }, []);
    expect(lit).toBe(false);
  });

  it('blocks a low sample but lets a high sample clear the same obstacle', () => {
    const wall: Polygon = [[-5, -12], [5, -12], [5, -8], [-5, -8]];
    const obstacle: Obstacle = { footprint: wall, base: 0, top: 30 };
    const sun = { azimuth: 180, elevation: 20 };
    expect(isFacadeLit({ ...sample, height: 0 }, sun, [obstacle])).toBe(false);
    expect(isFacadeLit({ ...sample, height: 35 }, sun, [obstacle])).toBe(true);
  });

  it('does not falsely self-block on its own convex footprint', () => {
    const own: Polygon = [[-10, 0], [10, 0], [10, 20], [-10, 20]];
    const self: Obstacle = { footprint: own, base: 0, top: 60 };
    const onSouthWall: FacadeSample = { point: [0, 0], height: 15, normal: southNormal };
    expect(isFacadeLit(onSouthWall, { azimuth: 180, elevation: 40 }, [self])).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- shadowing`
Expected: FAIL — cannot find module `./shadowing`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/solar/shadowing.ts`:

```ts
import { add, dot, rayPolygonDistance, type Vec2, type Polygon } from './geometry';
import type { SunPosition } from './sunPosition';

const DEG = Math.PI / 180;
const MIN_ELEV = 0.5;
const FRONT_EPS = 0.03;
const WALL_OFFSET = 0.05;

export interface Obstacle {
  footprint: Polygon;
  base: number;
  top: number;
}

export interface FacadeSample {
  point: Vec2;
  height: number;
  normal: Vec2;
}

export function sunDirection(azimuthDeg: number): Vec2 {
  const r = azimuthDeg * DEG;
  return [Math.sin(r), Math.cos(r)];
}

export function isFacadeLit(sample: FacadeSample, sun: SunPosition, obstacles: Obstacle[]): boolean {
  if (sun.elevation <= MIN_ELEV) return false;
  const dir = sunDirection(sun.azimuth);
  if (dot(dir, sample.normal) <= FRONT_EPS) return false;
  const tanE = Math.tan(sun.elevation * DEG);
  const origin = add(sample.point, sample.normal, WALL_OFFSET);
  for (const ob of obstacles) {
    const d = rayPolygonDistance(origin, dir, ob.footprint);
    if (!isFinite(d) || d <= WALL_OFFSET) continue;
    const rayHeight = sample.height + d * tanE;
    if (rayHeight < ob.top && rayHeight >= ob.base) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- shadowing`
Expected: PASS — all shadowing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/solar/shadowing.ts src/engine/solar/shadowing.test.ts
git commit -m "feat(engine): height-aware facade shadowing with neighbour and self occlusion"
```

---

### Task 5: Sun-hours and Sun Score

**Files:**
- Create: `src/engine/solar/sunHours.ts`
- Test: `src/engine/solar/sunHours.test.ts`

A unit is lit at an instant if any of its facade samples is lit. Sun-hours integrate lit time across the day, split at solar noon. Sun Score is a documented 0–100 normalisation (tunable — see spec §11).

- [ ] **Step 1: Write the failing test**

Create `src/engine/solar/sunHours.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sunHoursForUnit, sunScore } from './sunHours';
import { dayWindow } from './sunPosition';
import type { FacadeSample } from './shadowing';

const LAT = 32;
const south: FacadeSample = { point: [0, 0], height: 30, normal: [0, -1] };
const north: FacadeSample = { point: [0, 20], height: 30, normal: [0, 1] };

describe('sunHoursForUnit', () => {
  it('gives a south wall more sun than a north wall in winter', () => {
    const day = dayWindow(LAT, -23.45);
    const s = sunHoursForUnit([south], day, LAT, -23.45, []);
    const n = sunHoursForUnit([north], day, LAT, -23.45, []);
    expect(s.total).toBeGreaterThan(n.total);
  });

  it('splits morning and afternoon that sum to the total', () => {
    const day = dayWindow(LAT, 0);
    const r = sunHoursForUnit([south], day, LAT, 0, []);
    expect(r.morning + r.afternoon).toBeCloseTo(r.total, 6);
  });

  it('a south wall gets symmetric morning and afternoon at the equinox', () => {
    const day = dayWindow(LAT, 0);
    const r = sunHoursForUnit([south], day, LAT, 0, []);
    expect(r.morning).toBeCloseTo(r.afternoon, 1);
  });
});

describe('sunScore', () => {
  it('is 0 for no sun and capped at 100', () => {
    const day = dayWindow(LAT, 0);
    expect(sunScore(0, day)).toBe(0);
    expect(sunScore(100, day)).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- sunHours`
Expected: FAIL — cannot find module `./sunHours`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/solar/sunHours.ts`:

```ts
import { sunPosition, type DayWindow } from './sunPosition';
import { isFacadeLit, type FacadeSample, type Obstacle } from './shadowing';

export interface SunHours {
  total: number;
  morning: number;
  afternoon: number;
}

export function unitLitAt(samples: FacadeSample[], solarHour: number, latitudeDeg: number, declinationDeg: number, obstacles: Obstacle[]): boolean {
  const sun = sunPosition(solarHour, latitudeDeg, declinationDeg);
  return samples.some((s) => isFacadeLit(s, sun, obstacles));
}

export function sunHoursForUnit(
  samples: FacadeSample[],
  day: DayWindow,
  latitudeDeg: number,
  declinationDeg: number,
  obstacles: Obstacle[],
  steps = 240,
): SunHours {
  const dt = (day.sunset - day.sunrise) / steps;
  let total = 0;
  let morning = 0;
  let afternoon = 0;
  for (let i = 0; i < steps; i++) {
    const t = day.sunrise + (i + 0.5) * dt;
    if (unitLitAt(samples, t, latitudeDeg, declinationDeg, obstacles)) {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- sunHours`
Expected: PASS — all sun-hours tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/solar/sunHours.ts src/engine/solar/sunHours.test.ts
git commit -m "feat(engine): sun-hours integration and sun score"
```

---

### Task 6: Scene types and grid→unit derivation

**Files:**
- Create: `src/engine/scene/types.ts`
- Create: `src/engine/scene/deriveUnits.ts`
- Test: `src/engine/scene/deriveUnits.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/scene/deriveUnits.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveFacades, classifyPosition, unitsForBuilding, facadeSamplesForUnit } from './deriveUnits';
import type { Building } from './types';

const building: Building = {
  id: 'B1',
  source: 'authored',
  footprint: [[0, 0], [30, 0], [30, 30], [0, 30]],
  base: 0,
  height: 30,
  floors: 10,
  floorHeight: 3,
  unitGrid: { rows: 2, cols: 3 },
};

describe('deriveFacades', () => {
  it('north-west corner has two facades', () => {
    expect(deriveFacades(0, 0, 2, 3).sort()).toEqual(['N', 'W']);
  });
  it('north-middle is a single-facade edge', () => {
    expect(deriveFacades(0, 1, 2, 3)).toEqual(['N']);
  });
  it('a true interior cell has no facades', () => {
    expect(deriveFacades(1, 1, 3, 3)).toEqual([]);
  });
});

describe('classifyPosition', () => {
  it('classifies by facade count', () => {
    expect(classifyPosition(['N', 'W'])).toBe('corner');
    expect(classifyPosition(['N'])).toBe('edge');
    expect(classifyPosition([])).toBe('interior');
  });
});

describe('unitsForBuilding', () => {
  it('produces floors x rows x cols units', () => {
    const units = unitsForBuilding(building);
    expect(units.length).toBe(10 * 2 * 3);
    expect(units.every((u) => u.floor >= 1 && u.floor <= 10)).toBe(true);
  });
});

describe('facadeSamplesForUnit', () => {
  it('places samples on the correct edges at the unit height', () => {
    const units = unitsForBuilding(building);
    const nwGround = units.find((u) => u.floor === 1 && u.row === 0 && u.col === 0)!;
    const samples = facadeSamplesForUnit(building, nwGround);
    expect(samples.length).toBe(2);
    const heights = samples.map((s) => s.height);
    expect(heights.every((h) => Math.abs(h - 1.5) < 1e-9)).toBe(true);
    const north = samples.find((s) => s.normal[1] === 1)!;
    expect(north.point[1]).toBeCloseTo(30, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- deriveUnits`
Expected: FAIL — cannot find module `./deriveUnits`.

- [ ] **Step 3: Write the types module**

Create `src/engine/scene/types.ts`:

```ts
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
```

- [ ] **Step 4: Write the derivation module**

Create `src/engine/scene/deriveUnits.ts`:

```ts
import type { Vec2 } from '../solar/geometry';
import type { FacadeSample } from '../solar/shadowing';
import type { Building, Facade, Unit, UnitPosition } from './types';

const FACADE_NORMALS: Record<Facade, Vec2> = {
  N: [0, 1],
  E: [1, 0],
  S: [0, -1],
  W: [-1, 0],
};

export function deriveFacades(row: number, col: number, rows: number, cols: number): Facade[] {
  const f: Facade[] = [];
  if (row === 0) f.push('N');
  if (row === rows - 1) f.push('S');
  if (col === 0) f.push('W');
  if (col === cols - 1) f.push('E');
  return f;
}

export function classifyPosition(facades: Facade[]): UnitPosition {
  if (facades.length >= 2) return 'corner';
  if (facades.length === 1) return 'edge';
  return 'interior';
}

export function unitsForBuilding(b: Building): Unit[] {
  const floors = b.floors ?? 1;
  const grid = b.unitGrid ?? { rows: 1, cols: 1 };
  const units: Unit[] = [];
  for (let floor = 1; floor <= floors; floor++) {
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const facades = deriveFacades(row, col, grid.rows, grid.cols);
        units.push({
          buildingId: b.id,
          floor,
          row,
          col,
          label: b.unitLabels?.[`${row}-${col}`],
          facades,
          position: classifyPosition(facades),
        });
      }
    }
  }
  return units;
}

export function facadeSamplesForUnit(b: Building, unit: Unit): FacadeSample[] {
  const grid = b.unitGrid ?? { rows: 1, cols: 1 };
  const xs = b.footprint.map((p) => p[0]);
  const ys = b.footprint.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cellW = (maxX - minX) / grid.cols;
  const cellH = (maxY - minY) / grid.rows;
  const cx = minX + (unit.col + 0.5) * cellW;
  const cy = maxY - (unit.row + 0.5) * cellH;
  const floorHeight = b.floorHeight ?? b.height / (b.floors ?? 1);
  const height = b.base + (unit.floor - 0.5) * floorHeight;

  return unit.facades.map((f) => {
    let point: Vec2;
    if (f === 'N') point = [cx, maxY];
    else if (f === 'S') point = [cx, minY];
    else if (f === 'E') point = [maxX, cy];
    else point = [minX, cy];
    return { point, height, normal: FACADE_NORMALS[f] };
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- deriveUnits`
Expected: PASS — all derivation tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/engine/scene/types.ts src/engine/scene/deriveUnits.ts src/engine/scene/deriveUnits.test.ts
git commit -m "feat(engine): scene types and grid-to-unit facade derivation"
```

---

### Task 7: Scene validation and JSON round-trip

**Files:**
- Create: `src/engine/scene/validate.ts`
- Test: `src/engine/scene/validate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/scene/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateProject, serializeProject, deserializeProject } from './validate';
import type { Project } from './types';

const valid: Project = {
  id: 'P1',
  name: 'Test',
  latitudeDeg: 32,
  displayUnits: 'metric',
  subjectBuildingId: 'B1',
  buildings: [
    { id: 'B1', source: 'authored', footprint: [[0, 0], [10, 0], [10, 10], [0, 10]], base: 0, height: 30, floors: 10, floorHeight: 3, unitGrid: { rows: 2, cols: 2 } },
  ],
};

describe('validateProject', () => {
  it('accepts a valid project', () => {
    expect(validateProject(valid)).toEqual([]);
  });
  it('flags a missing subject building', () => {
    const bad = { ...valid, subjectBuildingId: 'NOPE' };
    expect(validateProject(bad).length).toBeGreaterThan(0);
  });
  it('flags a footprint with fewer than 3 points', () => {
    const bad: Project = { ...valid, buildings: [{ ...valid.buildings[0], footprint: [[0, 0], [1, 1]] }] };
    expect(validateProject(bad).length).toBeGreaterThan(0);
  });
});

describe('serialize round-trip', () => {
  it('survives serialize then deserialize', () => {
    const json = serializeProject(valid);
    const back = deserializeProject(json);
    expect(back).toEqual(valid);
    expect(validateProject(back)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- validate`
Expected: FAIL — cannot find module `./validate`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/scene/validate.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- validate`
Expected: PASS — all validation tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/scene/validate.ts src/engine/scene/validate.test.ts
git commit -m "feat(engine): scene validation and JSON serialization"
```

---

### Task 8: Project-level analysis API + engine barrel

**Files:**
- Create: `src/engine/analyze.ts`
- Create: `src/engine/index.ts`
- Test: `src/engine/analyze.test.ts`

`analyzeUnit` ties everything together: given a project, a building, and a grid cell + floor + declination, it returns the unit's facades, position, sun-hours, and score — using all OTHER buildings plus the subject building itself as obstacles (self-shadowing).

- [ ] **Step 1: Write the failing test**

Create `src/engine/analyze.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { analyzeUnit } from './analyze';
import type { Project } from './scene/types';

const project: Project = {
  id: 'P',
  name: 'Two towers',
  latitudeDeg: 32,
  displayUnits: 'metric',
  subjectBuildingId: 'A',
  buildings: [
    { id: 'A', source: 'authored', footprint: [[-15, -10], [15, -10], [15, 10], [-15, 10]], base: 0, height: 60, floors: 20, floorHeight: 3, unitGrid: { rows: 2, cols: 3 } },
    { id: 'B', source: 'authored', footprint: [[-15, -50], [15, -50], [15, -30], [-15, -30]], base: 0, height: 60, floors: 20, floorHeight: 3, unitGrid: { rows: 2, cols: 3 } },
  ],
};

const WINTER = -23.45;

describe('analyzeUnit', () => {
  it('gives an upper floor at least as much sun as a lower floor', () => {
    const low = analyzeUnit(project, 'A', { floor: 2, row: 1, col: 1 }, WINTER);
    const high = analyzeUnit(project, 'A', { floor: 19, row: 1, col: 1 }, WINTER);
    expect(high.hours.total).toBeGreaterThanOrEqual(low.hours.total - 1e-6);
  });

  it('the southern neighbour B steals winter sun from low south units of A', () => {
    const lowSouth = analyzeUnit(project, 'A', { floor: 1, row: 1, col: 1 }, WINTER);
    const highSouth = analyzeUnit(project, 'A', { floor: 20, row: 1, col: 1 }, WINTER);
    expect(highSouth.hours.total).toBeGreaterThan(lowSouth.hours.total);
  });

  it('reports facades, position and a 0-100 score', () => {
    const r = analyzeUnit(project, 'A', { floor: 10, row: 0, col: 0 }, 0);
    expect(r.facades.sort()).toEqual(['N', 'W']);
    expect(r.position).toBe('corner');
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- analyze`
Expected: FAIL — cannot find module `./analyze`.

- [ ] **Step 3: Write the analysis module**

Create `src/engine/analyze.ts`:

```ts
import { dayWindow } from './solar/sunPosition';
import { sunHoursForUnit, sunScore, type SunHours } from './solar/sunHours';
import type { Obstacle } from './solar/shadowing';
import { deriveFacades, classifyPosition, facadeSamplesForUnit } from './scene/deriveUnits';
import type { Facade, Project, Unit, UnitPosition } from './scene/types';

export interface UnitRef {
  floor: number;
  row: number;
  col: number;
}

export interface UnitAnalysis {
  facades: Facade[];
  position: UnitPosition;
  hours: SunHours;
  score: number;
}

function obstaclesFor(project: Project): Obstacle[] {
  return project.buildings.map((b) => ({ footprint: b.footprint, base: b.base, top: b.base + b.height }));
}

export function analyzeUnit(project: Project, buildingId: string, ref: UnitRef, declinationDeg: number): UnitAnalysis {
  const building = project.buildings.find((b) => b.id === buildingId);
  if (!building) throw new Error(`building "${buildingId}" not found`);
  const grid = building.unitGrid ?? { rows: 1, cols: 1 };
  const facades = deriveFacades(ref.row, ref.col, grid.rows, grid.cols);
  const unit: Unit = {
    buildingId,
    floor: ref.floor,
    row: ref.row,
    col: ref.col,
    facades,
    position: classifyPosition(facades),
  };
  const samples = facadeSamplesForUnit(building, unit);
  const obstacles = obstaclesFor(project);
  const day = dayWindow(project.latitudeDeg, declinationDeg);
  const hours = samples.length
    ? sunHoursForUnit(samples, day, project.latitudeDeg, declinationDeg, obstacles)
    : { total: 0, morning: 0, afternoon: 0 };
  return { facades, position: unit.position, hours, score: sunScore(hours.total, day) };
}
```

- [ ] **Step 4: Write the barrel export**

Create `src/engine/index.ts`:

```ts
export * from './solar/geometry';
export * from './solar/sunPosition';
export * from './solar/shadowing';
export * from './solar/sunHours';
export * from './scene/types';
export * from './scene/deriveUnits';
export * from './scene/validate';
export * from './analyze';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- analyze`
Expected: PASS — all analysis tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/engine/analyze.ts src/engine/index.ts src/engine/analyze.test.ts
git commit -m "feat(engine): project-level unit analysis API and barrel export"
```

---

### Task 9: Port the three towers into the scene model

**Files:**
- Create: `src/engine/data/parkviewTowers.ts`
- Test: `src/engine/data/parkviewTowers.test.ts`

Real surveyed dimensions are not yet known; these are explicit placeholder real-world figures (three 30 m × 20 m towers, 20 floors at 3 m, in a 60 m-spaced row along the East axis, latitude 32). Tower 1 (west) is the subject; Towers 2 and 3 are its eastern neighbours. Replace with surveyed values when available.

- [ ] **Step 1: Write the failing test**

Create `src/engine/data/parkviewTowers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parkviewTowers } from './parkviewTowers';
import { validateProject } from '../scene/validate';
import { analyzeUnit } from '../analyze';

const SUMMER = 23.45;
const WINTER = -23.45;

describe('parkviewTowers data', () => {
  it('is a valid project', () => {
    expect(validateProject(parkviewTowers)).toEqual([]);
  });

  it('south units get more sun in summer than in winter', () => {
    const summer = analyzeUnit(parkviewTowers, 'tower-1', { floor: 10, row: 1, col: 1 }, SUMMER);
    const winter = analyzeUnit(parkviewTowers, 'tower-1', { floor: 10, row: 1, col: 1 }, WINTER);
    expect(summer.hours.total).toBeGreaterThan(winter.hours.total);
  });

  it('a sunny south corner beats a shaded low unit facing the neighbours', () => {
    const southCornerHigh = analyzeUnit(parkviewTowers, 'tower-1', { floor: 20, row: 1, col: 0 }, WINTER);
    const eastEdgeLow = analyzeUnit(parkviewTowers, 'tower-1', { floor: 1, row: 0, col: 2 }, WINTER);
    expect(southCornerHigh.hours.total).toBeGreaterThan(eastEdgeLow.hours.total);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- parkviewTowers`
Expected: FAIL — cannot find module `./parkviewTowers`.

- [ ] **Step 3: Write the data module**

Create `src/engine/data/parkviewTowers.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- parkviewTowers`
Expected: PASS — all tower data tests pass.

- [ ] **Step 5: Run the full suite**

Run: `npm run test:run`
Expected: PASS — every engine test (Tasks 2–9) passes.

- [ ] **Step 6: Commit**

```bash
git add src/engine/data/parkviewTowers.ts src/engine/data/parkviewTowers.test.ts
git commit -m "feat(engine): port the three towers onto the scene model with sanity tests"
```

---

## Self-Review (completed by plan author)

**Spec coverage (spec §5–§9):**
- §5 architecture (Next + TS + engine/UI split): Task 1 (TS/Vitest), all engine tasks are pure TS with no React import. ✔
- §6 data model (project → buildings[source] → floors → unit grid → derived facades; displayUnits): Task 6 (`types.ts`, `deriveUnits.ts`), Task 7 (validate/serialize). `displayUnits` is in `Project`; conversion is a UI concern (Phase 1), correctly absent from the engine. ✔
- §7 solar engine (position validated vs reference; per-facade + self-shadowing; sun-hours; score; SI internal): Tasks 3, 4, 5, 8. Self-shadowing = subject building included in obstacles (Task 8 `obstaclesFor`), with a no-false-self-block test (Task 4). ✔
- §9 phase 0 (engine + scene + refactor 3 towers; no new UI): Tasks 1–9; towers ported in Task 9; existing `src/utils/*.js` + `page.js` untouched. ✔

**Placeholder scan:** No TBD/TODO; every code step contains complete code; every test has concrete assertions. ✔

**Type consistency:** `Vec2`/`Polygon` (geometry) reused everywhere; `SunPosition`/`DayWindow` (sunPosition) consumed by shadowing/sunHours; `FacadeSample`/`Obstacle` (shadowing) consumed by sunHours/deriveUnits/analyze; `Building`/`Project`/`Unit`/`Facade`/`UnitPosition` (types) consumed by deriveUnits/validate/analyze. `deriveFacades`, `classifyPosition`, `facadeSamplesForUnit`, `sunHoursForUnit`, `sunScore`, `analyzeUnit` signatures are identical at definition and call sites. ✔

**Known approximations (intentional, documented):** grid cells are mapped onto the footprint bounding box (real articulated-footprint mapping is a later layer per spec §6); self-shadowing only triggers on concave footprints (towers are convex, so the mechanism is present but inert until real footprints arrive); tower dimensions are placeholders pending survey. ✔
