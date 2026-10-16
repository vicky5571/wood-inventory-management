'use client';

import React from 'react';
import Link from 'next/link';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useAuth } from '@/src/hooks/useAuth';
import { KpiCards } from '@/src/components/dashboard/KpiCards';
import { VolumeTrendChart } from '@/src/components/analytics/VolumeTrendChart';
import { SpeciesDonutChart } from '@/src/components/analytics/SpeciesDonutChart';
import { SupplierBarChart } from '@/src/components/analytics/SupplierBarChart';
import { FinancialOutlayBreakdown } from '@/src/components/analytics/FinancialOutlayBreakdown';
import {
  TableProperties,
  Building2,
  History,
  Settings,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function AnalyticsDashboardPage() {
  const { isMonitorOnly } = useAuth();
  const { records, metrics } = useWoodRecords();

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
            Ringkasan Eksekutif & Analitik (运营概况与分析)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Ikhtisar kubikasi kayu masuk, verifikasi tally fisik, dan visualisasi kinerja operasional pabrik.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/ledger"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span>Buka Buku Besar (入库总账)</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* Role Notice for Level 3 Monitor */}
      {isMonitorOnly && (
        <div className="bg-amber-50/60 border border-[#ffc908]/60 rounded-2xl p-4 text-gray-900 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffc908] shrink-0" />
            <p className="text-xs text-gray-700">
              <strong className="font-semibold text-gray-900">Mode Monitor Eksekutif (Level 3):</strong> Anda dapat melihat seluruh metrik analitik, grafik visualisasi, dan laporan performa pabrik.
            </p>
          </div>
        </div>
      )}

      {/* 1. Executive KPI Metric Cards */}
      <section aria-label="KPI Cards">
        <KpiCards metrics={metrics} />
      </section>

      {/* 2. Primary Charts Grid: Volume Inflow Trend & Species Composition */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5" aria-label="Primary Charts">
        <VolumeTrendChart records={records} />
        <SpeciesDonutChart records={records} />
      </section>

      {/* 3. Secondary Charts Grid: Supplier Performance & Financial Structure */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5" aria-label="Secondary Analytics">
        <SupplierBarChart records={records} />
        <FinancialOutlayBreakdown metrics={metrics} />
      </section>

      {/* 4. Operational Navigation Jump Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <Link
          href="/ledger"
          className="group bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <TableProperties className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 group-hover:text-amber-900 transition-colors">
              Buku Besar Penerimaan (总账)
            </h4>
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
              Tabel lengkap pencatatan truk, dokumen kehutanan, kalkulator dimensi, dan ekspor CSV.
            </p>
          </div>
        </Link>

        <Link
          href="/suppliers"
          className="group bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 group-hover:text-sky-900 transition-colors">
              Manajemen Pemasok (供应商)
            </h4>
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
              Direktori rekanan logistik, evaluasi selisih tally, dan peringkat kualitas pengiriman.
            </p>
          </div>
        </Link>

        <Link
          href="/activity"
          className="group bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <History className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 group-hover:text-purple-900 transition-colors">
              Jejak Audit Aktivitas (审计日志)
            </h4>
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
              Log kronologis setiap penambahan kayu, koreksi data, dan mutasi inventaris gudang.
            </p>
          </div>
        </Link>

        <Link
          href="/settings"
          className="group bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <Settings className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 group-hover:text-slate-900 transition-colors">
              Pengaturan Sistem (系统设置)
            </h4>
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
              Katalog varietas kayu tropis, tarif pajak PPh pasal 22/23, dan kapasitas kavling TPK.
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}
