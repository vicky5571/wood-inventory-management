'use client';

import React from 'react';
import type { DashboardMetrics } from '@/src/types';
import { Wallet, Truck, UserCheck, AlertTriangle } from 'lucide-react';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function FinancialOutlayBreakdown({
  metrics,
}: {
  metrics: DashboardMetrics;
}) {
  const total = metrics.totalGrandExpenditure || 1;
  const timberPct = ((metrics.totalNetTimberPayable / total) * 100).toFixed(1);
  const freightPct = ((metrics.totalNetFreightPayable / total) * 100).toFixed(1);
  const brokerAmount = total - metrics.totalNetTimberPayable - metrics.totalNetFreightPayable;
  const brokerPct = ((brokerAmount / total) * 100).toFixed(1);

  // Approximate financial exposure of volume discrepancy based on average price/m³
  const avgCostPerM3 = metrics.totalTallyVolumeM3 > 0
    ? metrics.totalNetTimberPayable / metrics.totalTallyVolumeM3
    : 0;
  const discrepancyValueExposure = metrics.volumeDiscrepancyM3 * avgCostPerM3;

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
              Struktur Biaya Pengeluaran (财务支出构成)
            </h3>
            <p className="text-[11px] text-gray-500">
              Alokasi dana pembelian bahan baku kayu, logistik, dan jasa broker
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold font-mono text-[#101828]">
            {formatRupiah(metrics.totalGrandExpenditure)}
          </span>
          <span className="block text-[10px] text-gray-400 font-sans">Total Outlay</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="space-y-1.5">
        <div className="flex h-4 w-full rounded-xl overflow-hidden bg-gray-100 p-0.5 gap-1 shadow-inner">
          <div
            style={{ width: `${timberPct}%` }}
            className="bg-emerald-600 rounded-lg transition-all"
            title={`Kayu: ${timberPct}%`}
          />
          <div
            style={{ width: `${freightPct}%` }}
            className="bg-blue-600 rounded-lg transition-all"
            title={`Ongkir: ${freightPct}%`}
          />
          <div
            style={{ width: `${brokerPct}%` }}
            className="bg-purple-600 rounded-lg transition-all"
            title={`Broker: ${brokerPct}%`}
          />
        </div>
        <div className="flex justify-between text-[11px] text-gray-500 font-mono">
          <span>Kayu {timberPct}%</span>
          <span>Ongkir {freightPct}%</span>
          <span>Broker {brokerPct}%</span>
        </div>
      </div>

      {/* 3 Metric Mini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Net Bahan Kayu</span>
          </div>
          <span className="text-xs font-bold font-mono text-gray-800 mt-2 truncate">
            {formatRupiah(metrics.totalNetTimberPayable)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Net Ongkir Logistik</span>
          </div>
          <span className="text-xs font-bold font-mono text-gray-800 mt-2 truncate">
            {formatRupiah(metrics.totalNetFreightPayable)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Jasa Broker</span>
          </div>
          <span className="text-xs font-bold font-mono text-gray-800 mt-2 truncate">
            {formatRupiah(brokerAmount > 0 ? brokerAmount : 0)}
          </span>
        </div>
      </div>

      {/* Discrepancy Financial Risk Indicator */}
      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-semibold text-amber-900">Valuasi Selisih Fisik Tally:</span>
            <span className="text-amber-800 ml-1">
              Rata-rata {formatRupiah(avgCostPerM3)}/m³
            </span>
          </div>
        </div>
        <span className={`font-mono font-bold ${discrepancyValueExposure >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
          {discrepancyValueExposure >= 0 ? '+' : ''}{formatRupiah(discrepancyValueExposure)}
        </span>
      </div>
    </div>
  );
}
