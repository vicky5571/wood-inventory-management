'use client';

/**
 * src/components/sorting/SortingEmptyState.tsx
 *
 * Empty state prompt when no stock sorting records are found.
 */

import React from 'react';
import { ArrowLeftRight, Plus } from 'lucide-react';

export interface SortingEmptyStateProps {
  hasFilters: boolean;
  onResetFilters?: () => void;
  onOpenCreateModal?: () => void;
  canCreate?: boolean;
}

export function SortingEmptyState({
  hasFilters,
  onResetFilters,
  onOpenCreateModal,
  canCreate = true,
}: SortingEmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-[#ffc908]/40 flex items-center justify-center text-[#b38600]">
        <ArrowLeftRight className="w-6 h-6" />
      </div>
      <div className="max-w-md">
        <h3 className="text-sm font-bold text-gray-900 mb-1">
          {hasFilters ? 'Tidak Ada Catatan yang Cocok (无匹配记录)' : 'Belum Ada Catatan Sortir / Mutasi Kavling (暂无分拣调拨记录)'}
        </h3>
        <p className="text-xs text-gray-500">
          {hasFilters
            ? 'Coba sesuaikan kata kunci pencarian atau rentang tanggal filter Anda.'
            : 'Gunakan fitur sortir untuk memindahkan stok antar kavling (regrade kualitas, pemisahan sortimen, atau konsolidasi penumpukan) dengan akurasi net-zero inventori.'}
        </p>
      </div>
      <div className="mt-2">
        {hasFilters ? (
          onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
            >
              Reset Filter
            </button>
          )
        ) : (
          canCreate && onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Sortir Pertama (录入首条分拣)</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
