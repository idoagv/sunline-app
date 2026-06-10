'use client';
import type { UnitAnalysis } from '@/engine/analyze';
import type { UnitSystem } from '@/engine/scene/types';
import { formatHours } from '@/lib/sunPageUtils';

interface Props {
  analysis: UnitAnalysis;
  isLitNow: boolean;
  displayUnits: UnitSystem;
  label?: string;
  floor: number;
}

const SCORE_COLOR = (score: number) => {
  if (score >= 70) return 'text-amber-400';
  if (score >= 40) return 'text-yellow-500';
  return 'text-slate-400';
};

const FACADE_LABELS: Record<string, string> = { N: 'North', E: 'East', S: 'South', W: 'West' };

export default function UnitReadout({ analysis, isLitNow, displayUnits: _displayUnits, label, floor }: Props) {
  const { facades, position, hours, score } = analysis;

  return (
    <div className="w-full max-w-sm rounded-xl bg-slate-800 border border-slate-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-base font-semibold">{label ?? `Floor ${floor}`}</p>
          <p className="text-xs text-slate-400 capitalize">{position} · floor {floor}</p>
        </div>
        <div className={`text-right ${SCORE_COLOR(score)}`}>
          <p className="text-2xl font-bold tabular-nums">{score}</p>
          <p className="text-xs">Sun Score</p>
        </div>
      </div>

      {/* Live status */}
      <div className={`flex items-center gap-2 mb-3 text-sm ${isLitNow ? 'text-amber-400' : 'text-slate-400'}`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLitNow ? 'bg-amber-400' : 'bg-slate-500'}`} />
        {isLitNow ? 'In sun now' : 'In shadow now'}
      </div>

      {/* Facade tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {facades.length > 0 ? (
          facades.map((f) => (
            <span key={f} className="px-2 py-0.5 rounded bg-slate-700 text-xs text-slate-300">
              {FACADE_LABELS[f]}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500">No exterior facades (core unit)</span>
        )}
      </div>

      {/* Sun-hours breakdown */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-semibold text-amber-300 tabular-nums">{formatHours(hours.morning)}</p>
          <p className="text-xs text-slate-400">Morning</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-amber-300 tabular-nums">{formatHours(hours.afternoon)}</p>
          <p className="text-xs text-slate-400">Afternoon</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-amber-200 tabular-nums">{formatHours(hours.total)}</p>
          <p className="text-xs text-slate-400">Total</p>
        </div>
      </div>
    </div>
  );
}
