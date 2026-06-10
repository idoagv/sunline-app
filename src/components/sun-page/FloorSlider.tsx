'use client';

interface Props {
  floor: number;
  maxFloor: number;
  onChange: (floor: number) => void;
}

export default function FloorSlider({ floor, maxFloor, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-10">Floor</span>
      <button
        onClick={() => onChange(Math.max(1, floor - 1))}
        disabled={floor <= 1}
        className="w-8 h-8 rounded bg-slate-700 text-slate-200 disabled:opacity-30 hover:bg-slate-600 text-lg leading-none"
        aria-label="Floor down"
      >
        −
      </button>
      <span className="text-sm font-semibold w-8 text-center tabular-nums">{floor}</span>
      <button
        onClick={() => onChange(Math.min(maxFloor, floor + 1))}
        disabled={floor >= maxFloor}
        className="w-8 h-8 rounded bg-slate-700 text-slate-200 disabled:opacity-30 hover:bg-slate-600 text-lg leading-none"
        aria-label="Floor up"
      >
        +
      </button>
      <span className="text-xs text-slate-500">/ {maxFloor}</span>
    </div>
  );
}
