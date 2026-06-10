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
  const [displayUnits] = useState<UnitSystem>('metric');

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
                onClick={() => !isInterior && setSelected({ row, col })}
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
