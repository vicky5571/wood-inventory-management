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

  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let badgeLabel = 'Belum Ada Input';

  if (inVol > 0) {
    if (isExceeded) {
      badgeColor = 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      badgeLabel = 'Melebihi Input';
    } else if (yieldPercent >= 70) {
      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      badgeLabel = 'Optimal';
    } else if (yieldPercent >= 50) {
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      badgeLabel = 'Moderat';
    } else {
      badgeColor = 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      badgeLabel = 'Rendah';
    }
  }

  return (
    <div className="p-3 bg-surface-raised border border-border-default rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span>Estimasi Rendemen & Waste</span>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <div className="text-[11px] text-muted">Rendemen (Yield)</div>
          <div className="text-base font-bold text-foreground">
            {inVol > 0 && !isExceeded ? `${yieldPercent.toFixed(1)}%` : '-'}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted">Sisa / Waste (m3)</div>
          <div className="text-base font-bold text-foreground">
            {inVol > 0 && !isExceeded ? `${wasteVolumeM3.toFixed(4)} m3` : '-'}
          </div>
        </div>
      </div>

      {isOutOfRange && (
        <div className="flex items-start gap-1.5 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-600 dark:text-amber-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Rendemen di luar rentang standar (50% - 95%). Harap verifikasi ukuran log dan papan.</span>
        </div>
      )}

      {isExceeded && (
        <div className="flex items-start gap-1.5 p-2 bg-rose-500/10 border border-rose-500/30 rounded text-rose-600 dark:text-rose-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Volume output tidak boleh lebih besar dari volume log input!</span>
        </div>
      )}
    </div>
  );
}
