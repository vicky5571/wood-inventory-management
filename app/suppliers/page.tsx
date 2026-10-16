'use client';

import React, { useState, useMemo } from 'react';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useSuppliers } from '@/src/hooks/useSuppliers';
import { SupplierCard } from '@/src/components/suppliers/SupplierCard';
import { SupplierTable } from '@/src/components/suppliers/SupplierTable';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  List,
  Search,
  Box,
} from 'lucide-react';

export default function SuppliersPage() {
  const { records } = useWoodRecords();
  const { suppliers, stats } = useSuppliers(records);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase().trim();
    return suppliers.filter((s) => {
      const matchName = s.supplierName.toLowerCase().includes(q);
      const matchSpecies = s.primarySpecies.some((sp) => sp.toLowerCase().includes(q));
      return matchName || matchSpecies;
    });
  }, [suppliers, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-700 shrink-0" />
            <span>Manajemen & Evaluasi Pemasok (供应商名录与质检)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Evaluasi keandalan rekanan kayu, metrik selisih fisik vs faktur, dan rekam jejak volume pengiriman.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-sky-50 text-sky-700 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Tampilan Grid Kartu"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'table'
                ? 'bg-sky-50 text-sky-700 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Tampilan Tabel Detail"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Tabel</span>
          </button>
        </div>
      </div>

      {/* Supplier Performance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
              Total Pemasok Aktif
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

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari nama pemasok atau varietas kayu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition shadow-2xs"
        />
      </div>

      {/* Content Rendering: Grid vs Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard key={supplier.supplierName} supplier={supplier} />
          ))}
        </div>
      ) : (
        <SupplierTable suppliers={filteredSuppliers} />
      )}
    </div>
  );
}
