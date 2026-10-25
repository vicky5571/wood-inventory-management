'use client';

/**
 * src/components/sorting/SortingToolbar.tsx
 *
 * Search input, date range filters, and create trigger for stock sorting logs.
 */

import React from 'react';
import { Search, Plus, Filter, X } from 'lucide-react';

export interface SortingToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onOpenCreateModal: () => void;
  canCreate?: boolean;
}

export function SortingToolbar({
  searchQuery,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onOpenCreateModal,
  canCreate = true,
}: SortingToolbarProps) {
  const hasActiveFilters = Boolean(searchQuery || startDate || endDate);

  const resetFilters = () => {
    onSearchChange('');
    onStartDateChange('');
    onEndDateChange('');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-3.5 space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari jenis kayu, alasan sortir, kavling, operator..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-gray-900 placeholder:text-gray-400 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Create Button */}
        {canCreate && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#ffc908] hover:bg-[#e0b007] text-gray-950 text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Sortir Stok (分拣录入)</span>
          </button>
        )}
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-1.5 text-gray-500 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Rentang Tanggal:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            placeholder="Mulai"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            placeholder="Sampai"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-xs text-amber-800 hover:text-amber-950 font-semibold cursor-pointer underline underline-offset-2"
          >
            Reset Filter
          </button>
        )}
      </div>
    </div>
  );
}
