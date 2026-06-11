# Apricity Phase 1.5 — Scene View (top-down sun + shadows) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **STATUS — SHIPPED ✅ (updated 2026-06-11).** Phase 1.5 is complete and on `main`; the full suite is green (**73 Vitest tests**). This document was updated post-implementation to record what actually shipped, including refactors made *after* the original 3-task plan: **multi-select unit comparison**, a **3-column desktop layout**, a **draggable sun marker** (new `azimuthToHour` in the projection lib), and **"only selected tiles light up."** The original Task 1–3 steps below are preserved as the build record; see [**As-built changes**](#as-built-changes-post-plan-refactors) at the end for what diverged.

**Goal:** Restore the original prototype's "wow" moment — a top-down compass scene of the three towers with an animated sun arc, sweeping building shadows, and clickable per-unit tiles — on top of the new `src/engine`, wired into the existing Phase 1 Sun-Page.

**Architecture:** A pure projection/geometry lib (`src/lib/sceneProjection.ts`) maps engine **world metres** (x=East, y=North, azimuth clockwise from North) to **SVG screen space** (x=right, y=down, North=up), computes the sun ring, sun path, decorative shadow polygons, and (as-built) the inverse `azimuthToHour` for the draggable sun marker. A presentational `SceneView` SVG component consumes that lib plus the engine truth the Sun-Page already computes (`cellsLit`, `selected`, sun position, day window). `SunPage.tsx` computes the live sun position and (as-built) lays the UI out in **three columns** on desktop — controls + floor-plate grid + floor strip on the **left**, the `SceneView` dial + day-scrub in the **centre**, per-unit data tiles on the **right**. Units are **multi-select** for side-by-side comparison: `selected` is a `SelectedUnit[]`, toggled by `toggleUnit(row, col)` from either the grid or a scene tile. (The original plan mounted `SceneView` as a single-column hero with single-select; see As-built changes.)

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Vitest 4 (pure lib only; React verified visually via Claude-in-Chrome). Engine imports via `@/engine` barrel.

**Scope guardrails (do not drift):**
- IN: top-down dial, compass, animated sun marker + path, sunrise/sunset markers, sweeping shadows for all buildings, subject-building unit tiles (lit/shaded/selected), live sun-position readout line. *(As-built also added: multi-select of subject units for comparison, and a draggable sun marker.)*
- OUT: maps/OSM, footprint drawing, authoring, making neighbour-tower units selectable, multi-project. (All Phase 2.)
- The subject building (`project.subjectBuildingId`) is the only subdivided/clickable building, to reuse the existing `analyzeUnit` / `cellsLit` integration. Neighbour towers are solid shadow-casters + visual context.

**Key facts established from the codebase (do not re-derive):**
- Engine world frame: footprints in metres; `sunDirection(az) = [sin(az), cos(az)]` (toward the sun, x=East/y=North). Shadows fall in the **opposite** direction `[-sin(az), -cos(az)]`.
- `facadeSamplesForUnit` (`src/engine/scene/deriveUnits.ts:50`) defines the subject grid in world space: `cellW=(maxX-minX)/cols`, `cellH=(maxY-minY)/rows`; **row 0 = North (maxY)**, increasing row → South; **col 0 = West (minX)**, increasing col → East. The scene's cell polygons MUST match this so lit status lines up.
- `parkviewTowers` bounds: x ∈ [-75, 75], y ∈ [-10, 10]; subject = `tower-1` (x ∈ [-75, -45]); grid 2 rows × 3 cols.
- SunPage already computes `cellsLit: (boolean|null)[][]` for the subject building, plus `selected`, `day`, `decl`. Reuse them.

---

## File Structure

- **Create** `src/lib/sceneProjection.ts` — pure world→screen projection, ring projection, convex hull, shadow-polygon sweep, sun-path sampling, cell-corner geometry.
- **Create** `src/lib/sceneProjection.test.ts` — Vitest unit tests for the above.
- **Modify** `src/lib/sunPageUtils.ts` — add `compassDirection(az)` display helper.
- **Modify** `src/lib/sunPageUtils.test.ts` — tests for `compassDirection`.
- **Create** `src/components/sun-page/SceneView.tsx` — the SVG scene (presentational, dark-theme).
- **Modify** `src/components/sun-page/SunPage.tsx` — compute live sun position, mount `SceneView`, add sun-position readout line.

