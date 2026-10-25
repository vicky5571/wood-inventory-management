import React from 'react';
import type { DashboardMetrics } from '@/src/types';
import { classifyDiscrepancy } from '@/src/utils/timber-calc';
import { Layers, Box, Wallet, Building2, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { KpiCardPendingPricing } from './KpiCardPendingPricing';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function renderDiscrepancyBadge(diff: number, unit: string, isInteger: boolean = false) {
  const status = classifyDiscrepancy(diff);
  const absVal = isInteger ? Math.abs(diff).toString() : Math.abs(diff).toFixed(2);

  if (status === 'match') {
    return (
      <span className="inline-flex items-center gap-1 font-bold font-mono tabular-nums text-xs mt-0.5 text-slate-600">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        {isInteger ? '0' : '0.00'} {unit}
      </span>
    );
  }

  const isSurplus = diff > 0;
  return (
    <span className={`inline-flex items-center gap-1 font-bold font-mono tabular-nums text-xs mt-0.5 ${isSurplus ? 'text-blue-600' : 'text-[#ed1c24]'}`}>
      {isSurplus ? <TrendingUp className="w-3.5 h-3.5 shrink-0 text-blue-600" /> : <TrendingDown className="w-3.5 h-3.5 shrink-0 text-[#ed1c24]" />}
      {isSurplus ? '+' : '-'}{absVal} {unit}
    </span>
  );
}

function SubMetricBox({ title, children, isRose = false }: { title: string; children: React.ReactNode; isRose?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-1.5 border flex flex-col justify-center ${
      isRose ? 'bg-rose-50/60 border-rose-100/80 text-rose-700' : 'bg-gray-50/80 border-gray-100 text-slate-600'
    }`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 leading-tight">{title}</span>
      <div className="mt-0.5 leading-tight">{children}</div>
    </div>
  );
}

export function KpiCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {/* 1. Total Volume Hero Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group">
        <div className="h-1 w-full bg-[#ffc908]" />
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-amber-50/50 to-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ffc908]/20 flex items-center justify-center text-[#b38600] shrink-0">
              <Box className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#101828] uppercase tracking-wide">
              Total Volume Tally <span className="text-[11px] font-normal normal-case text-gray-500 tracking-normal">(检尺立方)</span>
            </span>
          </div>
        </div>
        <div className="px-4 pt-3.5 pb-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono tracking-tight text-[#101828]">{metrics.totalTallyVolumeM3.toFixed(2)}</span>
            <span className="text-sm font-semibold text-gray-500">m³</span>
          </div>
        </div>
        <div className="mt-auto px-4 pb-3.5 pt-1 flex flex-col gap-1.5">
          <SubMetricBox title="Surat Jalan">
            <span className="text-xs font-bold font-mono tabular-nums text-gray-700">{metrics.totalDeliveredVolumeM3.toFixed(2)} m³</span>
          </SubMetricBox>
          <SubMetricBox title="Selisih Fisik">
            {renderDiscrepancyBadge(metrics.volumeDiscrepancyM3, 'm³', false)}
          </SubMetricBox>
        </div>
      </div>

      {/* 2. Total Batang Tally */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group">
        <div className="h-1 w-full bg-blue-500" />
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-blue-50/50 to-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#101828] uppercase tracking-wide">
              Batang Tally <span className="text-[11px] font-normal normal-case text-gray-500 tracking-normal">(检尺根数)</span>
            </span>
          </div>
        </div>
        <div className="px-4 pt-3.5 pb-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono tracking-tight text-[#101828]">{metrics.totalTallyPieces.toLocaleString('id-ID')}</span>
            <span className="text-sm font-semibold text-gray-500">Btg</span>
          </div>
        </div>
        <div className="mt-auto px-4 pb-3.5 pt-1 flex flex-col gap-1.5">
          <SubMetricBox title="SJ Batang">
            <span className="text-xs font-bold font-mono tabular-nums text-gray-700">{metrics.totalDeliveredPieces.toLocaleString('id-ID')} Btg</span>
          </SubMetricBox>
          <SubMetricBox title="Selisih Batang">
            {renderDiscrepancyBadge(metrics.pieceDiscrepancy, 'Btg', true)}
          </SubMetricBox>
        </div>
      </div>

      {/* 3. Total Outlay & Accounts Payable */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group">
        <div className="h-1 w-full bg-[#00bb7f]" />
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-emerald-50/50 to-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#00bb7f] shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#101828] uppercase tracking-wide">
              Total Pengeluaran <span className="text-[11px] font-normal normal-case text-gray-500 tracking-normal">(总应付金额)</span>
            </span>
          </div>
          {metrics.totalOutstandingPayable > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-[#ed1c24] border border-rose-200/80">
              {metrics.unpaidRecordsCount} Belum Lunas
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#00bb7f] border border-emerald-200/80">
              Lunas
            </span>
          )}
        </div>
        <div className="px-4 pt-3.5 pb-2.5">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold font-mono tracking-tight text-[#101828]">{formatRupiah(metrics.totalGrandExpenditure)}</span>
          </div>
        </div>
        <div className="mt-auto px-4 pb-3.5 pt-1 flex flex-col gap-1.5">
          <SubMetricBox title="Hutang AP (未付)" isRose>
            <span className="text-xs font-bold font-mono tabular-nums text-rose-800">
              {formatRupiah(metrics.totalOutstandingPayable)}
            </span>
          </SubMetricBox>
          <SubMetricBox title="Net Kayu">
            <span className="text-xs font-bold font-mono tabular-nums text-gray-800">
              {formatRupiah(metrics.totalNetTimberPayable)}
            </span>
          </SubMetricBox>
        </div>
      </div>

      {/* 4. Active Lots */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group">
        <div className="h-1 w-full bg-purple-500" />
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-purple-50/50 to-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#101828] uppercase tracking-wide">
              Kavling & Batch <span className="text-[11px] font-normal normal-case text-gray-500 tracking-normal">(批号统计)</span>
            </span>
          </div>
        </div>
        <div className="px-4 pt-3.5 pb-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono tracking-tight text-[#101828]">{metrics.activeKavlingCount}</span>
            <span className="text-xs font-semibold text-gray-500">Kavling Terpakai</span>
          </div>
        </div>
        <div className="mt-auto px-4 pb-3.5 pt-1 flex flex-col gap-1.5">
          <SubMetricBox title="Total Rit">
            <span className="text-xs font-bold font-mono tabular-nums text-gray-800">{metrics.totalRecordsCount} Pengiriman</span>
          </SubMetricBox>
          <SubMetricBox title="Status Lapangan">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00bb7f]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00bb7f]" />
              Aktif TPK
            </span>
          </SubMetricBox>
        </div>
      </div>

      {/* 5. Alarm Diskrepansi */}
      <div className={`bg-white rounded-2xl border transition-all flex flex-col overflow-hidden group shadow-xs hover:shadow-md ${
        (metrics.recordsWithAlarmCount ?? 0) > 0 ? 'border-rose-300 ring-1 ring-rose-200' : 'border-gray-200/80'
      }`}>
        <div className={`h-1 w-full ${(metrics.recordsWithAlarmCount ?? 0) > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
        <div className={`flex items-center justify-between border-b px-4 py-3 ${
          (metrics.recordsWithAlarmCount ?? 0) > 0
            ? 'border-rose-100 bg-gradient-to-br from-rose-50/70 to-white'
            : 'border-gray-100 bg-gradient-to-br from-emerald-50/40 to-white'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              (metrics.recordsWithAlarmCount ?? 0) > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#101828] uppercase tracking-wide">
              Alarm Diskrepansi <span className="text-[11px] font-normal normal-case text-gray-500 tracking-normal">(超差警报)</span>
            </span>
          </div>
          {(metrics.recordsWithAlarmCount ?? 0) > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Kritis
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Aman
            </span>
          )}
        </div>
        <div className="px-4 pt-3.5 pb-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold font-mono tracking-tight ${
              (metrics.recordsWithAlarmCount ?? 0) > 0 ? 'text-rose-600' : 'text-[#101828]'
            }`}>
              {metrics.recordsWithAlarmCount ?? 0}
            </span>
            <span className="text-xs font-semibold text-gray-500">Rit Terindikasi</span>
          </div>
        </div>
        <div className="mt-auto px-4 pb-3.5 pt-1 flex flex-col gap-1.5">
          <SubMetricBox title="Ambang Batas">
            <span className="text-xs font-bold font-mono tabular-nums text-gray-700">1.5m³ / 2.0%</span>
          </SubMetricBox>
          <SubMetricBox title="Status Evaluasi" isRose={(metrics.recordsWithAlarmCount ?? 0) > 0}>
            <span className={`text-xs font-bold ${(metrics.recordsWithAlarmCount ?? 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {(metrics.recordsWithAlarmCount ?? 0) > 0 ? 'Perlu Investigasi' : 'Toleransi Wajar'}
            </span>
          </SubMetricBox>
        </div>
      </div>

      {/* 6. Pending Pricing Card */}
      <KpiCardPendingPricing metrics={metrics} />
    </div>
  );
}
