import React from 'react';

const PALETTE = ['#b45309', '#0284c7', '#10b981', '#6366f1', '#ec4899', '#f59e0b'];

export function SpeciesBar({
  breakdown,
  totalVolume,
}: {
  breakdown: Record<string, number>;
  totalVolume: number;
}) {
  const entries = Object.entries(breakdown).filter(([_, vol]) => vol > 0);
  if (entries.length === 0 || totalVolume <= 0) return null;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Distribusi Spesies Kayu (树种立方占比分布)
      </div>
      <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100">
        {entries.map(([species, vol], index) => {
          const pct = ((vol / totalVolume) * 100).toFixed(1);
          const color = PALETTE[index % PALETTE.length];
          return (
            <div
              key={species}
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${species}: ${vol.toFixed(2)} m³ (${pct}%)`}
              className="transition-all hover:opacity-90"
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        {entries.map(([species, vol], index) => {
          const pct = ((vol / totalVolume) * 100).toFixed(1);
          const color = PALETTE[index % PALETTE.length];
          return (
            <div key={species} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span><strong>{species}</strong>: {vol.toFixed(2)} m³ ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
