# Apricity Phase 1 — MVP Sun-Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, interactive Sun-Page at `/sun` that lets users tap a unit on a floor-plate grid and see per-unit sun-hours, Sun Score, and live lit/dark animation across the day and seasons — powered entirely by the `src/engine` API, no new math.

**Architecture:** A single Next.js App Router route (`src/app/sun/page.tsx`) renders a client-side orchestrator (`SunPage.tsx`) that holds all state (solarHour, season, floor, selected unit, displayUnits). Pure utility helpers live in `src/lib/sunPageUtils.ts`. Two lightweight hooks handle animation (`useDayAnimation`) and persistence (`useSavedUnits`). Six focused SVG/HTML components handle individual UI panels. The engine is imported directly — no wrapper layer.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Vitest (tests for pure functions only), `src/engine` barrel import.

---

> **Conventions used throughout this plan**
> - All paths are relative to `sunline-app/`. Run all commands from `sunline-app/`.
> - Engine is imported from `@/engine` (barrel `src/engine/index.ts`). The `@/` alias maps to `src/` — Task 1 adds this to tsconfig and vitest.config.
> - The existing `src/app/page.js` and `src/utils/*.js` are **never modified** — the Sun-Page is a new route.
> - Grid orientation (from engine): row 0 = North edge, last row = South; col 0 = West edge, last col = East.
> - Season → declination: winter = −23.45°, equinox = 0°, summer = +23.45°.
> - Seed data: `parkviewTowers` from `src/engine/data/parkviewTowers.ts` — tower-1 is the subject, 2×3 grid, 20 floors, lat 32°.
> - Visual verification is **mandatory** after every UI task: desktop screenshot + mobile 390×844 via Chrome MCP.

---

### Task 1: Path alias + utilities

Sets up `@/` import alias and implements the pure helper functions that format data for display.

**Files:**
- Modify: `tsconfig.json`
- Modify: `vitest.config.mjs`
- Create: `src/lib/sunPageUtils.ts`
- Create: `src/lib/sunPageUtils.test.ts`

- [ ] **Step 1: Add `@/` path alias to tsconfig.json and vitest.config.mjs**

Replace `tsconfig.json` with:

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
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

Replace `vitest.config.mjs` with:

```js
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 2: Write failing tests for sunPageUtils**

Create `src/lib/sunPageUtils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  declinationFromSeason,
  formatHours,
  formatDistance,
  hourToTimeLabel,
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- sunPageUtils`
Expected: FAIL — cannot find module `./sunPageUtils`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/sunPageUtils.ts`:

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- sunPageUtils`
Expected: PASS — 10 tests passed.

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `npm run test:run`
Expected: PASS — all 43+ tests pass.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json vitest.config.mjs src/lib/sunPageUtils.ts src/lib/sunPageUtils.test.ts
git commit -m "feat(sun-page): path alias and display utility helpers"
```

---

### Task 2: Saved-units hook

Persists salesperson-saved unit chips to `localStorage`.

**Files:**
- Create: `src/hooks/useSavedUnits.ts`
- Create: `src/hooks/useSavedUnits.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useSavedUnits.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSavedUnits, persistSavedUnits, toggleSavedUnit } from './useSavedUnits';

const KEY = 'apricity-saved-test';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    store: {} as Record<string, string>,
    getItem(k: string) { return this.store[k] ?? null; },
    setItem(k: string, v: string) { this.store[k] = v; },
    removeItem(k: string) { delete this.store[k]; },
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- useSavedUnits`
Expected: FAIL — cannot find module `./useSavedUnits`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useSavedUnits.ts`:

```ts
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
  const idx = current.findIndex((u) => u.floor === unit.floor && u.row === unit.row && u.col === unit.col);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- useSavedUnits`
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Run the full suite**

Run: `npm run test:run`
Expected: PASS — all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSavedUnits.ts src/hooks/useSavedUnits.test.ts
git commit -m "feat(sun-page): saved-units hook with localStorage persistence"
```

---

### Task 3: Route shell + SunPage state wiring

Creates the `/sun` route and the SunPage orchestrator with all state and engine calls wired up. No visual polish yet — just a debug readout to verify data flows.

**Files:**
- Create: `src/app/sun/page.tsx`
- Create: `src/components/sun-page/SunPage.tsx`

- [ ] **Step 1: Create the route page**

Create `src/app/sun/page.tsx`:

```tsx
import SunPage from '@/components/sun-page/SunPage';

export const metadata = {
  title: 'Apricity — Sun Hours',
  description: 'Per-unit sunlight analysis for real estate.',
};

export default function SunPageRoute() {
  return <SunPage />;
}
```

- [ ] **Step 2: Create the SunPage orchestrator stub**

Create `src/components/sun-page/SunPage.tsx`:

