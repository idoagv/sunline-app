'use client';
import { useState, useMemo } from 'react';
import {
  analyzeUnit,
  unitLitAt,
  deriveFacades,
  classifyPosition,
  facadeSamplesForUnit,
  dayWindow,
  sunPosition,
} from '@/engine';
import { parkviewTowers } from '@/engine/data/parkviewTowers';
import { declinationFromSeason, hourToTimeLabel, compassDirection, type Season } from '@/lib/sunPageUtils';
import type { UnitSystem } from '@/engine/scene/types';
import type { Unit } from '@/engine/scene/types';
import { useDayAnimation } from '@/hooks/useDayAnimation';
import FloorPlateGrid from './FloorPlateGrid';
import SeasonPicker from './SeasonPicker';
import FloorSlider from './FloorSlider';
import UnitReadout from './UnitReadout';
import FloorSunStrip from './FloorSunStrip';
import SavedUnits from './SavedUnits';
import SceneView from './SceneView';
import { useSavedUnits, type SavedUnit } from '@/hooks/useSavedUnits';

type SelectedUnit = { row: number; col: number };

export default function SunPage() {
  const project = parkviewTowers;
  const building = project.buildings.find((b) => b.id === project.subjectBuildingId)!;
  const grid = building.unitGrid!;
  const maxFloor = building.floors!;

  const [solarHour, setSolarHour] = useState(10);
  const [season, setSeason] = useState<Season>('equinox');
  const [floor, setFloor] = useState(10);
  const [selected, setSelected] = useState<SelectedUnit[]>([]);
  const [displayUnits, setDisplayUnits] = useState<UnitSystem>('metric');

  const decl = declinationFromSeason(season);
  const day = useMemo(() => dayWindow(project.latitudeDeg, decl), [project.latitudeDeg, decl]);
  const sun = useMemo(
    () => sunPosition(solarHour, project.latitudeDeg, decl),
    [solarHour, project.latitudeDeg, decl],
  );
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

  const toggleUnit = (row: number, col: number) => {
    setSelected((prev) => {
      const idx = prev.findIndex((s) => s.row === row && s.col === col);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { row, col }];
    });
  };

  const analyses = useMemo(
    () =>
      selected.map((sel) => ({
        sel,
        analysis: analyzeUnit(project, building.id, { floor, ...sel }, decl),
        isLitNow: cellsLit[sel.row]?.[sel.col] ?? false,
        label: building.unitLabels?.[`${sel.row}-${sel.col}`],
      })),
    [selected, floor, decl, cellsLit],
  );

  const floorStrip = useMemo(() => {
    if (selected.length !== 1) return null;
    const sel = selected[0];
    return Array.from({ length: maxFloor }, (_, i) => {
      const f = i + 1;
      const r = analyzeUnit(project, building.id, { floor: f, ...sel }, decl);
      return { floor: f, hours: r.hours.total, score: r.score };
    });
  }, [selected, decl]);

  const { units: savedUnits, toggle: toggleSaved, isSaved } = useSavedUnits(project.id);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center gap-4 pb-8">
      {/* Header */}
      <header className="w-full max-w-sm md:max-w-none md:px-6 px-4 pt-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{project.name}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDisplayUnits(displayUnits === 'metric' ? 'imperial' : 'metric')}
            className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded px-2 py-0.5 transition-colors"
          >
            {displayUnits === 'metric' ? 'm' : 'ft'}
          </button>
          <span className="text-xs text-slate-500">Apricity</span>
        </div>
      </header>

      {/* Saved units quick-pick chips */}
      <SavedUnits
        units={savedUnits}
        onSelect={(u) => { setFloor(u.floor); setSelected([{ row: u.row, col: u.col }]); }}
        onRemove={toggleSaved}
        selectedFloor={floor}
        selectedRow={selected.length === 1 ? selected[0].row : null}
        selectedCol={selected.length === 1 ? selected[0].col : null}
      />

      {/* 3-column layout */}
      <div className="w-full flex flex-col md:flex-row md:items-start md:justify-center md:px-6 gap-4">

        {/* LEFT: floor controls + unit picker */}
        <div className="flex flex-col items-center gap-3 md:w-56 md:flex-shrink-0 md:pt-1">
          <div className="w-full max-w-sm md:max-w-none px-4 md:px-0 flex flex-col gap-3">
            <SeasonPicker value={season} onChange={setSeason} />
            <FloorSlider floor={floor} maxFloor={maxFloor} onChange={setFloor} />
          </div>
          <FloorPlateGrid
            rows={grid.rows}
            cols={grid.cols}
            cells={cells}
            selected={selected}
            onSelect={toggleUnit}
          />
        </div>

        {/* CENTER: scene view + playback */}
        <div className="flex flex-col items-center gap-3 flex-1 min-w-0 md:max-w-3xl">
          <p className="w-full px-4 md:px-2 text-xs text-slate-400">
            {hourToTimeLabel(solarHour)} · Sun in the {compassDirection(sun.azimuth)} ({Math.round(sun.azimuth)}°) · {Math.round(sun.elevation)}° above the horizon
          </p>
          <div className="w-full px-2">
            <SceneView
              project={project}
              subjectBuildingId={project.subjectBuildingId}
              cellsLit={cellsLit}
              selected={selected}
              onSelect={toggleUnit}
              sun={sun}
              day={day}
              latitudeDeg={project.latitudeDeg}
              declinationDeg={decl}
              onDrag={scrub}
              onDragStart={() => { if (isPlaying) toggle(); }}
            />
          </div>
          {/* Day scrub controls */}
          <div className="w-full max-w-sm md:max-w-none px-4 md:px-2 flex items-center gap-3">
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
        </div>

        {/* RIGHT: unit data tiles */}
        <div className="flex flex-col gap-3 md:w-72 md:flex-shrink-0 px-4 md:px-0">
          {selected.length === 0 && (
            <p className="text-sm text-slate-500 md:pt-2">Tap a unit to see sun details</p>
          )}
          {analyses.map(({ sel, analysis, isLitNow, label }) => (
            <div key={`${sel.row}-${sel.col}`} className="flex flex-col gap-2">
              <UnitReadout
                analysis={analysis}
                isLitNow={isLitNow}
                displayUnits={displayUnits}
                label={label}
                floor={floor}
              />
              <div className="flex justify-between items-center">
                <button
                  onClick={() => toggleUnit(sel.row, sel.col)}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  × Remove
                </button>
                <button
                  onClick={() => {
                    const u: SavedUnit = {
                      label: label ?? `F${floor} (${sel.row},${sel.col})`,
                      floor,
                      row: sel.row,
                      col: sel.col,
                    };
                    toggleSaved(u);
                  }}
                  className={[
                    'px-3 py-1 rounded-full text-xs border transition-colors',
                    isSaved(floor, sel.row, sel.col)
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-amber-500',
                  ].join(' ')}
                >
                  {isSaved(floor, sel.row, sel.col) ? '★ Saved' : '☆ Save unit'}
                </button>
              </div>
            </div>
          ))}
          {floorStrip && (
            <FloorSunStrip
              data={floorStrip}
              currentFloor={floor}
              onFloorSelect={setFloor}
            />
          )}
        </div>
      </div>
    </main>
  );
}
