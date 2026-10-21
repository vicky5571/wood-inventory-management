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
    <div className="bg-surface-raised border border-border-default rounded-xl p-3.5 space-y-3 shadow-sm">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari jenis kayu, alasan sortir, kavling, operator..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface-base border border-border-default rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-0.5"
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
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Sortir Stok</span>
          </button>
        )}
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-subtle text-xs">
        <div className="flex items-center gap-1.5 text-muted font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Rentang Tanggal:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-2 py-1 text-xs bg-surface-base border border-border-default rounded text-foreground focus:outline-none focus:border-primary"
            placeholder="Mulai"
          />
          <span className="text-muted">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="px-2 py-1 text-xs bg-surface-base border border-border-default rounded text-foreground focus:outline-none focus:border-primary"
            placeholder="Sampai"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-xs text-muted hover:text-foreground underline underline-offset-2"
          >
            Reset Filter
          </button>
        )}
      </div>
    </div>
  );
}
