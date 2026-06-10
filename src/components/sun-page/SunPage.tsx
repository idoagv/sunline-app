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
import FloorSunStrip from './FloorSunStrip';
import SavedUnits from './SavedUnits';
import { useSavedUnits, type SavedUnit } from '@/hooks/useSavedUnits';

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

  const floorStrip = useMemo(() => {
    if (!selected) return null;
    return Array.from({ length: maxFloor }, (_, i) => {
      const f = i + 1;
      const r = analyzeUnit(project, building.id, { floor: f, ...selected }, decl);
      return { floor: f, hours: r.hours.total, score: r.score };
    });
  }, [selected?.row, selected?.col, decl]);

  const isLitNow = selected !== null ? (cellsLit[selected.row]?.[selected.col] ?? false) : false;
  const selectedLabel = selected ? building.unitLabels?.[`${selected.row}-${selected.col}`] : undefined;

  const { units: savedUnits, toggle: toggleSaved, isSaved } = useSavedUnits(project.id);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center gap-5 pb-8">
      {/* Header */}
      <header className="w-full max-w-sm px-4 pt-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{project.name}</h1>
        <span className="text-xs text-slate-500">Apricity</span>
      </header>

      {/* Saved units quick-pick chips */}
      <SavedUnits
        units={savedUnits}
        onSelect={(u) => { setFloor(u.floor); setSelected({ row: u.row, col: u.col }); }}
        onRemove={toggleSaved}
        selectedFloor={floor}
        selectedRow={selected?.row ?? null}
        selectedCol={selected?.col ?? null}
      />

      {/* Season + Floor controls */}
      <div className="w-full max-w-sm px-4 flex flex-col gap-3">
        <SeasonPicker value={season} onChange={setSeason} />
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
        <div className="w-full max-w-sm px-4 flex flex-col gap-2">
          <UnitReadout
            analysis={analysis}
            isLitNow={isLitNow}
            displayUnits={displayUnits}
            label={selectedLabel}
            floor={floor}
          />
          <div className="flex justify-end">
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
        </div>
      )}

      {/* Per-floor sun strip */}
      {floorStrip && selected && (
        <FloorSunStrip
          data={floorStrip}
          currentFloor={floor}
          onFloorSelect={setFloor}
        />
      )}

      {!selected && (
        <p className="text-sm text-slate-500 px-4">Tap a unit to see sun details</p>
      )}
    </main>
  );
}
