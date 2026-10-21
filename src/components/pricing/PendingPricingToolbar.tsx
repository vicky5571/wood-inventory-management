'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';

export interface PendingPricingToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSupplier: string;
  onSupplierChange: (supplier: string) => void;
  suppliers: string[];
  totalFiltered: number;
}

export function PendingPricingToolbar({
  searchQuery,
  onSearchChange,
  selectedSupplier,
  onSupplierChange,
  suppliers,
  totalFiltered,
}: PendingPricingToolbarProps) {
  const hasFilters = searchQuery.trim() !== '' || selectedSupplier !== '';

  const handleReset = () => {
    onSearchChange('');
    onSupplierChange('');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-3.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari plat nomor, no. penerimaan, supplier... (搜索)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:bg-white transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Supplier Dropdown */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={selectedSupplier}
            onChange={(e) => onSupplierChange(e.target.value)}
            className="text-xs py-2 px-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ffc908] cursor-pointer"
          >
            <option value="">Semua Pemasok (全部供应商)</option>
            {suppliers.map((sup) => (
              <option key={sup} value={sup}>
                {sup}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>

      <div className="text-xs font-medium text-gray-500">
        Menampilkan <span className="font-bold text-gray-900 font-mono">{totalFiltered}</span> muatan
      </div>
    </div>
  );
}