---

### Task 1: Scene projection + geometry lib

**Files:**
- Create: `src/lib/sceneProjection.ts`
- Test: `src/lib/sceneProjection.test.ts`
- Modify: `src/lib/sunPageUtils.ts`
- Test: `src/lib/sunPageUtils.test.ts`

- [ ] **Step 1: Write the failing tests for the projection lib**

Create `src/lib/sceneProjection.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  sceneBounds, makeProjection, ringPoint, convexHull, shadowPolygon, cellCornersWorld,
} from './sceneProjection';
import { parkviewTowers } from '@/engine/data/parkviewTowers';

describe('sceneBounds', () => {
  it('computes the bounding box of all footprints', () => {
    const b = sceneBounds(parkviewTowers.buildings);
    expect(b).toEqual({ minX: -75, maxX: 75, minY: -10, maxY: 10 });
  });
});

describe('makeProjection', () => {
  const proj = makeProjection({ minX: -75, maxX: 75, minY: -10, maxY: 10 }, { cx: 340, cy: 290, fitRadius: 150 });

  it('maps the world centre to the screen centre', () => {
    expect(proj.toScreen([0, 0])).toEqual([340, 290]);
  });

  it('maps North (+y world) to up (smaller screen y)', () => {
    const [, sy] = proj.toScreen([0, 10]);
    expect(sy).toBeLessThan(290);
  });

  it('maps East (+x world) to the right (larger screen x)', () => {
    const [sx] = proj.toScreen([75, 0]);
    expect(sx).toBeGreaterThan(340);
  });

  it('uses px-per-metre scale that fits the larger span into fitRadius*2', () => {
    expect(proj.scale).toBeCloseTo(2, 5); // span 150m -> 300px
  });
});

describe('ringPoint', () => {
  it('places azimuth 0 (North) straight up', () => {
    const [x, y] = ringPoint(0, 205, [340, 290]);
    expect(x).toBeCloseTo(340, 5);
    expect(y).toBeCloseTo(85, 5);
  });
  it('places azimuth 90 (East) to the right', () => {
    const [x, y] = ringPoint(90, 205, [340, 290]);
    expect(x).toBeCloseTo(545, 5);
    expect(y).toBeCloseTo(290, 5);
  });
});

describe('convexHull', () => {
  it('returns the 4 corners of a square (ignores interior points)', () => {
    const hull = convexHull([[0, 0], [2, 0], [2, 2], [0, 2], [1, 1]]);
    expect(hull).toHaveLength(4);
  });
});

describe('shadowPolygon', () => {
  const square = [[-10, -10], [10, -10], [10, 10], [-10, 10]] as const;

  it('returns null when the sun is at/below the horizon', () => {
    expect(shadowPolygon(square, 180, 0, 60)).toBeNull();
  });

  it('casts the shadow opposite the sun (sun in South -> shadow extends North)', () => {
    const hull = shadowPolygon(square, 180, 45, 60)!; // tanE=1, L=60, dir=[0,+60]
    const maxY = Math.max(...hull.map((p) => p[1]));
    expect(maxY).toBeGreaterThan(10);
  });
});

describe('cellCornersWorld', () => {
  it('row 0 col 0 of the subject tower is the North-West cell', () => {
    const subject = parkviewTowers.buildings.find((b) => b.id === 'tower-1')!;
    const corners = cellCornersWorld(subject, 0, 0); // footprint x[-75,-45] y[-10,10], 2x3 grid
    // NW cell: x[-75,-65], y[0,10]
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    expect(Math.min(...xs)).toBeCloseTo(-75, 5);
    expect(Math.max(...xs)).toBeCloseTo(-65, 5);
    expect(Math.min(...ys)).toBeCloseTo(0, 5);
    expect(Math.max(...ys)).toBeCloseTo(10, 5);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- sceneProjection`
Expected: FAIL — `Cannot find module './sceneProjection'`.

- [ ] **Step 3: Implement the projection lib**

Create `src/lib/sceneProjection.ts`:

```ts
import type { Vec2, Polygon } from '@/engine/solar/geometry';
import type { Building } from '@/engine/scene/types';
import { sunPosition, type DayWindow } from '@/engine';

const DEG = Math.PI / 180;

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function sceneBounds(buildings: { footprint: Polygon }[]): Bounds {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const b of buildings) {
    for (const [x, y] of b.footprint) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

export interface Projection {
  toScreen: (p: Vec2) => Vec2;
  center: Vec2;
  scale: number;
}

export function makeProjection(
  bounds: Bounds,
  opts: { cx: number; cy: number; fitRadius: number },
): Projection {
  const worldCX = (bounds.minX + bounds.maxX) / 2;
  const worldCY = (bounds.minY + bounds.maxY) / 2;
  const spanX = Math.max(1e-6, bounds.maxX - bounds.minX);
  const spanY = Math.max(1e-6, bounds.maxY - bounds.minY);
  const scale = (opts.fitRadius * 2) / Math.max(spanX, spanY);
  const toScreen = ([x, y]: Vec2): Vec2 => [
    opts.cx + (x - worldCX) * scale,
    opts.cy - (y - worldCY) * scale, // flip Y so world North (+y) points up
  ];
  return { toScreen, center: [opts.cx, opts.cy], scale };
}

export function ringPoint(azimuthDeg: number, radius: number, center: Vec2): Vec2 {
  const r = azimuthDeg * DEG;
  return [center[0] + radius * Math.sin(r), center[1] - radius * Math.cos(r)];
}

export function convexHull(points: Vec2[]): Vec2[] {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Vec2, a: Vec2, b: Vec2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function shadowPolygon(
  footprint: Polygon,
  azimuthDeg: number,
  elevationDeg: number,
  height: number,
  opts: { maxLength?: number } = {},
): Vec2[] | null {
  if (elevationDeg <= 0.5) return null;
  const tanE = Math.tan(elevationDeg * DEG);
  const L = Math.min(height / tanE, opts.maxLength ?? 300);
  const dx = -Math.sin(azimuthDeg * DEG) * L; // opposite the sun
  const dy = -Math.cos(azimuthDeg * DEG) * L;
  const swept: Vec2[] = [];
  for (const [x, y] of footprint) {
    swept.push([x, y]);
    swept.push([x + dx, y + dy]);
  }
  return convexHull(swept);
}

export function sunPathScreenPoints(
  day: DayWindow,
  latitudeDeg: number,
  declinationDeg: number,
  radius: number,
  center: Vec2,
  samples = 64,
): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = day.sunrise + (day.sunset - day.sunrise) * (i / samples);
    const s = sunPosition(t, latitudeDeg, declinationDeg);
    out.push(ringPoint(s.azimuth, radius, center));
  }
  return out;
}

export function cellCornersWorld(
  building: Building,
  row: number,
  col: number,
): [Vec2, Vec2, Vec2, Vec2] {
  const grid = building.unitGrid ?? { rows: 1, cols: 1 };
  const xs = building.footprint.map((p) => p[0]);
  const ys = building.footprint.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cellW = (maxX - minX) / grid.cols;
  const cellH = (maxY - minY) / grid.rows;
  const x0 = minX + col * cellW;
  const x1 = x0 + cellW;
  const yTop = maxY - row * cellH; // row 0 = North, matches facadeSamplesForUnit
  const yBot = yTop - cellH;
  return [
    [x0, yTop],
    [x1, yTop],
    [x1, yBot],
    [x0, yBot],
  ];
}
```

- [ ] **Step 4: Run the projection tests to verify they pass**

Run: `npm run test:run -- sceneProjection`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Write the failing test for `compassDirection`**

Add to `src/lib/sunPageUtils.test.ts` (new describe block, keep existing tests):

```ts
import { compassDirection } from './sunPageUtils';

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
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm run test:run -- sunPageUtils`
Expected: FAIL — `compassDirection is not a function` / not exported.

- [ ] **Step 7: Implement `compassDirection`**

Add to `src/lib/sunPageUtils.ts`:

```ts
const COMPASS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function compassDirection(azimuthDeg: number): string {
  const idx = Math.round(((azimuthDeg % 360) + 360) % 360 / 22.5) % 16;
  return COMPASS_16[idx];
}
```

- [ ] **Step 8: Run the full suite to verify everything passes**

Run: `npm run test:run`
Expected: PASS — previous 60 tests + the new projection (~11) and compass (2) tests, all green.

- [ ] **Step 9: Commit**