```tsx
'use client';
import { useState, useMemo } from 'react';
import {
  analyzeUnit,
  unitLitAt,
  deriveFacades,
  classifyPosition,
  facadeSamplesForUnit,
  dayWindow,
} from '@/engine';
import { parkviewTowers } from '@/engine/data/parkviewTowers';
import { declinationFromSeason, hourToTimeLabel, type Season } from '@/lib/sunPageUtils';
import type { UnitSystem } from '@/engine/scene/types';
import type { Unit } from '@/engine/scene/types';

type SelectedUnit = { row: number; col: number } | null;

export default function SunPage() {
  const project = parkviewTowers;
  const building = project.buildings.find((b) => b.id === project.subjectBuildingId)!;
  const grid = building.unitGrid!;
  const maxFloor = building.floors!;

  const [solarHour, setSolarHour] = useState(10);
  const [season, setSeason] = useState<Season>('equinox');
  const [floor, setFloor] = useState(10);
  const [selected, setSelected] = useState<SelectedUnit>(null);
  const [displayUnits, setDisplayUnits] = useState<UnitSystem>('metric');

  const decl = declinationFromSeason(season);

  const day = useMemo(
    () => dayWindow(project.latitudeDeg, decl),
    [project.latitudeDeg, decl],
  );

  const obstacles = useMemo(
    () => project.buildings.map((b) => ({ footprint: b.footprint, base: b.base, top: b.base + b.height })),
    [],
  );

  // For each grid cell on current floor: is it lit right now?
  const cellsLit = useMemo(() => {
    return Array.from({ length: grid.rows }, (_, row) =>
      Array.from({ length: grid.cols }, (_, col) => {
        const facades = deriveFacades(row, col, grid.rows, grid.cols);
        if (!facades.length) return null; // interior/core
        const unit: Unit = {
          buildingId: building.id,
          floor,
          row,
          col,
          facades,
          position: classifyPosition(facades),
        };
        const samples = facadeSamplesForUnit(building, unit);
        return unitLitAt(samples, solarHour, project.latitudeDeg, decl, obstacles);
      }),
    );
  }, [floor, solarHour, decl, obstacles]);

  // Analysis for selected unit
  const analysis = useMemo(() => {
    if (!selected) return null;
    return analyzeUnit(project, building.id, { floor, ...selected }, decl);
  }, [selected?.row, selected?.col, floor, decl]);

  // Per-floor strip data for selected unit position
  const floorStrip = useMemo(() => {
    if (!selected) return null;
    return Array.from({ length: maxFloor }, (_, i) => {
      const f = i + 1;
      const r = analyzeUnit(project, building.id, { floor: f, ...selected }, decl);
      return { floor: f, hours: r.hours.total, score: r.score };
    });
  }, [selected?.row, selected?.col, decl]);

  const isLitNow =
    selected !== null ? (cellsLit[selected.row]?.[selected.col] ?? false) : false;

  return (
    <main className="p-4 font-mono text-sm">
      <h1 className="text-xl font-bold mb-4">{project.name} — Sun-Page (wiring test)</h1>
      <p>Time: {hourToTimeLabel(solarHour)} | Season: {season} | Floor: {floor}</p>
      <p>
        Grid {grid.rows}×{grid.cols} |{' '}
        Sunrise {hourToTimeLabel(day.sunrise)} – Sunset {hourToTimeLabel(day.sunset)}
      </p>
      {selected && analysis && (
        <p>
          Selected ({selected.row},{selected.col}) floor {floor}: score={analysis.score}{' '}
          total={analysis.hours.total.toFixed(1)}h isLitNow={String(isLitNow)}
        </p>
      )}
      <div className="mt-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${grid.cols}, 48px)` }}>
        {Array.from({ length: grid.rows }, (_, row) =>
          Array.from({ length: grid.cols }, (_, col) => {
            const lit = cellsLit[row]?.[col];
            const isInterior = lit === null;
            const isSel = selected?.row === row && selected?.col === col;
            return (
              <button
                key={`${row}-${col}`}
                onClick={() => setSelected({ row, col })}
                className={[
                  'w-12 h-12 border text-xs',
                  isInterior ? 'bg-gray-300 cursor-not-allowed' : '',
                  !isInterior && lit ? 'bg-yellow-300' : '',
                  !isInterior && !lit ? 'bg-slate-600 text-white' : '',
                  isSel ? 'ring-2 ring-blue-500' : '',
                ].join(' ')}
                disabled={isInterior}
              >
                {row},{col}
              </button>
            );
          }),
        )}
      </div>
      <div className="mt-4">
        <label>Hour: </label>
        <input
          type="range"
          min={day.sunrise}
          max={day.sunset}
          step={0.1}
          value={solarHour}
          onChange={(e) => setSolarHour(Number(e.target.value))}
          className="w-48"
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Start the dev server and verify the page loads**

Run: `npm run dev` (then open `http://localhost:3000/sun` in Chrome)

Expected: page loads, shows grid of 6 buttons (2 rows × 3 cols), time scrub works, cells change color as you scrub, clicking a cell shows score and sun-hours.

- [ ] **Step 4: Visual verify with Chrome MCP**

Take a screenshot at default desktop size. Confirm:
- Grid of 6 cells visible
- Cells react to time slider (yellow = lit, dark = shadow)
- Clicking a cell shows analysis text

- [ ] **Step 5: Commit**

```bash
git add src/app/sun/page.tsx src/components/sun-page/SunPage.tsx
git commit -m "feat(sun-page): route shell and state wiring with debug grid"
```

---

### Task 4: Day animation hook + styled FloorPlateGrid

Implements the rAF-based day animation and replaces the debug grid with a styled SVG floor-plate component.

**Files:**
- Create: `src/hooks/useDayAnimation.ts`
- Create: `src/components/sun-page/FloorPlateGrid.tsx`
- Modify: `src/components/sun-page/SunPage.tsx`

- [ ] **Step 1: Create the animation hook**

Create `src/hooks/useDayAnimation.ts`:

