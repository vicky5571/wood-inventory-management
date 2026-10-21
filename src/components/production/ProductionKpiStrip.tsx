'use client';

/**
 * src/components/production/ProductionKpiStrip.tsx
 *
 * KPI summary metrics cards for sawmill production volume, yield, and waste.
 */

import React from 'react';
import { Layers, PackageCheck, Percent, Trash2 } from 'lucide-react';
import type { SawmillProductionRecord } from '../../types/index.ts';
import { aggregateProductionMetrics } from '../../utils/production-calc.ts';

export interface ProductionKpiStripProps {
  records: SawmillProductionRecord[];
  dateRange?: { startDate: string; endDate: string };
}

export function ProductionKpiStrip({ records, dateRange }: ProductionKpiStripProps) {
  const metrics = aggregateProductionMetrics(records, dateRange);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-surface-raised border border-border-default rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted font-medium truncate">Total Log Masuk</div>
          <div className="text-lg font-bold text-foreground">
            {metrics.totalInputVolumeM3.toFixed(2)}{' '}
            <span className="text-xs font-normal text-muted">m3</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-raised border border-border-default rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <PackageCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted font-medium truncate">Total Hasil Olahan</div>
          <div className="text-lg font-bold text-foreground">
            {metrics.totalOutputVolumeM3.toFixed(2)}{' '}
            <span className="text-xs font-normal text-muted">m3</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-raised border border-border-default rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Percent className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted font-medium truncate">Rata-rata Rendemen</div>
          <div className="text-lg font-bold text-foreground">
            {metrics.averageYieldPercent.toFixed(1)}{' '}
            <span className="text-xs font-normal text-muted">%</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-raised border border-border-default rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <Trash2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted font-medium truncate">Total Waste</div>
          <div className="text-lg font-bold text-foreground">
            {metrics.totalWasteVolumeM3.toFixed(2)}{' '}
            <span className="text-xs font-normal text-muted">m3</span>
          </div>
        </div>
      </div>
    </div>
  );
}