```bash
git add src/lib/sceneProjection.ts src/lib/sceneProjection.test.ts src/lib/sunPageUtils.ts src/lib/sunPageUtils.test.ts
git commit -m "feat(sun-page): scene projection + geometry lib for top-down view"
```

---

### Task 2: SceneView SVG component

**Files:**
- Create: `src/components/sun-page/SceneView.tsx`

This component is presentational and verified visually in Task 3 (no unit test — matches the project convention that React components are verified visually, pure logic is unit-tested).

- [ ] **Step 1: Create the SceneView component**

Create `src/components/sun-page/SceneView.tsx`:

```tsx
'use client';
import { useMemo } from 'react';
import type { Project } from '@/engine/scene/types';
import type { Vec2 } from '@/engine/solar/geometry';
import { sunPosition, type SunPosition, type DayWindow } from '@/engine';
import {
  sceneBounds,
  makeProjection,
  ringPoint,
  shadowPolygon,
  sunPathScreenPoints,
  cellCornersWorld,
} from '@/lib/sceneProjection';
import { hourToTimeLabel } from '@/lib/sunPageUtils';

const VB_W = 680;
const VB_H = 580;
const CX = 340;
const CY = 290;
const DIAL_R = 230;
const RING_R = 205; // sun marker + path ring
const FIT_R = 150; // footprints fit inside this radius
const LABEL_R = 226; // sunrise/sunset clock labels

interface Props {
  project: Project;
  subjectBuildingId: string;
  cellsLit: (boolean | null)[][];
  selected: { row: number; col: number } | null;
  onSelect: (row: number, col: number) => void;
  sun: SunPosition;
  day: DayWindow;
  latitudeDeg: number;
  declinationDeg: number;
}

const attr = (ps: Vec2[]) => ps.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

export default function SceneView({
  project,
  subjectBuildingId,
  cellsLit,
  selected,
  onSelect,
  sun,
  day,
  latitudeDeg,
  declinationDeg,
}: Props) {
  const proj = useMemo(
    () => makeProjection(sceneBounds(project.buildings), { cx: CX, cy: CY, fitRadius: FIT_R }),
    [project],
  );

  const subject = project.buildings.find((b) => b.id === subjectBuildingId)!;
  const grid = subject.unitGrid ?? { rows: 1, cols: 1 };

  const sunPath = useMemo(
    () => sunPathScreenPoints(day, latitudeDeg, declinationDeg, RING_R, [CX, CY]),
    [day, latitudeDeg, declinationDeg],
  );

  const shadows = useMemo(
    () =>
      project.buildings.map((b) => {
        const poly = shadowPolygon(b.footprint, sun.azimuth, sun.elevation, b.base + b.height);
        return poly ? attr(poly.map(proj.toScreen)) : null;
      }),
    [project, sun.azimuth, sun.elevation, proj],
  );

  // Building footprints in screen space
  const blocks = useMemo(
    () => project.buildings.map((b) => ({ id: b.id, points: attr(b.footprint.map(proj.toScreen)) })),
    [project, proj],
  );

  // Sun marker + ray
  const sunPt = ringPoint(sun.azimuth, RING_R, [CX, CY]);
  const hot = Math.max(0, Math.min(1, sun.elevation / 60));
  const sunColor = `rgb(${Math.round(245 + (255 - 245) * hot)},${Math.round(158 + (216 - 158) * hot)},${Math.round(11 + (77 - 11) * hot)})`;

  // Sunrise / sunset markers
  const riseAz = sunPosition(day.sunrise + 0.01, latitudeDeg, declinationDeg).azimuth;
  const setAz = sunPosition(day.sunset - 0.01, latitudeDeg, declinationDeg).azimuth;
  const riseDot = ringPoint(riseAz, RING_R, [CX, CY]);
  const setDot = ringPoint(setAz, RING_R, [CX, CY]);
  const riseLabel = ringPoint(riseAz, LABEL_R, [CX, CY]);
  const setLabel = ringPoint(setAz, LABEL_R, [CX, CY]);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="max-w-full"
      role="img"
      aria-label="Top-down sun and shadow diagram"
    >
      <defs>
        <clipPath id="scene-dial-clip">
          <circle cx={CX} cy={CY} r={DIAL_R} />
        </clipPath>
      </defs>

      {/* Dial */}
      <circle cx={CX} cy={CY} r={DIAL_R} fill="#172033" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={RING_R} fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="0.5" strokeDasharray="3 5" />

      {/* Compass ticks + labels */}
      <line x1={CX} y1={CY - DIAL_R} x2={CX} y2={CY - DIAL_R + 14} stroke="rgba(148,163,184,0.4)" />
      <line x1={CX} y1={CY + DIAL_R} x2={CX} y2={CY + DIAL_R - 14} stroke="rgba(148,163,184,0.4)" />
      <line x1={CX + DIAL_R} y1={CY} x2={CX + DIAL_R - 14} y2={CY} stroke="rgba(148,163,184,0.4)" />
      <line x1={CX - DIAL_R} y1={CY} x2={CX - DIAL_R + 14} y2={CY} stroke="rgba(148,163,184,0.4)" />
      <text x={CX} y={CY - DIAL_R - 8} textAnchor="middle" fontSize={13} fontWeight={500} fill="#94a3b8">N</text>
      <text x={CX} y={CY + DIAL_R + 18} textAnchor="middle" fontSize={13} fontWeight={500} fill="#94a3b8">S</text>
      <text x={CX + DIAL_R + 12} y={CY + 4} textAnchor="middle" fontSize={13} fontWeight={500} fill="#94a3b8">E</text>
      <text x={CX - DIAL_R - 12} y={CY + 4} textAnchor="middle" fontSize={13} fontWeight={500} fill="#94a3b8">W</text>

      {/* Sun path */}
      <g>
        <polyline points={attr(sunPath)} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <circle cx={riseDot[0].toFixed(1)} cy={riseDot[1].toFixed(1)} r="3" fill="#D97706" />
        <circle cx={setDot[0].toFixed(1)} cy={setDot[1].toFixed(1)} r="3" fill="#D97706" />
        <text x={riseLabel[0].toFixed(1)} y={riseLabel[1].toFixed(1)} textAnchor="middle" fontSize={11} fill="#b45309">{hourToTimeLabel(day.sunrise)}</text>
        <text x={setLabel[0].toFixed(1)} y={setLabel[1].toFixed(1)} textAnchor="middle" fontSize={11} fill="#b45309">{hourToTimeLabel(day.sunset)}</text>
      </g>

      {/* Shadows (clipped to dial) */}
      <g clipPath="url(#scene-dial-clip)">
        {shadows.map((pts, i) => (pts ? <polygon key={i} points={pts} fill="rgba(2,6,23,0.55)" /> : null))}
      </g>

      {/* Building blocks */}
      <g>
        {blocks.map((b) =>
          b.id === subjectBuildingId ? (
            <polygon key={b.id} points={b.points} fill="#1e293b" stroke="#475569" strokeWidth="1" />
          ) : (
            <polygon key={b.id} points={b.points} fill="#334155" stroke="#475569" strokeWidth="1" />
          ),
        )}
      </g>

      {/* Subject building unit tiles */}
      <g>
        {Array.from({ length: grid.rows }, (_, row) =>
          Array.from({ length: grid.cols }, (_, col) => {
            const lit = cellsLit[row]?.[col];
            const corners = cellCornersWorld(subject, row, col).map(proj.toScreen);
            const isSel = selected?.row === row && selected?.col === col;
            const fill = lit === null ? 'rgba(148,163,184,0.06)' : lit ? '#F59E0B' : '#334155';
            return (
              <polygon
                key={`${row}-${col}`}
                points={attr(corners)}
                fill={fill}
                stroke={isSel ? '#fff' : 'rgba(148,163,184,0.4)'}
                strokeWidth={isSel ? 2 : 0.75}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(row, col)}
              />
            );
          }),
        )}
      </g>

      {/* Sun marker */}
      <g>
        <line x1={CX} y1={CY} x2={sunPt[0].toFixed(1)} y2={sunPt[1].toFixed(1)} stroke="#F59E0B" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
        <circle cx={sunPt[0].toFixed(1)} cy={sunPt[1].toFixed(1)} r="13" fill={sunColor} stroke="#D97706" strokeWidth="1" />
      </g>
    </svg>
  );
}
```

