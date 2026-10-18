'use client';

import React from 'react';
import Link from 'next/link';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useWoodSalesRecords } from '@/src/hooks/useWoodSalesRecords';
import { useAuth } from '@/src/hooks/useAuth';
import { KpiCards } from '@/src/components/dashboard/KpiCards';
import { VolumeTrendChart } from '@/src/components/analytics/VolumeTrendChart';
import { SpeciesDonutChart } from '@/src/components/analytics/SpeciesDonutChart';
import { SupplierBarChart } from '@/src/components/analytics/SupplierBarChart';
import { FinancialOutlayBreakdown } from '@/src/components/analytics/FinancialOutlayBreakdown';
import { InventoryFlowChart } from '@/src/components/analytics/InventoryFlowChart';
import { CustomerSalesBarChart } from '@/src/components/analytics/CustomerSalesBarChart';
import {
  TableProperties,
  Building2,
  History,
  Settings,
  ArrowRight,
  Truck,
} from 'lucide-react';

export default function AnalyticsDashboardPage() {
  const { isMonitorOnly } = useAuth();
  const { records, metrics } = useWoodRecords();
  const { sales } = useWoodSalesRecords(records);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
            Ringkasan Eksekutif & Analitik (运营概况与分析)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Ikhtisar kubikasi kayu masuk, verifikasi tally fisik, arus pengeluaran penjualan, dan performa pabrik.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/ledger"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span>Buku Penerimaan</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </Link>
          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-[#ffc908]" />
            <span>Buku Penjualan</span>
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

      {/* 2. Primary Inbound Charts: Volume Trend & Species Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5" aria-label="Primary Charts">
        <VolumeTrendChart records={records} />
        <SpeciesDonutChart records={records} />
      </section>

      {/* 3. Sales & Inventory Flow Analytics: Inbound vs Outbound & Top Customers */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5" aria-label="Sales and Inventory Flow Analytics">
        <InventoryFlowChart inboundRecords={records} salesRecords={sales} />
        <CustomerSalesBarChart salesRecords={sales} />
      </section>

      {/* 4. Secondary Analytics: Supplier Ranking & Cost Outlay Structure */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5" aria-label="Secondary Analytics">
        <SupplierBarChart records={records} />
        <FinancialOutlayBreakdown metrics={metrics} />
      </section>

      {/* 5. Navigation Jump Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
        <Link
          href="/ledger"
          className="group bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <TableProperties className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Buku Penerimaan</h4>
            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">Penerimaan & tally kayu masuk.</p>
          </div>
        </Link>

        <Link
          href="/sales"
          className="group bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Buku Penjualan & DO</h4>
            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">Pengeluaran kayu & DO pembeli.</p>
          </div>
        </Link>

        <Link
          href="/suppliers"
          className="group bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-sky-600 transition-transform group-hover:translate-x-1" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Manajemen Pemasok</h4>
            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">Evaluasi rekanan & akurasi tally.</p>
          </div>
        </Link>

        <Link
          href="/activity"
          className="group bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-1" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Jejak Audit</h4>
            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">Riwayat penambahan & koreksi.</p>
          </div>
        </Link>

        <Link
          href="/settings"
          className="group bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-1" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Pengaturan Sistem</h4>
            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">Katalog kayu & kapasitas TPK.</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
