'use client';

import React from 'react';
import type { RecordCalculationOutput, ManifestCalculationOutput } from '@/src/types';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const formatRupiah = (num: number): string => idrFormatter.format(num);

export interface RecordReconciliationCardProps {
  preview: RecordCalculationOutput | ManifestCalculationOutput;
}

export const RecordReconciliationCard = React.memo(function RecordReconciliationCard({ preview }: RecordReconciliationCardProps) {
  const isSurplusOrMatch = preview.volumeDiscrepancyM3 >= 0;
  const timberNet = 'totalTimberNet' in preview ? preview.totalTimberNet : preview.timberNetPayable;
  const itemsCount = 'items' in preview && Array.isArray(preview.items) ? preview.items.length : null;

  return (
    <div className="bg-[#101828] text-white rounded-2xl p-4.5 border border-gray-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#ffc908] text-[#101828] flex items-center justify-center font-bold">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Rekonsiliasi Realtime & Netto Bayar
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">Selisih Vol:</span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isSurplusOrMatch
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-rose-500/20 text-[#ed1c24] border border-rose-500/30'
              }`}
            >
              {isSurplusOrMatch ? (
                <TrendingUp className="w-3 h-3 text-blue-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-[#ed1c24]" />
              )}
              {isSurplusOrMatch && '+'}
              {preview.volumeDiscrepancyM3.toFixed(2)} m³
            </span>
            {itemsCount !== null && itemsCount > 1 && (
              <span className="text-[11px] font-mono text-gray-400 bg-gray-800/90 px-2 py-0.5 rounded-full border border-gray-700/60">
                {itemsCount} Muatan
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="bg-gray-800/80 px-3 py-2 rounded-xl border border-gray-700/60">
          <div className="text-[10px] uppercase text-gray-400 font-medium">Net Material Kayu</div>
          <div className="font-mono tabular-nums font-semibold text-gray-100 mt-0.5">
            {formatRupiah(timberNet)}
          </div>
        </div>

        <div className="bg-gray-800/80 px-3 py-2 rounded-xl border border-gray-700/60">
          <div className="text-[10px] uppercase text-gray-400 font-medium">Net Ongkos Kirim</div>
          <div className="font-mono tabular-nums font-semibold text-gray-100 mt-0.5">
            {formatRupiah(preview.freightNetPayable)}
          </div>
        </div>

        <div className="bg-[#ffc908]/20 px-3.5 py-2 rounded-xl border border-[#ffc908]/40">
          <div className="text-[10px] uppercase text-[#ffc908] font-bold">Total Grand Net</div>
          <div className="font-mono tabular-nums font-bold text-base text-[#ffc908] mt-0.5">
            {formatRupiah(preview.grandNetPayable)}
          </div>
        </div>
      </div>
    </div>
  );
});