- [ ] **Step 2: Type-check the component**

Run: `npx tsc --noEmit`
Expected: no errors. (If `tsc` reports unrelated pre-existing legacy `.js` errors, confirm none originate from `SceneView.tsx` or `sceneProjection.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/sun-page/SceneView.tsx
git commit -m "feat(sun-page): SceneView top-down SVG with sun arc, shadows, unit tiles"
```

---

### Task 3: Integrate SceneView into SunPage + sun readout + visual verification

**Files:**
- Modify: `src/components/sun-page/SunPage.tsx`

- [ ] **Step 1: Import sun position + scene pieces**

In `src/components/sun-page/SunPage.tsx`, update the `@/engine` import to also bring in `sunPosition`, and add the new imports near the other component imports:

```tsx
import {
  analyzeUnit,
  unitLitAt,
  deriveFacades,
  classifyPosition,
  facadeSamplesForUnit,
  dayWindow,
  sunPosition,
} from '@/engine';
```

```tsx
import SceneView from './SceneView';
import { declinationFromSeason, hourToTimeLabel, compassDirection, type Season } from '@/lib/sunPageUtils';
```

(The `declinationFromSeason, hourToTimeLabel, type Season` import already exists — replace that line so it also imports `compassDirection`.)

- [ ] **Step 2: Compute the live sun position**

Add right after the `day` useMemo (around `SunPage.tsx:39`):

```tsx
  const sun = useMemo(
    () => sunPosition(solarHour, project.latitudeDeg, decl),
    [solarHour, project.latitudeDeg, decl],
  );
```

- [ ] **Step 3: Add the sun-position readout + SceneView to the JSX**

In `SunPage.tsx`, locate the `{/* Floor-plate grid */}` block (the `<FloorPlateGrid ... />`). Insert the following **immediately before** that block:

```tsx
      {/* Live sun-position readout */}
      <p className="w-full max-w-sm px-4 -mb-2 text-xs text-slate-400">
        {hourToTimeLabel(solarHour)} · Sun in the {compassDirection(sun.azimuth)} ({Math.round(sun.azimuth)}°) · {Math.round(sun.elevation)}° above the horizon
      </p>

      {/* Top-down scene (hero) */}
      <div className="w-full max-w-sm px-2">
        <SceneView
          project={project}
          subjectBuildingId={project.subjectBuildingId}
          cellsLit={cellsLit}
          selected={selected}
          onSelect={(row, col) => setSelected({ row, col })}
          sun={sun}
          day={day}
          latitudeDeg={project.latitudeDeg}
          declinationDeg={decl}
        />
      </div>
```

Leave the existing `<FloorPlateGrid />` in place below it (precise tap-picker). Both call `setSelected`.

- [ ] **Step 4: Start/confirm the dev server**

The dev server runs on `http://localhost:3000` (started earlier this session, PID may differ). If it is not running, start it detached:

```powershell
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d C:\Workspace\SunLine\sunline-app && npm run dev" -WindowStyle Hidden
```

Confirm `http://localhost:3000/sun` responds (200) before verifying.

- [ ] **Step 5: Desktop visual verification (MANDATORY — per CLAUDE.md)**

Using the Claude-in-Chrome MCP:
1. Navigate a tab to `http://localhost:3000/sun`.
2. Screenshot at default desktop size. Confirm: the dial renders with N/S/E/W labels; three towers visible as blocks; subject tower (tower-1, left) subdivided into a 2×3 tile grid; sun marker sits on the ring; sun-path arc drawn; at least one shadow polygon visible; sun-position readout line shows a sensible compass + elevation.
3. Click the play button and confirm (via a follow-up screenshot or DOM check) the sun marker + shadows move and the readout time advances.
4. Click a subject tile via `dispatchEvent` (the `floorStrip` re-render can freeze CDP screenshots — see note below); confirm `selected` updates by checking the UnitReadout text and the tile's white selection stroke.

If the Chrome extension is not connected, STOP and state so; ask the user to verify manually rather than claiming success.

> **CDP screenshot note (learned this session):** clicking a unit triggers a 20× `analyzeUnit` re-render (the floor strip) that can freeze CDP screenshots for >30s. Workaround: verify post-click state via `javascript_tool` reading `document.body.innerText`, or open a fresh tab + navigate for a clean screenshot.

- [ ] **Step 6: Mobile visual verification (MANDATORY — per CLAUDE.md)**

Resize to 390×844 (iPhone). Confirm: the SVG scales to the `max-w-sm` column without horizontal overflow; the dial, tiles, controls, readout, and floor strip all remain usable; no element exceeds the viewport width (reuse the overflow-check JS from earlier this session: filter elements whose `getBoundingClientRect().right > innerWidth`).

- [ ] **Step 7: Run the full test suite**

Run: `npm run test:run`
Expected: PASS — all tests green (60 prior + Task 1 additions).

- [ ] **Step 8: Commit**

```bash
git add src/components/sun-page/SunPage.tsx
git commit -m "feat(sun-page): mount top-down SceneView as hero with live sun readout"
```

---

## Self-Review (completed during planning)

**Spec coverage:** The original prototype's three hallmarks — (1) sun circling the dial, (2) moving building shadows, (3) clickable tiles with live data — map to: sun marker + `sunPathScreenPoints` (Task 2), `shadowPolygon` swept opposite the sun (Task 1/2), and subject-building tiles driving the existing `UnitReadout`/`FloorSunStrip` (Task 2/3). The live readout line restores the "Sun in the S (180°) · 58°" text.

**Placeholder scan:** No TBD/TODO; every code step is complete and copy-paste-ready.

**Type consistency:** `Vec2`/`Polygon` imported from `@/engine/solar/geometry`; `SunPosition`/`DayWindow` from `@/engine`; `Project`/`Building` from `@/engine/scene/types`. `cellsLit` typed `(boolean|null)[][]` matches SunPage's existing `cellsLit` shape. `cellCornersWorld` returns row 0 = North to match `facadeSamplesForUnit`, so tile lit-status aligns with the engine. `ringPoint`/`makeProjection` agree on the North-up, East-right screen convention (verified by tests).

**Known visual departure (intentional):** `parkviewTowers` places the three towers in an East–West row (not the diagonal of the original screenshots). The scene faithfully renders the engine data; changing the arrangement is a data edit to `parkviewTowers.ts`, out of scope here.

---

## As-built changes (post-plan refactors)

After the three tasks above shipped, four follow-up commits refined the page. The Task 1–3 steps are left intact as the build record; the actual final state on `main` is below.

**Commits (most recent last):**
1. `b0ee132` / `71bd0a3` / `0e7e051` — Tasks 1–3 as planned (projection lib, `SceneView`, mounted as hero).
2. `8559476` — **2× larger dial on desktop + draggable sun marker.** The dial grows by living in a wider centre column (`md:max-w-3xl`); the SVG `viewBox` is unchanged (680×580). The sun marker became draggable.
3. `39502c3` — **only the selected tile lights up** in the scene (unselected subject tiles render as a faint neutral fill, not lit/shaded amber).
4. `98db4ff` — **3-column desktop layout + multi-select unit comparison.**
5. `ddf9ada` — **floor strip moved to the left column; per-unit data tiles in a 3-column grid** on the right.

**API / state changes a future agent must know:**
- `SunPage` state: `selected` is now **`SelectedUnit[]`** (`{row,col}[]`), not `… | null`. Toggle with `toggleUnit(row, col)`. Saved-unit selection and `FloorSunStrip` only apply to **single** selection (`selected.length === 1`).
- `SceneView` props gained `onDrag?(hour)` and `onDragStart?()`, and its `selected` prop is now `{row,col}[]`. Dragging the sun marker (or anywhere on the dial) maps the pointer azimuth → solar hour via `azimuthToHour` and calls `onDrag` (which is `scrub`); `onDragStart` pauses playback.
- New export `azimuthToHour(azimuthDeg, latitudeDeg, declinationDeg, day)` in `src/lib/sceneProjection.ts` — **binary search** over the day window. Assumes azimuth is monotonic across the day, which holds at lat 32°N; revisit for high-latitude summer (sun can cross north).
- Layout: three flex columns on `md+` — LEFT (`SeasonPicker`, `FloorSlider`, `FloorPlateGrid`, `FloorSunStrip`), CENTRE (sun readout, `SceneView`, play/scrub), RIGHT (`UnitReadout` data tiles in `grid md:grid-cols-3`, each with Remove + Save-unit).
- Tile lighting in `SceneView`: selected tiles show lit/shaded/interior fills; unselected subject tiles use a faint neutral fill (`rgba(148,163,184,0.08)`).

**Scope held:** still no maps/OSM, no footprint authoring, no neighbour-tower unit selection, single project — all remain Phase 2.
