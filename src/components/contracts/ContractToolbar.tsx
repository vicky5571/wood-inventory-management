'use client';

import React from 'react';
import type { ContractStatus } from '@/src/types/index';
import { Search, X, Filter, AlertCircle, Clock } from 'lucide-react';

export interface ContractToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: ContractStatus | 'ALL';
  onStatusChange: (status: ContractStatus | 'ALL') => void;
  nearExpiryOnly: boolean;
  onNearExpiryChange: (val: boolean) => void;
  overdueOnly: boolean;
  onOverdueChange: (val: boolean) => void;
}

export function ContractToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  nearExpiryOnly,
  onNearExpiryChange,
  overdueOnly,
  onOverdueChange,
}: ContractToolbarProps) {
  return (
    <div className="p-3 bg-white rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col lg:flex-row gap-3 items-center justify-between">
      {/* Search Input */}
      <div className="relative w-full lg:w-80">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari No Kontrak, KPH asal, PO/SPK..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filters and Toggles */}
      <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as any)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="ALL">Semua Status (全部)</option>
            <option value="ACTIVE">Aktif (生效中)</option>
            <option value="FULFILLED">Selesai (已履约)</option>
            <option value="EXPIRED">Kadaluarsa (已过期)</option>
            <option value="DRAFT">Draf (草稿)</option>
            <option value="CANCELLED">Dibatalkan (已取消)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => onNearExpiryChange(!nearExpiryOnly)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition cursor-pointer ${
            nearExpiryOnly
              ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-700" />
          <span>Mendekati Berakhir (≤30h)</span>
        </button>

        <button
          type="button"
          onClick={() => onOverdueChange(!overdueOnly)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition cursor-pointer ${
            overdueOnly
              ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Lewat Tempo</span>
        </button>
      </div>
    </div>
  );
}
