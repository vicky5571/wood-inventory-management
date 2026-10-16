'use client';

import React from 'react';
import { Building2, CheckCircle2, AlertTriangle, Box } from 'lucide-react';
import type { SupplierStats } from '@/src/types';

export interface SupplierStatsGridProps {
  stats: SupplierStats;
}

export function SupplierStatsGrid({ stats }: SupplierStatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            Total Pemasok Terdaftar
          </span>
          <span className="block text-xl font-bold font-mono text-[#101828]">
            {stats.totalVendors} Rekanan
          </span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            Kualitas Optimal (&lt;1%)
          </span>
          <span className="block text-xl font-bold font-mono text-emerald-700">
            {stats.optimalCount} Rekanan
          </span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            Perlu Perhatian (&gt;3%)
          </span>
          <span className="block text-xl font-bold font-mono text-rose-700">
            {stats.attentionCount} Rekanan
          </span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Box className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            Total Volume Pasokan
          </span>
          <span className="block text-xl font-bold font-mono text-[#101828]">
            {stats.totalVolumeM3.toFixed(2)} m³
          </span>
        </div>
      </div>
    </div>
  );
}
