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
      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-medium truncate">Total Log Masuk (投入原木)</div>
          <div className="text-lg font-bold text-gray-900 font-mono">
            {metrics.totalInputVolumeM3.toFixed(2)}{' '}
            <span className="text-xs font-normal text-gray-400 font-sans">m³</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
          <PackageCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-medium truncate">Total Hasil Olahan (产出规格)</div>
          <div className="text-lg font-bold text-gray-900 font-mono">
            {metrics.totalOutputVolumeM3.toFixed(2)}{' '}
            <span className="text-xs font-normal text-gray-400 font-sans">m³</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
          <Percent className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-medium truncate">Rata-rata Rendemen (平均出材率)</div>
          <div className="text-lg font-bold text-gray-900 font-mono">
            {metrics.averageYieldPercent.toFixed(1)}{' '}
            <span className="text-xs font-normal text-gray-400 font-sans">%</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
          <Trash2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-medium truncate">Total Waste (废料立方)</div>
          <div className="text-lg font-bold text-gray-900 font-mono">
            {metrics.totalWasteVolumeM3.toFixed(2)}{' '}
            <span className="text-xs font-normal text-gray-400 font-sans">m³</span>
          </div>
        </div>
      </div>
    </div>
  );
}
