import type { DashboardMetrics } from '@/src/types';
import { Layers, Box, Wallet, Building2, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

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
      {/* 1. Total Volume Hero Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
        <div className="h-1 w-full bg-[#ffc908]" />
        
        {/* Card Header ala lms-isat */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-amber-50/50 to-white px-4.5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ffc908]/20 flex items-center justify-center text-[#b38600] shrink-0">
              <Box className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#101828] uppercase tracking-wider">
              Total Volume Tally (检尺立方)
            </span>
          </div>
        </div>

        {/* Hero Figure */}
        <div className="px-4.5 pt-3.5 pb-2">
          <div className="flex items-baseline">
            <span className="text-3xl font-bold font-mono tracking-tight text-[#101828]">
              {metrics.totalTallyVolumeM3.toFixed(2)}
            </span>
            <span className="text-sm font-semibold text-gray-500 ml-1.5">m³</span>
          </div>
        </div>

        {/* Sub-Metric Mini Boxes ala lms-isat/resources/js/pages/summary */}
        <div className="px-4.5 pb-4 pt-1 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50/80 p-2.5 border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Surat Jalan
            </span>
            <span className="text-xs font-bold font-mono tabular-nums text-gray-700 mt-0.5">
              {metrics.totalDeliveredVolumeM3.toFixed(2)} m³
            </span>
          </div>

          <div className="rounded-xl bg-gray-50/80 p-2.5 border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Selisih Fisik
            </span>
            <span
              className={`inline-flex items-center gap-1 font-bold font-mono tabular-nums text-xs mt-0.5 ${
                isMatchOrSurplus ? 'text-[#00bb7f]' : 'text-[#ed1c24]'
              }`}
            >
              {isMatchOrSurplus ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isMatchOrSurplus && '+'}{metrics.volumeDiscrepancyM3.toFixed(2)} m³
            </span>
          </div>
        </div>
      </div>

      {/* 2. Total Batang Tally */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-blue-50/50 to-white px-4.5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#101828] uppercase tracking-wider">
              Batang Tally (检尺根数)
            </span>
          </div>
        </div>

        {/* Hero Figure */}
        <div className="px-4.5 pt-3.5 pb-2">
          <div className="flex items-baseline">
            <span className="text-3xl font-bold font-mono tracking-tight text-[#101828]">
              {metrics.totalTallyPieces.toLocaleString('id-ID')}
            </span>
            <span className="text-sm font-semibold text-gray-500 ml-1.5">Btg</span>
          </div>
        </div>

        {/* Sub-Metric Mini Boxes */}
        <div className="px-4.5 pb-4 pt-1 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50/80 p-2.5 border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              SJ Batang
            </span>
            <span className="text-xs font-bold font-mono tabular-nums text-gray-700 mt-0.5">
              {metrics.totalDeliveredPieces.toLocaleString('id-ID')} Btg
            </span>
          </div>

          <div className="rounded-xl bg-gray-50/80 p-2.5 border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Selisih Batang
            </span>
            <span className="text-xs font-bold font-mono tabular-nums text-gray-900 mt-0.5">
              {metrics.pieceDiscrepancy >= 0 ? `+${metrics.pieceDiscrepancy}` : metrics.pieceDiscrepancy} Btg
            </span>
          </div>
        </div>
      </div>

      {/* 3. Total Outlay */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-emerald-50/50 to-white px-4.5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#00bb7f] shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#101828] uppercase tracking-wider">
              Total Pengeluaran (总应付金额)
            </span>
          </div>
        </div>

        {/* Hero Figure */}
        <div className="px-4.5 pt-3.5 pb-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-[#101828]">
            {formatRupiah(metrics.totalGrandExpenditure)}
          </span>
        </div>

        {/* Sub-Metric Mini Boxes */}
        <div className="px-4.5 pb-4 pt-1 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50/80 p-2.5 border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Net Kayu
            </span>
            <span className="text-[11px] font-bold font-mono tabular-nums text-gray-800 mt-0.5 truncate">
              {formatRupiah(metrics.totalNetTimberPayable)}
            </span>
          </div>

          <div className="rounded-xl bg-gray-50/80 p-2.5 border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Net Ongkir
            </span>
            <span className="text-[11px] font-bold font-mono tabular-nums text-gray-800 mt-0.5 truncate">
              {formatRupiah(metrics.totalNetFreightPayable)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Active Lots */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-purple-50/50 to-white px-4.5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#101828] uppercase tracking-wider">
              Kavling & Batch (批号统计)
            </span>
          </div>
        </div>

        {/* Hero Figure */}
        <div className="px-4.5 pt-3.5 pb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-[#101828]">
              {metrics.activeKavlingCount}
            </span>
            <span className="text-xs font-semibold text-gray-500">Kavling Terpakai</span>
          </div>
        </div>

        {/* Sub-Metric Mini Boxes */}
        <div className="px-4.5 pb-4 pt-1 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50/80 p-2.5 border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Total Rit
            </span>
            <span className="text-xs font-bold font-mono tabular-nums text-gray-800 mt-0.5">
              {metrics.totalRecordsCount} Pengiriman
            </span>
          </div>

          <div className="rounded-xl bg-gray-50/80 p-2.5 border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Status Lapangan
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00bb7f] mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00bb7f]" />
              Aktif TPK
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


