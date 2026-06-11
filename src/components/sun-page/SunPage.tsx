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
import SavedUnits from './SavedUnits';
import SceneView from './SceneView';
import { useSavedUnits, type SavedUnit } from '@/hooks/useSavedUnits';

type SelectedUnit = { row: number; col: number };

export default function SunPage() {
  const project = parkviewTowers;

  const [solarHour, setSolarHour] = useState(10);
  const [season, setSeason] = useState<Season>('equinox');
  const [floor, setFloor] = useState(10);
  const [selected, setSelected] = useState<SelectedUnit[]>([]);
  const [displayUnits] = useState<UnitSystem>('metric');
  const [activeBuildingId, setActiveBuildingId] = useState(project.subjectBuildingId);
  const [northOffsetDeg, setNorthOffsetDegRaw] = useState(0);

  // Keep the rotation in a friendly (-180, 180] range so the readout never shows e.g. -270°.
  const setNorthOffsetDeg = (deg: number) => setNorthOffsetDegRaw(((((deg + 180) % 360) + 360) % 360) - 180);

  const building = project.buildings.find((b) => b.id === activeBuildingId)!;
  const grid = building.unitGrid!;
  const maxFloor = building.floors!;

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

  // Lit status for every building's unit grid
  const allCellsLit = useMemo(() => {
    const result: Record<string, (boolean | null)[][]> = {};
    for (const b of project.buildings) {
      if (!b.unitGrid) continue;
      const g = b.unitGrid;
      result[b.id] = Array.from({ length: g.rows }, (_, row) =>
        Array.from({ length: g.cols }, (_, col) => {
          const facades = deriveFacades(row, col, g.rows, g.cols);
          if (!facades.length) return null;
          const unit: Unit = { buildingId: b.id, floor, row, col, facades, position: classifyPosition(facades) };
          const samples = facadeSamplesForUnit(b, unit);
          return unitLitAt(samples, solarHour, project.latitudeDeg, decl, obstacles, northOffsetDeg);
        }),
      );
    }
    return result;
  }, [floor, solarHour, decl, obstacles, northOffsetDeg]);

  const cellsLit = allCellsLit[activeBuildingId] ?? [];

  // Per-building cells arrays for the floor plan grids
  const allBuildingCells = useMemo(
    () =>
      project.buildings
        .filter((b) => b.unitGrid)
        .map((b) => {
          const g = b.unitGrid!;
          const bLit = allCellsLit[b.id] ?? [];
          return {
            building: b,
            cells: Array.from({ length: g.rows }, (_, row) =>
              Array.from({ length: g.cols }, (_, col) => ({
                row,
                col,
                lit: bLit[row]?.[col] ?? null,
                label: b.unitLabels?.[`${row}-${col}`],
              })),
            ).flat(),
          };
        }),
    [allCellsLit],
  );

  function toggleUnit(row: number, col: number) {
    setSelected((prev) => {
      const idx = prev.findIndex((s) => s.row === row && s.col === col);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { row, col }];
    });
  }

  function handleUnitClick(buildingId: string, row: number, col: number) {
    if (buildingId !== activeBuildingId) {
      setActiveBuildingId(buildingId);
      setSelected([{ row, col }]);
    } else {
      toggleUnit(row, col);
    }
  }

  const analyses = useMemo(
    () =>
      selected.map((sel) => ({
        sel,
        analysis: analyzeUnit(project, activeBuildingId, { floor, ...sel }, decl, northOffsetDeg),
        isLitNow: cellsLit[sel.row]?.[sel.col] ?? false,
        label: building.unitLabels?.[`${sel.row}-${sel.col}`] ?? `${sel.row},${sel.col}`,
      })),
    [selected, floor, decl, cellsLit, activeBuildingId, building, northOffsetDeg],
  );

  const { units: savedUnits, toggle: toggleSaved, isSaved } = useSavedUnits(project.id);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center gap-4 pb-8">
      {/* Header */}
      <header className="w-full max-w-sm md:max-w-none md:px-6 px-4 pt-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{project.name}</h1>
        <span className="text-xs text-slate-500">Apricity</span>
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

        {/* LEFT: season/floor controls + one floor plan per building */}
        <div className="flex flex-col items-center gap-4 md:w-auto md:flex-shrink-0 md:pt-1">
          <div className="w-full max-w-sm md:max-w-none px-4 md:px-0 flex flex-col gap-3">
            <SeasonPicker value={season} onChange={setSeason} />
            <FloorSlider floor={floor} maxFloor={maxFloor} onChange={setFloor} />
          </div>

          {/* One floor plan grid per building */}
          <div className="flex flex-row md:flex-col gap-3 px-4 md:px-0 overflow-x-auto md:overflow-visible w-full max-w-sm md:max-w-none">
            {allBuildingCells.map(({ building: b, cells }) => {
              const isActive = b.id === activeBuildingId;
              return (
                <div
                  key={b.id}
                  className={[
                    'flex flex-col items-center gap-1 rounded-lg p-1 transition-colors flex-shrink-0',
                    isActive ? 'bg-slate-700/50 ring-1 ring-slate-500' : 'opacity-60',
                  ].join(' ')}
                >
                  <p className="text-xs text-slate-400 truncate max-w-full px-1">
                    {b.id}
                  </p>
                  <FloorPlateGrid
                    rows={b.unitGrid!.rows}
                    cols={b.unitGrid!.cols}
                    cells={cells}
                    selected={isActive ? selected : []}
                    onSelect={(row, col) => handleUnitClick(b.id, row, col)}
                    cellSize={56}
                  />
                </div>
              );
            })}
          </div>
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
              activeBuildingId={activeBuildingId}
              allCellsLit={allCellsLit}
              selected={selected}
              onUnitClick={handleUnitClick}
              sun={sun}
              day={day}
              latitudeDeg={project.latitudeDeg}
              declinationDeg={decl}
              northOffsetDeg={northOffsetDeg}
              onNorthOffsetChange={setNorthOffsetDeg}
              onDrag={scrub}
              onDragStart={() => { if (isPlaying) toggle(); }}
            />
          </div>

          {/* Playback + north reset */}
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
            {northOffsetDeg !== 0 && (
              <button
                onClick={() => setNorthOffsetDeg(0)}
                className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded px-2 py-0.5 flex-shrink-0"
                title="Reset north rotation"
              >
                N {northOffsetDeg > 0 ? '+' : ''}{northOffsetDeg}°
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: unit data tiles */}
        <div className="flex-1 min-w-0 px-4 md:px-0">
          {selected.length === 0 && (
            <p className="text-sm text-slate-500 md:pt-2">Tap a unit to see sun details</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      const u: SavedUnit = { label, floor, row: sel.row, col: sel.col };
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
          </div>
        </div>
      </div>
    </main>
  );
}
