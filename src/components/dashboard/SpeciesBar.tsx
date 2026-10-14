'use client';

import React, { useState } from 'react';
import { PieChart, Sparkles } from 'lucide-react';

const PALETTE = ['#b45309', '#ffc908', '#0284c7', '#00bb7f', '#6366f1', '#ec4899'];

export function SpeciesBar({
  breakdown,
  totalVolume,
}: {
  breakdown: Record<string, number>;
  totalVolume: number;
}) {
  const [hoveredSpecies, setHoveredSpecies] = useState<string | null>(null);

  const entries = Object.entries(breakdown).filter(([_, vol]) => vol > 0);
  if (entries.length === 0 || totalVolume <= 0) return null;

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-4 overflow-hidden">
      {/* Header ala lms-isat */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-amber-50/40 to-white px-5 py-3.5 -mx-5 -mt-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ffc908]/20 flex items-center justify-center text-[#b38600] shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
              Distribusi Spesies Kayu Masuk (树种立方占比分布)
            </h3>
            <p className="text-[11px] text-gray-500">
              Proporsi kubikasi aktual per jenis kayu yang tersimpan di yard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-2xs font-mono tabular-nums text-xs">
          <span className="text-gray-500">Total Kubikasi:</span>
          <span className="font-bold text-[#101828]">{totalVolume.toFixed(2)} m³</span>
        </div>
      </div>

      {/* Segmented Volume Track with Hover Illumination */}
      <div className="relative">
        <div className="flex h-5 w-full rounded-xl overflow-hidden bg-gray-100 p-0.5 gap-1 shadow-inner">
          {entries.map(([species, vol], index) => {
            const pct = ((vol / totalVolume) * 100).toFixed(1);
            const color = PALETTE[index % PALETTE.length];
            const isHovered = hoveredSpecies === species;
            const isAnyHovered = hoveredSpecies !== null;

            return (
              <div
                key={species}
                style={{ width: `${pct}%`, backgroundColor: color }}
                onMouseEnter={() => setHoveredSpecies(species)}
                onMouseLeave={() => setHoveredSpecies(null)}
                title={`${species}: ${vol.toFixed(2)} m³ (${pct}%)`}
                className={`h-full rounded-lg transition-all duration-200 cursor-pointer ${
                  isHovered
                    ? 'scale-y-110 brightness-110 shadow-sm z-10'
                    : isAnyHovered
                    ? 'opacity-40'
                    : 'hover:opacity-90'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Interactive Sub-Metric Species Cards ala lms-isat */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 pt-1">
        {entries.map(([species, vol], index) => {
          const pct = ((vol / totalVolume) * 100).toFixed(1);
          const color = PALETTE[index % PALETTE.length];
          const isHovered = hoveredSpecies === species;

          return (
            <div
              key={species}
              onMouseEnter={() => setHoveredSpecies(species)}
              onMouseLeave={() => setHoveredSpecies(null)}
              className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                isHovered
                  ? 'bg-amber-50/50 border-[#ffc908] shadow-xs translate-y-[-1px]'
                  : 'bg-gray-50/70 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-bold text-gray-800 truncate" title={species}>
                    {species.split('/')[0].trim()}
                  </span>
                </div>
                <span className="text-[10px] font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded-full bg-white border border-gray-200/80 text-gray-700 shrink-0">
                  {pct}%
                </span>
              </div>

              <div className="flex items-baseline justify-between font-mono tabular-nums">
                <span className="text-xs font-bold text-[#101828]">
                  {vol.toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-400 font-sans ml-1">m³</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


