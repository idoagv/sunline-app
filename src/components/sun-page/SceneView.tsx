'use client';
import { useMemo, useRef } from 'react';
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
  azimuthToHour,
} from '@/lib/sceneProjection';
import { hourToTimeLabel } from '@/lib/sunPageUtils';

const VB_W = 680;
const VB_H = 580;
const CX = 340;
const CY = 290;
const DIAL_R = 255;
const RING_R = 232;
const FIT_R = 200;
const LABEL_R = 252;
const CARD_R = DIAL_R + 15; // cardinal letter radius
const HANDLE_R = RING_R + 22;

interface Props {
  project: Project;
  subjectBuildingId: string;
  activeBuildingId: string;
  allCellsLit: Record<string, (boolean | null)[][]>;
  selected: { row: number; col: number }[];
  onUnitClick: (buildingId: string, row: number, col: number) => void;
  sun: SunPosition;
  day: DayWindow;
  latitudeDeg: number;
  declinationDeg: number;
  northOffsetDeg: number;
  onNorthOffsetChange: (deg: number) => void;
  onDrag?: (hour: number) => void;
  onDragStart?: () => void;
}

const attr = (ps: Vec2[]) => ps.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

export default function SceneView({
  project,
  subjectBuildingId,
  activeBuildingId,
  allCellsLit,
  selected,
  onUnitClick,
  sun,
  day,
  latitudeDeg,
  declinationDeg,
  northOffsetDeg,
  onNorthOffsetChange,
  onDrag,
  onDragStart,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const sunDragging = useRef(false);
  const compassDragging = useRef(false);
  const compassGrabOffset = useRef(0);

  const proj = useMemo(
    () => makeProjection(sceneBounds(project.buildings), { cx: CX, cy: CY, fitRadius: FIT_R }),
    [project],
  );

  // Sun path arc, offset by the scene-north rotation.
  const sunPath = useMemo(
    () => sunPathScreenPoints(day, latitudeDeg, declinationDeg, RING_R, [CX, CY], 64, northOffsetDeg),
    [day, latitudeDeg, declinationDeg, northOffsetDeg],
  );

  // Shadows: buildings stay axis-aligned; the sun is offset by +θ so shadows
  // swing across the buildings as if the sun moved (matches the rotated compass).
  const shadows = useMemo(
    () =>
      project.buildings.map((b) => {
        const poly = shadowPolygon(b.footprint, sun.azimuth + northOffsetDeg, sun.elevation, b.base + b.height);
        return poly ? attr(poly.map(proj.toScreen)) : null;
      }),
    [project, sun.azimuth, sun.elevation, northOffsetDeg, proj],
  );

  const blocks = useMemo(
    () => project.buildings.map((b) => ({ id: b.id, points: attr(b.footprint.map(proj.toScreen)) })),
    [project, proj],
  );

  // Sun marker at offset azimuth
  const sunPt = ringPoint(sun.azimuth + northOffsetDeg, RING_R, [CX, CY]);
  const hot = Math.max(0, Math.min(1, sun.elevation / 60));
  const sunColor = `rgb(${Math.round(245 + (255 - 245) * hot)},${Math.round(158 + (216 - 158) * hot)},${Math.round(11 + (77 - 11) * hot)})`;

  const riseAz = sunPosition(day.sunrise + 0.01, latitudeDeg, declinationDeg).azimuth;
  const setAz = sunPosition(day.sunset - 0.01, latitudeDeg, declinationDeg).azimuth;
  const riseDot = ringPoint(riseAz + northOffsetDeg, RING_R, [CX, CY]);
  const setDot = ringPoint(setAz + northOffsetDeg, RING_R, [CX, CY]);
  const riseLabel = ringPoint(riseAz + northOffsetDeg, LABEL_R, [CX, CY]);
  const setLabel = ringPoint(setAz + northOffsetDeg, LABEL_R, [CX, CY]);

  // Cardinal ticks + labels, rotated with the compass
  const cardinals = [
    { az: 0, t: 'N' },
    { az: 90, t: 'E' },
    { az: 180, t: 'S' },
    { az: 270, t: 'W' },
  ].map((c) => ({
    t: c.t,
    outer: ringPoint(c.az + northOffsetDeg, DIAL_R, [CX, CY]),
    inner: ringPoint(c.az + northOffsetDeg, DIAL_R - 14, [CX, CY]),
    label: ringPoint(c.az + northOffsetDeg, CARD_R, [CX, CY]),
  }));

  const handlePt = ringPoint(northOffsetDeg, HANDLE_R, [CX, CY]);

  // Raw screen angle (clockwise from up) of a pointer event.
  function rawAngle(e: React.PointerEvent): number {
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (VB_W / rect.width);
    const svgY = (e.clientY - rect.top) * (VB_H / rect.height);
    return (Math.atan2(svgX - CX, -(svgY - CY)) * (180 / Math.PI) + 360) % 360;
  }

  // The sun dot sits at screen azimuth (geographic + θ), so geographic = screen − θ.
  function pointerToHour(e: React.PointerEvent): number {
    const geoAz = (rawAngle(e) - northOffsetDeg + 360) % 360;
    return azimuthToHour(geoAz, latitudeDeg, declinationDeg, day);
  }

  function applyCompassDrag(e: React.PointerEvent) {
    onNorthOffsetChange(Math.round(rawAngle(e) - compassGrabOffset.current));
  }

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="max-w-full"
      style={{ touchAction: 'none' }}
      role="img"
      aria-label="Top-down sun and shadow diagram"
      onPointerMove={(e) => {
        if (sunDragging.current && onDrag) onDrag(pointerToHour(e));
        if (compassDragging.current) applyCompassDrag(e);
      }}
      onPointerUp={() => { sunDragging.current = false; compassDragging.current = false; }}
      onPointerLeave={() => { sunDragging.current = false; compassDragging.current = false; }}
    >
      <defs>
        <clipPath id="scene-dial-clip">
          <circle cx={CX} cy={CY} r={DIAL_R} />
        </clipPath>
      </defs>

      {/* Dial background */}
      <circle cx={CX} cy={CY} r={DIAL_R} fill="#172033" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={RING_R} fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="0.5" strokeDasharray="3 5" />

      {/* Cardinal ticks + labels (rotate with compass, text upright) */}
      {cardinals.map((c) => (
        <g key={c.t}>
          <line x1={c.outer[0].toFixed(1)} y1={c.outer[1].toFixed(1)} x2={c.inner[0].toFixed(1)} y2={c.inner[1].toFixed(1)} stroke="rgba(148,163,184,0.4)" />
          <text x={c.label[0].toFixed(1)} y={c.label[1].toFixed(1)} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={500} fill="#94a3b8">{c.t}</text>
        </g>
      ))}

      {/* Sun path arc */}
      <polyline points={attr(sunPath)} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <circle cx={riseDot[0].toFixed(1)} cy={riseDot[1].toFixed(1)} r="3" fill="#D97706" />
      <circle cx={setDot[0].toFixed(1)} cy={setDot[1].toFixed(1)} r="3" fill="#D97706" />
      <text x={riseLabel[0].toFixed(1)} y={riseLabel[1].toFixed(1)} textAnchor="middle" fontSize={11} fill="#b45309">{hourToTimeLabel(day.sunrise)}</text>
      <text x={setLabel[0].toFixed(1)} y={setLabel[1].toFixed(1)} textAnchor="middle" fontSize={11} fill="#b45309">{hourToTimeLabel(day.sunset)}</text>

      {/* Shadows (clipped to dial) — fixed buildings, sun offset by θ */}
      <g clipPath="url(#scene-dial-clip)">
        {shadows.map((pts, i) => (pts ? <polygon key={i} points={pts} fill="rgba(2,6,23,0.55)" /> : null))}
      </g>

      {/* Building outlines (fixed) */}
      <g>
        {blocks.map((b) =>
          b.id === subjectBuildingId ? (
            <polygon key={b.id} points={b.points} fill="#1e293b" stroke="#475569" strokeWidth="1" />
          ) : (
            <polygon key={b.id} points={b.points} fill="#334155" stroke="#475569" strokeWidth="1" />
          ),
        )}
      </g>

      {/* Unit tiles for all buildings with a grid (fixed) */}
      <g>
        {project.buildings
          .filter((b) => b.unitGrid)
          .map((b) => {
            const bGrid = b.unitGrid!;
            const bCellsLit = allCellsLit[b.id] ?? [];
            const isActiveBuilding = b.id === activeBuildingId;

            return Array.from({ length: bGrid.rows }, (_, row) =>
              Array.from({ length: bGrid.cols }, (_, col) => {
                const lit = bCellsLit[row]?.[col];
                const corners = cellCornersWorld(b, row, col).map(proj.toScreen);
                const isSel = isActiveBuilding && selected.some((s) => s.row === row && s.col === col);
                const isInterior = lit === null;

                let fill: string;
                if (isInterior) {
                  fill = 'rgba(148,163,184,0.05)';
                } else if (isSel) {
                  fill = lit ? '#F59E0B' : '#1e293b';
                } else if (isActiveBuilding) {
                  fill = lit ? 'rgba(245,158,11,0.82)' : 'rgba(30,41,59,0.82)';
                } else {
                  fill = lit ? 'rgba(245,158,11,0.45)' : 'rgba(30,41,59,0.45)';
                }

                return (
                  <polygon
                    key={`${b.id}-${row}-${col}`}
                    points={attr(corners)}
                    fill={fill}
                    stroke={isSel ? '#fff' : isActiveBuilding ? 'rgba(148,163,184,0.4)' : 'rgba(148,163,184,0.2)'}
                    strokeWidth={isSel ? 2 : 0.75}
                    style={{ cursor: isInterior ? 'default' : 'pointer' }}
                    onClick={() => !isInterior && onUnitClick(b.id, row, col)}
                  />
                );
              }),
            );
          })}
      </g>

      {/* Sun marker — drag to scrub time */}
      <g
        style={{ cursor: 'grab' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          sunDragging.current = true;
          onDragStart?.();
        }}
        onPointerMove={(e) => {
          if (!sunDragging.current || !onDrag) return;
          e.stopPropagation();
          onDrag(pointerToHour(e));
        }}
        onPointerUp={() => { sunDragging.current = false; }}
      >
        <line x1={CX} y1={CY} x2={sunPt[0].toFixed(1)} y2={sunPt[1].toFixed(1)} stroke="#F59E0B" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
        <circle cx={sunPt[0].toFixed(1)} cy={sunPt[1].toFixed(1)} r="32" fill="transparent" />
        <circle cx={sunPt[0].toFixed(1)} cy={sunPt[1].toFixed(1)} r="14" fill={sunColor} stroke="#D97706" strokeWidth="1.5" />
      </g>

      {/* North rotation handle — drag around the ring to reorient the scene */}
      <g
        style={{ cursor: 'grab' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          compassDragging.current = true;
          compassGrabOffset.current = rawAngle(e) - northOffsetDeg;
        }}
        onPointerMove={(e) => {
          if (!compassDragging.current) return;
          e.stopPropagation();
          applyCompassDrag(e);
        }}
        onPointerUp={() => { compassDragging.current = false; }}
      >
        <circle cx={handlePt[0].toFixed(1)} cy={handlePt[1].toFixed(1)} r="22" fill="transparent" />
        <circle cx={handlePt[0].toFixed(1)} cy={handlePt[1].toFixed(1)} r="9" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5" />
        <circle cx={handlePt[0].toFixed(1)} cy={handlePt[1].toFixed(1)} r="3" fill="#93c5fd" />
      </g>
    </svg>
  );
}
