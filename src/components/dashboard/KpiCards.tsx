import type { DashboardMetrics } from '@/src/types';
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
      {/* Total Volume Hero Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#ffc908]" />
        <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
          <span>Total Volume Tally (检尺立方)</span>
          <div className="w-8 h-8 rounded-xl bg-[#ffc908]/15 flex items-center justify-center text-[#b38600]">
            <Box className="w-4 h-4" />
          </div>
        </div>
        <div className="my-3">
          <span className="text-3xl font-bold font-mono tracking-tight text-[#101828]">
            {metrics.totalTallyVolumeM3.toFixed(2)}
          </span>
          <span className="text-sm font-semibold text-gray-500 ml-1.5">m³</span>
        </div>
        <div className="text-xs text-gray-500 flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="font-mono tabular-nums">SJ: {metrics.totalDeliveredVolumeM3.toFixed(2)} m³</span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold font-mono tabular-nums text-[11px] ${
              isMatchOrSurplus
                ? 'bg-emerald-50 text-[#00bb7f] border border-emerald-200/80'
                : 'bg-rose-50 text-[#ed1c24] border border-rose-200/80'
            }`}
          >
            {isMatchOrSurplus ? <TrendingUp className="w-3 h-3 text-[#00bb7f]" /> : <TrendingDown className="w-3 h-3 text-[#ed1c24]" />}
            {isMatchOrSurplus && '+'}{metrics.volumeDiscrepancyM3.toFixed(2)} m³
          </span>
        </div>
      </div>

      {/* Total Stems */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
          <span>Total Batang Tally (检尺根数)</span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="my-3">
          <span className="text-3xl font-bold font-mono tracking-tight text-[#101828]">
            {metrics.totalTallyPieces.toLocaleString('id-ID')}
          </span>
          <span className="text-sm font-semibold text-gray-500 ml-1.5">Btg</span>
        </div>
        <div className="text-xs text-gray-500 flex justify-between items-center pt-2 border-t border-gray-100 font-mono tabular-nums">
          <span>SJ: {metrics.totalDeliveredPieces.toLocaleString('id-ID')} Btg</span>
          <span className="font-semibold text-gray-700">
            Selisih: {metrics.pieceDiscrepancy >= 0 ? `+${metrics.pieceDiscrepancy}` : metrics.pieceDiscrepancy}
          </span>
        </div>
      </div>

      {/* Total Outlay */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
          <span>Total Pengeluaran (总应付金额)</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#00bb7f]">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="my-3">
          <span className="text-2xl font-bold font-mono tracking-tight text-[#101828]">
            {formatRupiah(metrics.totalGrandExpenditure)}
          </span>
        </div>
        <div className="text-xs text-gray-500 flex justify-between items-center pt-2 border-t border-gray-100 font-mono tabular-nums">
          <span>Kayu: <strong className="text-gray-700">{formatRupiah(metrics.totalNetTimberPayable)}</strong></span>
          <span>Ongkir: <strong className="text-gray-700">{formatRupiah(metrics.totalNetFreightPayable)}</strong></span>
        </div>
      </div>

      {/* Active Lots */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
          <span>Kavling & Total Batch (批号统计)</span>
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="my-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono tracking-tight text-[#101828]">
            {metrics.activeKavlingCount}
          </span>
          <span className="text-xs font-semibold text-gray-500">Kavling Aktif</span>
        </div>
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-700">{metrics.totalRecordsCount} Pengiriman Tercatat</span>
          <span className="inline-block w-2 h-2 rounded-full bg-[#00bb7f]" />
        </div>
      </div>
    </div>
  );
}

