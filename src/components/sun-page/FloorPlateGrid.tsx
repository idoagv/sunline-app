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

export default function FloorPlateGrid({ rows, cols, cells, selected, onSelect }: Props) {
  const gridW = cols * CELL_SIZE + (cols - 1) * GAP;
  const gridH = rows * CELL_SIZE + (rows - 1) * GAP;
  const svgW = gridW + 40;
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
          <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeWidth="2" />
        </pattern>
      </defs>

      {/* Compass labels */}
      <text x={offsetX + gridW / 2} y={13} textAnchor="middle" fontSize={11} fill="#64748b">N</text>
      <text x={offsetX + gridW / 2} y={svgH - 3} textAnchor="middle" fontSize={11} fill="#64748b">S</text>
      <text x={9} y={offsetY + gridH / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#64748b">W</text>
      <text x={svgW - 7} y={offsetY + gridH / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#64748b">E</text>

      {cells.map(({ row, col, lit, label }) => {
        const x = offsetX + col * (CELL_SIZE + GAP);
        const y = offsetY + row * (CELL_SIZE + GAP);
        const isSelected = selected?.row === row && selected?.col === col;
        const isInterior = lit === null;

        const fill = isInterior ? 'url(#hatch)' : lit ? '#F59E0B' : '#1e293b';
        const textFill = lit ? '#78350f' : '#94a3b8';

        return (
          <g
            key={`${row}-${col}`}
            onClick={() => !isInterior && onSelect(row, col)}
            style={{ cursor: isInterior ? 'default' : 'pointer' }}
          >
            <rect
              x={x}
              y={y}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={6}
              fill={fill}
              stroke={isSelected ? '#60a5fa' : isInterior ? '#334155' : '#0f172a'}
              strokeWidth={isSelected ? 3 : 1}
            />
            {!isInterior && (
              <text
                x={x + CELL_SIZE / 2}
                y={y + CELL_SIZE / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={isSelected ? 700 : 500}
                fill={textFill}
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
