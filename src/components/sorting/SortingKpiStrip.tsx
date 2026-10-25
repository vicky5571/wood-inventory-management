'use client';

/**
 * src/components/sorting/SortingKpiStrip.tsx
 *
 * KPI summary metrics cards for stock sorting and kavling redistribution volume.
 */

import React, { useMemo } from 'react';
import { ArrowLeftRight, MoveRight, Layers, Box } from 'lucide-react';
import type { StockSortingRecord } from '../../types/index.ts';

export interface SortingKpiStripProps {
  records: StockSortingRecord[];
}

export function SortingKpiStrip({ records }: SortingKpiStripProps) {
  const metrics = useMemo(() => {
    let totalVol = 0;
    let totalPcs = 0;
    const affectedLots = new Set<string>();

    for (const r of records) {
      totalVol += Number(r.volumeM3) || 0;
      totalPcs += Number(r.pieces) || 0;
      affectedLots.add(`${r.sourceStorageYard}:::${r.sourceKavlingNumber}`.toLowerCase());
      affectedLots.add(`${r.targetStorageYard}:::${r.targetKavlingNumber}`.toLowerCase());
    }

    return {
      transferCount: records.length,
      totalVolumeM3: Number(totalVol.toFixed(4)),
      totalPieces: totalPcs,
      affectedLotCount: affectedLots.size,
    };
  }, [records]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
          <ArrowLeftRight className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-medium truncate">Total Transaksi Sortir (分拣调拨总数)</div>
          <div className="text-lg font-bold text-gray-900 font-mono">
            {metrics.transferCount}{' '}
            <span className="text-xs font-normal text-gray-400 font-sans">transaksi</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
          <MoveRight className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-medium truncate">Volume Dipindahkan (调拨总立方)</div>
          <div className="text-lg font-bold text-gray-900 font-mono">
            {metrics.totalVolumeM3.toFixed(2)}{' '}
            <span className="text-xs font-normal text-gray-400 font-sans">m³</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
          <Box className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-medium truncate">Batang Dipindahkan (调拨总根数)</div>
          <div className="text-lg font-bold text-gray-900 font-mono">
            {metrics.totalPieces}{' '}
            <span className="text-xs font-normal text-gray-400 font-sans">btg</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-medium truncate">Kavling Terdampak (涉及堆位)</div>
          <div className="text-lg font-bold text-gray-900 font-mono">
            {metrics.affectedLotCount}{' '}
            <span className="text-xs font-normal text-gray-400 font-sans">kavling</span>
          </div>
        </div>
      </div>
    </div>
  );
}
