'use client';

import React from 'react';
import { Tag, Box, Wallet } from 'lucide-react';

const formatRupiah = (num: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);

export interface PendingPricingKpiStripProps {
  pendingCount: number;
  pendingVolumeM3: number;
  exposureIDR: number;
}

export function PendingPricingKpiStrip({
  pendingCount,
  pendingVolumeM3,
  exposureIDR,
}: PendingPricingKpiStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. Pending Count */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Muatan Belum Dihargai (待定价批次)
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-[#101828]">
              {pendingCount}
            </span>
            <span className="text-xs font-semibold text-gray-500">Item</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
          <Tag className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Pending Volume */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Volume Pending (待定总体积)
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-[#101828]">
              {pendingVolumeM3.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-gray-500">m³</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Box className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Estimated Exposure */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Estimasi Nilai Pajanan (预估敞口金额)
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold font-mono tracking-tight text-amber-700">
              {formatRupiah(exposureIDR)}
            </span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#ffc908]/20 text-[#b38600] flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
