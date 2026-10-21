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
      <div className="bg-surface-raised border border-border-default rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <ArrowLeftRight className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted font-medium truncate">Total Transaksi Sortir</div>
          <div className="text-lg font-bold text-foreground">
            {metrics.transferCount}{' '}
            <span className="text-xs font-normal text-muted">transaksi</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-raised border border-border-default rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <MoveRight className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted font-medium truncate">Volume Dipindahkan</div>
          <div className="text-lg font-bold text-foreground">
            {metrics.totalVolumeM3.toFixed(2)}{' '}
            <span className="text-xs font-normal text-muted">m3</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-raised border border-border-default rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
          <Box className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted font-medium truncate">Batang Dipindahkan</div>
          <div className="text-lg font-bold text-foreground">
            {metrics.totalPieces}{' '}
            <span className="text-xs font-normal text-muted">btg</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-raised border border-border-default rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted font-medium truncate">Kavling Terdampak</div>
          <div className="text-lg font-bold text-foreground">
            {metrics.affectedLotCount}{' '}
            <span className="text-xs font-normal text-muted">kavling</span>
          </div>
        </div>
      </div>
    </div>
  );
}