```ts
'use client';
import { useRef, useCallback, useState, useEffect } from 'react';

const PLAY_DURATION_MS = 15000; // 15 s real time = full day

export function useDayAnimation(
  onChange: (hour: number) => void,
  bounds: { sunrise: number; sunset: number },
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const hourRef = useRef<number>(bounds.sunrise);

  const { sunrise, sunset } = bounds;
  const dayDuration = sunset - sunrise;

  const stopRaf = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  const tick = useCallback(
    (now: number) => {
      const elapsed = now - startRef.current;
      const frac = Math.min(elapsed / PLAY_DURATION_MS, 1);
      const hour = sunrise + frac * dayDuration;
      hourRef.current = hour;
      onChange(hour);
      if (frac < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
      }
    },
    [onChange, sunrise, dayDuration],
  );

  const play = useCallback(() => {
    // restart from beginning if at end, otherwise continue
    if (hourRef.current >= sunset - 0.01) hourRef.current = sunrise;
    const alreadyElapsed = ((hourRef.current - sunrise) / dayDuration) * PLAY_DURATION_MS;
    startRef.current = performance.now() - alreadyElapsed;
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, sunrise, sunset, dayDuration]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    stopRaf();
  }, [stopRaf]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const scrub = useCallback(
    (hour: number) => {
      pause();
      hourRef.current = hour;
      onChange(hour);
    },
    [pause, onChange],
  );

  useEffect(() => () => stopRaf(), [stopRaf]);

  return { isPlaying, toggle, scrub };
}
```

- [ ] **Step 2: Create the FloorPlateGrid SVG component**

Create `src/components/sun-page/FloorPlateGrid.tsx`:

```tsx
'use client';

interface Cell {
  row: number;
  col: number;
  lit: boolean | null; // null = interior/core
  label?: string;
}

interface Props {
  rows: number;
  cols: number;
  cells: Cell[];
  selected: { row: number; col: number } | null;
  onSelect: (row: number, col: number) => void;
}

const CELL_SIZE = 72;
const GAP = 4;
const COMPASS_LABELS = { top: 'N', bottom: 'S', left: 'W', right: 'E' };

export default function FloorPlateGrid({ rows, cols, cells, selected, onSelect }: Props) {
  const gridW = cols * CELL_SIZE + (cols - 1) * GAP;
  const gridH = rows * CELL_SIZE + (rows - 1) * GAP;
  const svgW = gridW + 40; // margin for compass labels
  const svgH = gridH + 40;
  const offsetX = 20;
  const offsetY = 20;

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="max-w-full"
      aria-label="Floor plate unit picker"
    >
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" strokeWidth="2" />
        </pattern>
      </defs>

      {/* Compass labels */}
      <text x={offsetX + gridW / 2} y={12} textAnchor="middle" fontSize={11} fill="#94a3b8">{COMPASS_LABELS.top}</text>
      <text x={offsetX + gridW / 2} y={svgH - 2} textAnchor="middle" fontSize={11} fill="#94a3b8">{COMPASS_LABELS.bottom}</text>
      <text x={8} y={offsetY + gridH / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#94a3b8">{COMPASS_LABELS.left}</text>
      <text x={svgW - 6} y={offsetY + gridH / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#94a3b8">{COMPASS_LABELS.right}</text>

      {cells.map(({ row, col, lit, label }) => {
        const x = offsetX + col * (CELL_SIZE + GAP);
        const y = offsetY + row * (CELL_SIZE + GAP);
        const isSelected = selected?.row === row && selected?.col === col;
        const isInterior = lit === null;

        const fill = isInterior ? 'url(#hatch)' : lit ? '#F59E0B' : '#1e293b';
        const textColor = lit ? '#78350f' : '#94a3b8';

        return (
          <g key={`${row}-${col}`} onClick={() => !isInterior && onSelect(row, col)} style={{ cursor: isInterior ? 'default' : 'pointer' }}>
            <rect
              x={x}
              y={y}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={6}
              fill={fill}
              stroke={isSelected ? '#60a5fa' : isInterior ? '#334155' : 'transparent'}
              strokeWidth={isSelected ? 3 : 1}
            />
            {!isInterior && (
              <text
                x={x + CELL_SIZE / 2}
                y={y + CELL_SIZE / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontWeight={isSelected ? 700 : 400}
                fill={textColor}
              >
                {label ?? `${row},${col}`}
              </text>
            )}
            {isInterior && (
              <text
                x={x + CELL_SIZE / 2}
                y={y + CELL_SIZE / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fill="#475569"
              >
                core
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 3: Wire the animation and grid into SunPage.tsx**

Replace `src/components/sun-page/SunPage.tsx` with:

```tsx
'use client';
import { useState, useMemo } from 'react';
import {
  analyzeUnit,
  unitLitAt,
  deriveFacades,
  classifyPosition,
  facadeSamplesForUnit,
  dayWindow,
} from '@/engine';
import { parkviewTowers } from '@/engine/data/parkviewTowers';
import { declinationFromSeason, hourToTimeLabel, type Season } from '@/lib/sunPageUtils';
import type { UnitSystem } from '@/engine/scene/types';
import type { Unit } from '@/engine/scene/types';
import { useDayAnimation } from '@/hooks/useDayAnimation';
import FloorPlateGrid from './FloorPlateGrid';

type SelectedUnit = { row: number; col: number } | null;

