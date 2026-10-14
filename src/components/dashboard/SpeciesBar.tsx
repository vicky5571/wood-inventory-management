import React from 'react';

const PALETTE = ['#b45309', '#ffc908', '#0284c7', '#00bb7f', '#6366f1', '#ec4899'];

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
    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Distribusi Spesies Kayu Masuk (树种立方占比分布)
        </span>
        <span className="text-xs font-mono tabular-nums font-semibold text-gray-500">
          Total: <strong className="text-[#101828]">{totalVolume.toFixed(2)} m³</strong>
        </span>
      </div>

      {/* Segmented Volume Track */}
      <div className="flex h-4 w-full rounded-xl overflow-hidden bg-gray-100 p-0.5 gap-0.5">
        {entries.map(([species, vol], index) => {
          const pct = ((vol / totalVolume) * 100).toFixed(1);
          const color = PALETTE[index % PALETTE.length];
          return (
            <div
              key={species}
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${species}: ${vol.toFixed(2)} m³ (${pct}%)`}
              className="h-full rounded-sm transition-all hover:opacity-90"
            />
          );
        })}
      </div>

      {/* Legend Items */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600">
        {entries.map(([species, vol], index) => {
          const pct = ((vol / totalVolume) * 100).toFixed(1);
          const color = PALETTE[index % PALETTE.length];
          return (
            <div key={species} className="flex items-center gap-1.5 font-mono tabular-nums">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="font-sans font-medium text-gray-800">{species}:</span>
              <span className="text-gray-500">{vol.toFixed(2)} m³ ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

