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
const DIAL_R = 230;
const RING_R = 205;
const FIT_R = 150;
const LABEL_R = 226;

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
  onDrag?: (hour: number) => void;
  onDragStart?: () => void;
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
  onDrag,
  onDragStart,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

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

  const blocks = useMemo(
    () => project.buildings.map((b) => ({ id: b.id, points: attr(b.footprint.map(proj.toScreen)) })),
    [project, proj],
  );

  const sunPt = ringPoint(sun.azimuth, RING_R, [CX, CY]);
  const hot = Math.max(0, Math.min(1, sun.elevation / 60));
  const sunColor = `rgb(${Math.round(245 + (255 - 245) * hot)},${Math.round(158 + (216 - 158) * hot)},${Math.round(11 + (77 - 11) * hot)})`;

  const riseAz = sunPosition(day.sunrise + 0.01, latitudeDeg, declinationDeg).azimuth;
  const setAz = sunPosition(day.sunset - 0.01, latitudeDeg, declinationDeg).azimuth;
  const riseDot = ringPoint(riseAz, RING_R, [CX, CY]);
  const setDot = ringPoint(setAz, RING_R, [CX, CY]);
  const riseLabel = ringPoint(riseAz, LABEL_R, [CX, CY]);
  const setLabel = ringPoint(setAz, LABEL_R, [CX, CY]);

  function pointerAzimuth(e: React.PointerEvent): number {
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (VB_W / rect.width);
    const svgY = (e.clientY - rect.top) * (VB_H / rect.height);
    return (Math.atan2(svgX - CX, -(svgY - CY)) * (180 / Math.PI) + 360) % 360;
  }

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="max-w-full"
      role="img"
      aria-label="Top-down sun and shadow diagram"
      onPointerMove={(e) => {
        if (!dragging.current || !onDrag) return;
        onDrag(azimuthToHour(pointerAzimuth(e), latitudeDeg, declinationDeg, day));
      }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerLeave={() => { dragging.current = false; }}
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
            const fill = isSel
              ? (lit === null ? 'rgba(148,163,184,0.06)' : lit ? '#F59E0B' : '#1e293b')
              : 'rgba(148,163,184,0.08)';
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

      {/* Sun marker — draggable */}
      <g
        style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragging.current = true;
          onDragStart?.();
        }}
        onPointerMove={(e) => {
          if (!dragging.current || !onDrag) return;
          e.stopPropagation();
          onDrag(azimuthToHour(pointerAzimuth(e), latitudeDeg, declinationDeg, day));
        }}
        onPointerUp={() => { dragging.current = false; }}
      >
        <line x1={CX} y1={CY} x2={sunPt[0].toFixed(1)} y2={sunPt[1].toFixed(1)} stroke="#F59E0B" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
        {/* Invisible hit-area ring around the sun marker */}
        <circle cx={sunPt[0].toFixed(1)} cy={sunPt[1].toFixed(1)} r="26" fill="transparent" />
        <circle cx={sunPt[0].toFixed(1)} cy={sunPt[1].toFixed(1)} r="13" fill={sunColor} stroke="#D97706" strokeWidth="1" />
      </g>
    </svg>
  );
}
