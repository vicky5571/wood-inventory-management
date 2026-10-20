'use client';

import React from 'react';
import { Search, X, Filter } from 'lucide-react';

export interface InventoryToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedYard: string;
  onYardChange: (yard: string) => void;
  availableYards: string[];
  hideDepleted: boolean;
  onHideDepletedChange: (hide: boolean) => void;
}

export function InventoryToolbar({
  searchQuery,
  onSearchChange,
  selectedYard,
  onYardChange,
  availableYards,
  hideDepleted,
  onHideDepletedChange,
}: InventoryToolbarProps) {
  return (
    <div className="p-3 bg-white rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari lokasi gudang / nomor kavling..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Reset pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">TPK:</span>
          <select
            value={selectedYard}
            onChange={(e) => onYardChange(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="ALL">Semua Gudang (全部TPK)</option>
            {availableYards.map((yard) => (
              <option key={yard} value={yard}>
                {yard}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200/70 transition">
          <input
            type="checkbox"
            checked={hideDepleted}
            onChange={(e) => onHideDepletedChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
          <span className="font-medium">Sembunyikan kavling kosong (隐藏空库位)</span>
        </label>
      </div>
    </div>
  );
}
