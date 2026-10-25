'use client';

/**
 * src/components/production/ProductionYieldPreview.tsx
 *
 * Real-time calculation preview for sawmill production yield, waste,
 * and efficiency ratings with visual color badges.
 */

import React from 'react';
import { computeProductionYield } from '../../utils/production-calc.ts';
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

export interface ProductionYieldPreviewProps {
  inputVolumeM3: number;
  outputVolumeM3: number;
}

export function ProductionYieldPreview({
  inputVolumeM3,
  outputVolumeM3,
}: ProductionYieldPreviewProps) {
  const inVol = Math.max(0, Number(inputVolumeM3) || 0);
  const outVol = Math.max(0, Number(outputVolumeM3) || 0);

  const { yieldPercent, wasteVolumeM3 } = computeProductionYield({
    inputVolumeM3: inVol,
    outputVolumeM3: outVol,
  });

  const isExceeded = inVol > 0 && outVol > inVol;
  const isOutOfRange = inVol > 0 && !isExceeded && (yieldPercent < 50 || yieldPercent > 95);

  let badgeColor = 'bg-gray-100 text-gray-700 border-gray-300';
  let badgeLabel = 'Belum Ada Input';

  if (inVol > 0) {
    if (isExceeded) {
      badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
      badgeLabel = 'Melebihi Input';
    } else if (yieldPercent >= 70) {
      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      badgeLabel = 'Optimal';
    } else if (yieldPercent >= 50) {
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
      badgeLabel = 'Moderat';
    } else {
      badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
      badgeLabel = 'Rendah';
    }
  }

  return (
    <div className="p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
          <span>Estimasi Rendemen & Waste</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <div className="text-[11px] text-gray-500 font-medium">Rendemen (Yield)</div>
          <div className="text-base font-bold text-gray-900 font-mono">
            {inVol > 0 && !isExceeded ? `${yieldPercent.toFixed(1)}%` : '-'}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-gray-500 font-medium">Sisa / Waste</div>
          <div className="text-base font-bold text-gray-900 font-mono">
            {inVol > 0 && !isExceeded ? `${wasteVolumeM3.toFixed(4)} m³` : '-'}
          </div>
        </div>
      </div>

      {isOutOfRange && (
        <div className="flex items-start gap-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>Rendemen di luar rentang standar (50% - 95%). Harap verifikasi ukuran log dan papan.</span>
        </div>
      )}

      {isExceeded && (
        <div className="flex items-start gap-1.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>Volume output tidak boleh lebih besar dari volume log input!</span>
        </div>
      )}
    </div>
  );
}
