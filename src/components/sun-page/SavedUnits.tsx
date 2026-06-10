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
          const isActive =
            u.floor === selectedFloor && u.row === selectedRow && u.col === selectedCol;
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
                className="text-slate-600 hover:text-slate-300 text-sm leading-none"
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
