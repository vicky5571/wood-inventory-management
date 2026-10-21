'use client';

import React from 'react';
import { Users, CheckCircle2, DollarSign, Layers } from 'lucide-react';
import type { BrokerStats } from '@/src/types';

export interface BrokerStatsGridProps {
  stats: BrokerStats;
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function BrokerStatsGrid({ stats }: BrokerStatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Brokers */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            Total Broker Terdaftar
          </span>
          <span className="block text-xl font-bold font-mono text-[#101828]">
            {stats.totalBrokers} Orang
          </span>
        </div>
      </div>

      {/* Active Brokers */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            Broker Aktif (生效)
          </span>
          <span className="block text-xl font-bold font-mono text-emerald-700">
            {stats.activeCount} Orang
          </span>
        </div>
      </div>

      {/* Total Commission YTD */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <DollarSign className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            Total Komisi YTD (Rp)
          </span>
          <span className="block text-lg font-bold font-mono text-amber-700">
            {formatRupiah(stats.totalCommissionYtdIDR)}
          </span>
        </div>
      </div>

      {/* Total Facilitated Volume YTD */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            Volume Difasilitasi YTD
          </span>
          <span className="block text-xl font-bold font-mono text-[#101828]">
            {stats.totalVolumeFacilitatedYtdM3.toFixed(2)} m³
          </span>
        </div>
      </div>
    </div>
  );
}
