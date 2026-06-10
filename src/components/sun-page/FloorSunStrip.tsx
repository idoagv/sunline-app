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
  if (score >= 70) return '#F59E0B';
  if (score >= 40) return '#FCD34D';
  if (score >= 20) return '#6B7280';
  return '#374151';
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

              {/* Current floor marker */}
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
