'use client';
import type { Season } from '@/lib/sunPageUtils';

interface Props {
  value: Season;
  onChange: (s: Season) => void;
}

const OPTIONS: { value: Season; label: string }[] = [
  { value: 'winter', label: 'Winter' },
  { value: 'equinox', label: 'Equinox' },
  { value: 'summer', label: 'Summer' },
];

export default function SeasonPicker({ value, onChange }: Props) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-700">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            'flex-1 py-2 text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-amber-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