export default function SunPage() {
  const project = parkviewTowers;
  const building = project.buildings.find((b) => b.id === project.subjectBuildingId)!;
  const grid = building.unitGrid!;
  const maxFloor = building.floors!;

  const [solarHour, setSolarHour] = useState(10);
  const [season, setSeason] = useState<Season>('equinox');
  const [floor, setFloor] = useState(10);
  const [selected, setSelected] = useState<SelectedUnit>(null);
  const [displayUnits, setDisplayUnits] = useState<UnitSystem>('metric');

  const decl = declinationFromSeason(season);
  const day = useMemo(() => dayWindow(project.latitudeDeg, decl), [project.latitudeDeg, decl]);
  const obstacles = useMemo(
    () => project.buildings.map((b) => ({ footprint: b.footprint, base: b.base, top: b.base + b.height })),
    [],
  );

  const { isPlaying, toggle, scrub } = useDayAnimation(setSolarHour, {
    sunrise: day.sunrise,
    sunset: day.sunset,
  });

  const cellsLit = useMemo(() => {
    return Array.from({ length: grid.rows }, (_, row) =>
      Array.from({ length: grid.cols }, (_, col) => {
        const facades = deriveFacades(row, col, grid.rows, grid.cols);
        if (!facades.length) return null;
        const unit: Unit = { buildingId: building.id, floor, row, col, facades, position: classifyPosition(facades) };
        const samples = facadeSamplesForUnit(building, unit);
        return unitLitAt(samples, solarHour, project.latitudeDeg, decl, obstacles);
      }),
    );
  }, [floor, solarHour, decl, obstacles]);

  const cells = useMemo(
    () =>
      Array.from({ length: grid.rows }, (_, row) =>
        Array.from({ length: grid.cols }, (_, col) => ({
          row,
          col,
          lit: cellsLit[row][col],
          label: building.unitLabels?.[`${row}-${col}`],
        })),
      ).flat(),
    [cellsLit],
  );

  const analysis = useMemo(() => {
    if (!selected) return null;
    return analyzeUnit(project, building.id, { floor, ...selected }, decl);
  }, [selected?.row, selected?.col, floor, decl]);

  const floorStrip = useMemo(() => {
    if (!selected) return null;
    return Array.from({ length: maxFloor }, (_, i) => {
      const f = i + 1;
      const r = analyzeUnit(project, building.id, { floor: f, ...selected }, decl);
      return { floor: f, hours: r.hours.total, score: r.score };
    });
  }, [selected?.row, selected?.col, decl]);

  const isLitNow = selected !== null ? (cellsLit[selected.row]?.[selected.col] ?? false) : false;

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 flex flex-col items-center gap-6">
      <header className="w-full max-w-sm flex items-center justify-between">
        <h1 className="text-lg font-semibold">{project.name}</h1>
        <span className="text-xs text-slate-400">Floor {floor}</span>
      </header>

      <FloorPlateGrid
        rows={grid.rows}
        cols={grid.cols}
        cells={cells}
        selected={selected}
        onSelect={(row, col) => setSelected({ row, col })}
      />

      {/* Day scrub */}
      <div className="w-full max-w-sm flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center text-lg flex-shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min={day.sunrise}
          max={day.sunset}
          step={0.05}
          value={solarHour}
          onChange={(e) => scrub(Number(e.target.value))}
          className="flex-1 accent-amber-500"
        />
        <span className="text-sm text-slate-300 w-12 text-right tabular-nums">
          {hourToTimeLabel(solarHour)}
        </span>
      </div>

      {/* Debug info — removed in Task 5 */}
      {analysis && selected && (
        <pre className="text-xs text-slate-400 w-full max-w-sm">
          {JSON.stringify({ ...analysis, isLitNow, floor, season }, null, 2)}
        </pre>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Verify visually with Chrome MCP**

Open `http://localhost:3000/sun`. Take a desktop screenshot. Confirm:
- Dark background, floor-plate SVG grid visible with N/S/W/E labels
- Play button works — cells animate yellow/dark as time advances
- Scrub slider updates cell colors in real time
- Clicking a cell shows JSON debug readout

- [ ] **Step 5: Verify mobile layout**

Resize to 390×844. Take a screenshot. Confirm grid fits within viewport.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useDayAnimation.ts src/components/sun-page/FloorPlateGrid.tsx src/components/sun-page/SunPage.tsx
git commit -m "feat(sun-page): day animation hook and styled SVG floor-plate grid"
```

---

### Task 5: Season / Floor controls + Unit readout card

Adds season toggle, floor +/− controls, and replaces the debug JSON with a polished unit readout card.

**Files:**
- Create: `src/components/sun-page/SeasonPicker.tsx`
- Create: `src/components/sun-page/FloorSlider.tsx`
- Create: `src/components/sun-page/UnitReadout.tsx`
- Modify: `src/components/sun-page/SunPage.tsx`

- [ ] **Step 1: Create SeasonPicker**

Create `src/components/sun-page/SeasonPicker.tsx`:

```tsx
'use client';
import type { Season } from '@/lib/sunPageUtils';

interface Props {
  value: Season;
  onChange: (s: Season) => void;
}

const OPTIONS: { value: Season; label: string }[] = [
  { value: 'winter', label: 'Winter' },
  { value: 'equinox', label: 'Equinox' },
  { value: 'summer', label: 'Summer' },
];

export default function SeasonPicker({ value, onChange }: Props) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-700">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            'flex-1 py-2 text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-amber-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create FloorSlider**

Create `src/components/sun-page/FloorSlider.tsx`:

```tsx
'use client';

interface Props {
  floor: number;
  maxFloor: number;
  onChange: (floor: number) => void;
}

export default function FloorSlider({ floor, maxFloor, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-14">Floor</span>
      <button
        onClick={() => onChange(Math.max(1, floor - 1))}
        disabled={floor <= 1}
        className="w-8 h-8 rounded bg-slate-700 text-slate-200 disabled:opacity-30 hover:bg-slate-600"
        aria-label="Floor down"
      >
        −
      </button>
      <span className="text-sm font-semibold w-8 text-center tabular-nums">{floor}</span>
      <button
        onClick={() => onChange(Math.min(maxFloor, floor + 1))}
        disabled={floor >= maxFloor}
        className="w-8 h-8 rounded bg-slate-700 text-slate-200 disabled:opacity-30 hover:bg-slate-600"
        aria-label="Floor up"
      >
        +
      </button>
      <span className="text-xs text-slate-500">/ {maxFloor}</span>
    </div>
  );
}
```

- [ ] **Step 3: Create UnitReadout**

Create `src/components/sun-page/UnitReadout.tsx`:

```tsx
'use client';
import type { UnitAnalysis } from '@/engine/analyze';
import type { UnitSystem } from '@/engine/scene/types';
import { formatHours } from '@/lib/sunPageUtils';

interface Props {
  analysis: UnitAnalysis;
  isLitNow: boolean;
  displayUnits: UnitSystem;
  label?: string;
  floor: number;
}

const SCORE_COLOR = (score: number) => {
  if (score >= 70) return 'text-amber-400';
  if (score >= 40) return 'text-yellow-500';
  return 'text-slate-400';
};

const FACADE_LABELS: Record<string, string> = { N: 'North', E: 'East', S: 'South', W: 'West' };

export default function UnitReadout({ analysis, isLitNow, displayUnits, label, floor }: Props) {
  const { facades, position, hours, score } = analysis;

  return (
    <div className="w-full max-w-sm rounded-xl bg-slate-800 border border-slate-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-base font-semibold">{label ?? `Floor ${floor}`}</p>
          <p className="text-xs text-slate-400 capitalize">{position} unit</p>
        </div>
        <div className={`text-right ${SCORE_COLOR(score)}`}>
          <p className="text-2xl font-bold">{score}</p>
          <p className="text-xs">Sun Score</p>
        </div>
      </div>

      {/* Live status */}
      <div className={`flex items-center gap-2 mb-3 text-sm ${isLitNow ? 'text-amber-400' : 'text-slate-400'}`}>
        <span className={`w-2 h-2 rounded-full ${isLitNow ? 'bg-amber-400' : 'bg-slate-500'}`} />
        {isLitNow ? 'In sun now' : 'In shadow now'}
      </div>

      {/* Facade list */}
      <div className="flex gap-2 mb-4">
        {facades.length > 0 ? (
          facades.map((f) => (
            <span key={f} className="px-2 py-0.5 rounded bg-slate-700 text-xs text-slate-300">
              {FACADE_LABELS[f]}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500">No exterior facades (core)</span>
        )}
      </div>

      {/* Sun-hours breakdown */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-semibold text-amber-300">{formatHours(hours.morning)}</p>
          <p className="text-xs text-slate-400">Morning</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-amber-300">{formatHours(hours.afternoon)}</p>
          <p className="text-xs text-slate-400">Afternoon</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-amber-200">{formatHours(hours.total)}</p>
          <p className="text-xs text-slate-400">Total</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire all three into SunPage.tsx**

Replace `src/components/sun-page/SunPage.tsx` with:

```tsx
'use client';
import { useState, useMemo } from 'react';
import {
  analyzeUnit,
  unitLitAt,
  deriveFacades,
  classifyPosition,
  facadeSamplesForUnit,
  dayWindow,
} from '@/engine';
import { parkviewTowers } from '@/engine/data/parkviewTowers';
import { declinationFromSeason, hourToTimeLabel, type Season } from '@/lib/sunPageUtils';
import type { UnitSystem } from '@/engine/scene/types';
import type { Unit } from '@/engine/scene/types';
import { useDayAnimation } from '@/hooks/useDayAnimation';
import FloorPlateGrid from './FloorPlateGrid';
import SeasonPicker from './SeasonPicker';
import FloorSlider from './FloorSlider';
import UnitReadout from './UnitReadout';

type SelectedUnit = { row: number; col: number } | null;

export default function SunPage() {
  const project = parkviewTowers;
  const building = project.buildings.find((b) => b.id === project.subjectBuildingId)!;
  const grid = building.unitGrid!;
  const maxFloor = building.floors!;

  const [solarHour, setSolarHour] = useState(10);
  const [season, setSeason] = useState<Season>('equinox');
  const [floor, setFloor] = useState(10);
  const [selected, setSelected] = useState<SelectedUnit>(null);
  const [displayUnits] = useState<UnitSystem>('metric');

  const decl = declinationFromSeason(season);
  const day = useMemo(() => dayWindow(project.latitudeDeg, decl), [project.latitudeDeg, decl]);
  const obstacles = useMemo(
    () => project.buildings.map((b) => ({ footprint: b.footprint, base: b.base, top: b.base + b.height })),
    [],
  );

  const { isPlaying, toggle, scrub } = useDayAnimation(setSolarHour, {
    sunrise: day.sunrise,
    sunset: day.sunset,
  });

  const cellsLit = useMemo(() => {
    return Array.from({ length: grid.rows }, (_, row) =>
      Array.from({ length: grid.cols }, (_, col) => {
        const facades = deriveFacades(row, col, grid.rows, grid.cols);
        if (!facades.length) return null;
        const unit: Unit = { buildingId: building.id, floor, row, col, facades, position: classifyPosition(facades) };
        const samples = facadeSamplesForUnit(building, unit);
        return unitLitAt(samples, solarHour, project.latitudeDeg, decl, obstacles);
      }),
    );
  }, [floor, solarHour, decl, obstacles]);

  const cells = useMemo(
    () =>
      Array.from({ length: grid.rows }, (_, row) =>
        Array.from({ length: grid.cols }, (_, col) => ({
          row,
          col,
          lit: cellsLit[row][col],
          label: building.unitLabels?.[`${row}-${col}`],
        })),
      ).flat(),
    [cellsLit],
  );

  const analysis = useMemo(() => {
    if (!selected) return null;
    return analyzeUnit(project, building.id, { floor, ...selected }, decl);
  }, [selected?.row, selected?.col, floor, decl]);

  const isLitNow = selected !== null ? (cellsLit[selected.row]?.[selected.col] ?? false) : false;

  const selectedLabel = selected
    ? building.unitLabels?.[`${selected.row}-${selected.col}`]
    : undefined;

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center gap-5 pb-8">
      {/* Header */}
      <header className="w-full max-w-sm px-4 pt-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{project.name}</h1>
        <span className="text-xs text-slate-500">Apricity</span>
      </header>

      {/* Season + Floor controls */}
      <div className="w-full max-w-sm px-4 flex flex-col gap-3">
        <SeasonPicker value={season} onChange={(s) => { setSeason(s); }} />
        <FloorSlider floor={floor} maxFloor={maxFloor} onChange={setFloor} />
      </div>

      {/* Floor-plate grid */}
      <FloorPlateGrid
        rows={grid.rows}
        cols={grid.cols}
        cells={cells}
        selected={selected}
        onSelect={(row, col) => setSelected({ row, col })}
      />

      {/* Day scrub controls */}
      <div className="w-full max-w-sm px-4 flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center text-lg flex-shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min={day.sunrise}
          max={day.sunset}
          step={0.05}
          value={solarHour}
          onChange={(e) => scrub(Number(e.target.value))}
          className="flex-1 accent-amber-500"
        />
        <span className="text-sm text-slate-300 w-12 text-right tabular-nums">
          {hourToTimeLabel(solarHour)}
        </span>
      </div>

      {/* Unit readout */}
      {analysis && selected && (
        <div className="w-full max-w-sm px-4">
          <UnitReadout
            analysis={analysis}
            isLitNow={isLitNow}
            displayUnits={displayUnits}
            label={selectedLabel}
            floor={floor}
          />
        </div>
      )}

      {!selected && (
        <p className="text-sm text-slate-500 px-4">Tap a unit to see sun details →</p>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Visual verify desktop**

Screenshot at default desktop size. Confirm:
- Season toggle visible and switches season (cells change)
- Floor +/− works
- Readout card appears after tapping a cell, showing facades, sun-hours, Sun Score, in-sun status

- [ ] **Step 6: Visual verify mobile**

Resize to 390×844. Screenshot. Confirm all controls fit, no overflow.

- [ ] **Step 7: Commit**

```bash
git add src/components/sun-page/SeasonPicker.tsx src/components/sun-page/FloorSlider.tsx src/components/sun-page/UnitReadout.tsx src/components/sun-page/SunPage.tsx
git commit -m "feat(sun-page): season/floor controls and unit readout card"
```

---

### Task 6: Per-floor sun strip

Adds a vertical bar chart showing sun-hours by floor for the selected unit column/row — the "why floor 18 costs more" visual.

**Files:**
- Create: `src/components/sun-page/FloorSunStrip.tsx`
- Modify: `src/components/sun-page/SunPage.tsx`

- [ ] **Step 1: Create FloorSunStrip**

Create `src/components/sun-page/FloorSunStrip.tsx`:

```tsx
'use client';

interface FloorEntry {
  floor: number;
  hours: number;
  score: number;
}

interface Props {
  data: FloorEntry[];
  currentFloor: number;
  onFloorSelect: (floor: number) => void;
  maxHours?: number;
}

const SVG_W = 280;
const BAR_H = 10;
const BAR_GAP = 2;
const LABEL_W = 28;
const MARGIN_RIGHT = 36;
const BAR_AREA_W = SVG_W - LABEL_W - MARGIN_RIGHT;

function scoreColor(score: number): string {
  if (score >= 70) return '#F59E0B'; // amber
  if (score >= 40) return '#FCD34D'; // yellow
  if (score >= 20) return '#6B7280'; // gray
  return '#374151'; // dark gray
}

export default function FloorSunStrip({ data, currentFloor, onFloorSelect, maxHours }: Props) {
  const sortedDesc = [...data].sort((a, b) => b.floor - a.floor);
  const max = maxHours ?? Math.max(...data.map((d) => d.hours), 0.1);
  const svgH = data.length * (BAR_H + BAR_GAP) + 16;

  return (
    <div className="w-full max-w-sm px-4">
      <p className="text-xs text-slate-400 mb-2">Sun-hours by floor</p>
      <svg
        width={SVG_W}
        height={svgH}
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        className="max-w-full"
        aria-label="Per-floor sun-hours chart"
      >
        {sortedDesc.map((entry, i) => {
          const y = 8 + i * (BAR_H + BAR_GAP);
          const barW = Math.max(2, (entry.hours / max) * BAR_AREA_W);
          const isCurrent = entry.floor === currentFloor;

          return (
            <g
              key={entry.floor}
              onClick={() => onFloorSelect(entry.floor)}
              style={{ cursor: 'pointer' }}
            >
              {/* Floor label */}
              <text
                x={LABEL_W - 4}
                y={y + BAR_H / 2}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={9}
                fill={isCurrent ? '#F59E0B' : '#64748b'}
                fontWeight={isCurrent ? 700 : 400}
              >
                {entry.floor}
              </text>

              {/* Background track */}
              <rect x={LABEL_W} y={y} width={BAR_AREA_W} height={BAR_H} rx={3} fill="#1e293b" />

              {/* Sun-hours bar */}
              <rect
                x={LABEL_W}
                y={y}
                width={barW}
                height={BAR_H}
                rx={3}
                fill={scoreColor(entry.score)}
                opacity={isCurrent ? 1 : 0.7}
              />

              {/* Current floor indicator */}
              {isCurrent && (
                <rect x={LABEL_W - 6} y={y} width={3} height={BAR_H} rx={1} fill="#F59E0B" />
              )}

              {/* Hour label at end of bar */}
              <text
                x={LABEL_W + barW + 4}
                y={y + BAR_H / 2}
                dominantBaseline="central"
                fontSize={9}
                fill="#64748b"
              >
                {entry.hours.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Add FloorSunStrip to SunPage.tsx**

In `src/components/sun-page/SunPage.tsx`, add the import at the top:

```tsx
import FloorSunStrip from './FloorSunStrip';
```

And add the `floorStrip` memo (already present in the state wiring from Task 3 — confirm it's still there and uses `selected?.row, selected?.col, decl` as deps).

Then after the `UnitReadout` block, add:

```tsx
      {/* Per-floor sun strip */}
      {floorStrip && selected && (
        <FloorSunStrip
          data={floorStrip}
          currentFloor={floor}
          onFloorSelect={setFloor}
        />
      )}
```

Note: `floorStrip` must be computed in SunPage — add the `useMemo` if it was removed in Task 5:

```tsx
  const floorStrip = useMemo(() => {
    if (!selected) return null;
    return Array.from({ length: maxFloor }, (_, i) => {
      const f = i + 1;
      const r = analyzeUnit(project, building.id, { floor: f, ...selected }, decl);
      return { floor: f, hours: r.hours.total, score: r.score };
    });
  }, [selected?.row, selected?.col, decl]);
```

- [ ] **Step 3: Visual verify desktop**

Screenshot. Confirm:
- After tapping a unit, a vertical bar chart appears below the readout
- Bars are taller for higher floors (expected: more sun as the floor rises above neighbour shadows)
- Clicking a bar changes the selected floor and updates the readout

- [ ] **Step 4: Visual verify mobile**

Resize to 390×844. Screenshot. Confirm strip fits and is scrollable if taller than viewport.

- [ ] **Step 5: Commit**

```bash
git add src/components/sun-page/FloorSunStrip.tsx src/components/sun-page/SunPage.tsx
git commit -m "feat(sun-page): per-floor sun-hours strip with floor-select interaction"
```

---

### Task 7: Saved units chips

Adds the quick-pick chip row for salespeople — tap to jump to a saved unit, long-press (or a trash button) to remove.

**Files:**
- Create: `src/components/sun-page/SavedUnits.tsx`
- Modify: `src/components/sun-page/SunPage.tsx`

- [ ] **Step 1: Create SavedUnits**

Create `src/components/sun-page/SavedUnits.tsx`:

```tsx
'use client';
import type { SavedUnit } from '@/hooks/useSavedUnits';

interface Props {
  units: SavedUnit[];
  onSelect: (unit: SavedUnit) => void;
  onRemove: (unit: SavedUnit) => void;
  selectedFloor: number;
  selectedRow: number | null;
  selectedCol: number | null;
}

export default function SavedUnits({
  units,
  onSelect,
  onRemove,
  selectedFloor,
  selectedRow,
  selectedCol,
}: Props) {
  if (units.length === 0) return null;

  return (
    <div className="w-full max-w-sm px-4">
      <p className="text-xs text-slate-500 mb-2">Saved units</p>
      <div className="flex flex-wrap gap-2">
        {units.map((u) => {
          const isActive = u.floor === selectedFloor && u.row === selectedRow && u.col === selectedCol;
          return (
            <div key={`${u.floor}-${u.row}-${u.col}`} className="flex items-center gap-1">
              <button
                onClick={() => onSelect(u)}
                className={[
                  'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                  isActive
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-amber-500',
                ].join(' ')}
              >
                {u.label}
              </button>
              <button
                onClick={() => onRemove(u)}
                className="text-slate-600 hover:text-slate-300 text-xs"
                aria-label={`Remove ${u.label}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire SavedUnits into SunPage.tsx**

Add import at top:
```tsx
import SavedUnits from './SavedUnits';
import { useSavedUnits, type SavedUnit } from '@/hooks/useSavedUnits';
```

Add the hook call inside the component body (after the existing hooks):
```tsx
  const { units: savedUnits, toggle: toggleSaved, isSaved } = useSavedUnits(project.id);
```

Add a save-toggle button inside the `UnitReadout` section (after the readout, before the floor strip):

```tsx
      {analysis && selected && (
        <div className="w-full max-w-sm px-4 flex justify-end">
          <button
            onClick={() => {
              const u: SavedUnit = {
                label: selectedLabel ?? `F${floor} (${selected.row},${selected.col})`,
                floor,
                row: selected.row,
                col: selected.col,
              };
              toggleSaved(u);
            }}
            className={[
              'px-3 py-1 rounded-full text-xs border transition-colors',
              isSaved(floor, selected.row, selected.col)
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-amber-500',
            ].join(' ')}
          >
            {isSaved(floor, selected.row, selected.col) ? '★ Saved' : '☆ Save unit'}
          </button>
        </div>
      )}
```

Add the `SavedUnits` component in the JSX, above the grid (so it's always visible):

```tsx
      {/* Saved units quick-pick chips */}
      <SavedUnits
        units={savedUnits}
        onSelect={(u) => { setFloor(u.floor); setSelected({ row: u.row, col: u.col }); }}
        onRemove={toggleSaved}
        selectedFloor={floor}
        selectedRow={selected?.row ?? null}
        selectedCol={selected?.col ?? null}
      />
```

- [ ] **Step 3: Visual verify**

Screenshot. Confirm:
- "Save unit" button appears when a unit is selected
- Clicking it adds a chip above the grid
- Clicking the chip jumps to that unit
- × removes the chip
- Chips persist across page refresh (localStorage)

- [ ] **Step 4: Commit**

```bash
git add src/components/sun-page/SavedUnits.tsx src/components/sun-page/SunPage.tsx
git commit -m "feat(sun-page): saved units quick-pick chips with localStorage persistence"
```

---

### Task 8: Metric/imperial toggle + mobile polish + final verification

Adds the m/ft display toggle, polishes the mobile layout, and runs the final visual verification checklist.

**Files:**
- Modify: `src/components/sun-page/SunPage.tsx`
- Modify: `src/components/sun-page/UnitReadout.tsx`

- [ ] **Step 1: Add UnitSystem toggle state and wire displayUnits into UnitReadout**

In `src/components/sun-page/SunPage.tsx`, change `const [displayUnits] = useState<UnitSystem>('metric');` to:

```tsx
  const [displayUnits, setDisplayUnits] = useState<UnitSystem>('metric');
```

Add toggle button in the header:

```tsx
      <header className="w-full max-w-sm px-4 pt-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{project.name}</h1>
        <button
          onClick={() => setDisplayUnits((u) => u === 'metric' ? 'imperial' : 'metric')}
          className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-400 hover:text-slate-200"
        >
          {displayUnits === 'metric' ? 'm' : 'ft'}
        </button>
      </header>
```

Pass `displayUnits` through to `UnitReadout`:
```tsx
          <UnitReadout
            analysis={analysis}
            isLitNow={isLitNow}
            displayUnits={displayUnits}
            label={selectedLabel}
            floor={floor}
          />
```

- [ ] **Step 2: Use displayUnits in UnitReadout for floor height label**

In `src/components/sun-page/UnitReadout.tsx`, add import:
```tsx
import { formatDistance } from '@/lib/sunPageUtils';
```

Add a floor height line in the card (below position):

```tsx
          <p className="text-xs text-slate-400 capitalize">{position} unit</p>
```

Change to show approximate height:

```tsx
          <p className="text-xs text-slate-400 capitalize">
            {position} · floor {floor}
          </p>
```

(The `floor` prop must be available — it's already passed from SunPage.)

- [ ] **Step 3: Mobile layout audit**

Open `http://localhost:3000/sun`, resize to 390×844. Check each of:

1. No horizontal scroll — all content within 390px
2. Grid SVG scales to fit — no clipping
3. Controls (play button, slider, season, floor) all tappable (min 44px)
4. Readout card and floor strip don't overflow
5. Saved-unit chips wrap correctly on small screens

Fix any overflow issues by adding `overflow-hidden` to the root, or `max-w-full` to the SVG.

- [ ] **Step 4: Desktop layout audit**

On desktop (>768px), the max-w-sm column centers nicely. No action needed unless layout looks off.

- [ ] **Step 5: Final visual verification — desktop**

Take a screenshot at default desktop size. Confirm:
- Header with project name + m/ft toggle
- Season picker (3 buttons)
- Floor slider with +/−
- Floor-plate SVG grid (N/S/E/W labels, colored cells)
- Play button + scrub slider + time label
- (If unit selected) Saved unit chips, Unit readout card with Sun Score + facades + hours breakdown + in-sun status
- (If unit selected) Floor sun strip bar chart
- All data is real (not placeholders or zeros)

- [ ] **Step 6: Final visual verification — mobile (390×844)**

Take a screenshot at 390×844. Confirm same checklist items all visible and usable.

- [ ] **Step 7: Run full test suite one final time**

Run: `npm run test:run`
Expected: PASS — all tests pass (43+ engine tests + sunPageUtils + useSavedUnits).

- [ ] **Step 8: Commit**

```bash
git add src/components/sun-page/SunPage.tsx src/components/sun-page/UnitReadout.tsx
git commit -m "feat(sun-page): metric/imperial toggle and mobile layout polish"
```

---

## Self-Review

**Spec coverage (spec §8 — Sun-Page features):**

| Feature | Covered by |
|---|---|
| Floor-plate unit picker (configurable grid, tap by position) | Task 4 `FloorPlateGrid.tsx` |
| Units light up / go dark live as the day plays | Task 4 `cellsLit` memo + `useDayAnimation` |
| Interior/core units hatched | Task 4 `FloorPlateGrid.tsx` hatch pattern |
| Day animation: play/scrub time-of-day | Task 4 `useDayAnimation` + `DayControls` wired in Task 5 |
| Season toggle (winter/equinox/summer) | Task 5 `SeasonPicker.tsx` |
| Floor slider | Task 5 `FloorSlider.tsx` |
| Per-unit readout: facades, sun-hours (morning/afternoon), Sun Score | Task 5 `UnitReadout.tsx` |
| "In sun / in shadow now" | Task 5 `UnitReadout.tsx` `isLitNow` prop |
| Per-floor sun strip (sun-hours by floor) | Task 6 `FloorSunStrip.tsx` |
| Saved units (salesperson quick-pick chips) | Task 7 `SavedUnits.tsx` + `useSavedUnits` |
| Metric/imperial display toggle | Task 8 |
| Mobile-first layout | Tasks 4–8 (Tailwind, max-w-sm centered, visual verify each task) |
| Build on `src/engine`, no re-implemented math | All tasks — imports from `@/engine` only |
| Legacy `page.js` untouched | New route at `/sun`, separate files |

**Placeholder scan:** No TBD/TODO. Every component step includes complete JSX. Every `SunPage.tsx` replacement includes the full file.

**Type consistency:**
- `Season` defined in `sunPageUtils.ts`, imported in `SeasonPicker.tsx` and `SunPage.tsx`
- `SavedUnit` defined in `useSavedUnits.ts`, imported in `SavedUnits.tsx` and `SunPage.tsx`
- `UnitAnalysis` from `@/engine/analyze` consumed by `UnitReadout.tsx`
- `UnitSystem` from `@/engine/scene/types` consumed by `UnitReadout.tsx`, `SunPage.tsx`, `sunPageUtils.ts`
- `cellsLit[row][col]` accessed with `?.[col]` guards in `isLitNow` to prevent undefined errors
- `floorStrip` memo deps: `[selected?.row, selected?.col, decl]` — consistent with how it's used in FloorSunStrip and UnitReadout
