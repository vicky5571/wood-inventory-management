import React from 'react';
import type { DashboardMetrics } from '../../types/index.ts';
import { Layers, Box, Wallet, Building2, TrendingUp, TrendingDown } from 'lucide-react';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function KpiCards({ metrics }: { metrics: DashboardMetrics }) {
  const isMatchOrSurplus = metrics.volumeDiscrepancyM3 >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Volume */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
          <span>Total Volume Tally (检尺立方)</span>
          <Box className="w-4 h-4 text-amber-600" />
        </div>
        <div className="my-2">
          <span className="text-3xl font-bold text-amber-700">{metrics.totalTallyVolumeM3.toFixed(2)}</span>
          <span className="text-sm font-medium text-slate-500 ml-1">m³</span>
        </div>
        <div className="text-xs text-slate-500 flex items-center justify-between">
          <span>Surat Jalan: {metrics.totalDeliveredVolumeM3.toFixed(2)} m³</span>
          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold ${isMatchOrSurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {isMatchOrSurplus ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isMatchOrSurplus && '+'}{metrics.volumeDiscrepancyM3.toFixed(2)} m³
          </span>
        </div>
      </div>

      {/* Total Stems */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
          <span>Total Batang Tally (检尺根数)</span>
          <Layers className="w-4 h-4 text-blue-600" />
        </div>
        <div className="my-2">
          <span className="text-3xl font-bold text-slate-900">{metrics.totalTallyPieces.toLocaleString('id-ID')}</span>
          <span className="text-sm font-medium text-slate-500 ml-1">Btg</span>
        </div>
        <div className="text-xs text-slate-500 flex justify-between">
          <span>Surat Jalan: {metrics.totalDeliveredPieces.toLocaleString('id-ID')} Btg</span>
          <span>Selisih: {metrics.pieceDiscrepancy >= 0 ? `+${metrics.pieceDiscrepancy}` : metrics.pieceDiscrepancy}</span>
        </div>
      </div>

      {/* Total Outlay */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
          <span>Total Pengeluaran (总应付金额)</span>
          <Wallet className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="my-2">
          <span className="text-2xl font-bold text-slate-900">{formatRupiah(metrics.totalGrandExpenditure)}</span>
        </div>
        <div className="text-xs text-slate-500 flex justify-between">
          <span>Kayu: {formatRupiah(metrics.totalNetTimberPayable)}</span>
          <span>Ongkir: {formatRupiah(metrics.totalNetFreightPayable)}</span>
        </div>
      </div>

      {/* Active Lots */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
          <span>Kavling & Total Batch (批号统计)</span>
          <Building2 className="w-4 h-4 text-purple-600" />
        </div>
        <div className="my-2">
          <span className="text-3xl font-bold text-slate-900">{metrics.activeKavlingCount}</span>
          <span className="text-sm font-medium text-slate-500 ml-1">Kavling Aktif</span>
        </div>
        <div className="text-xs text-slate-500">
          <span>{metrics.totalRecordsCount} Pengiriman Tercatat</span>
        </div>
      </div>
    </div>
  );
}
