'use client';

/**
 * src/components/production/ProductionEmptyState.tsx
 *
 * Empty state prompt when no sawmill production records are found.
 */

import React from 'react';
import { Factory, Plus } from 'lucide-react';

export interface ProductionEmptyStateProps {
  hasFilters: boolean;
  onResetFilters?: () => void;
  onOpenCreateModal?: () => void;
  canCreate?: boolean;
}

export function ProductionEmptyState({
  hasFilters,
  onResetFilters,
  onOpenCreateModal,
  canCreate = true,
}: ProductionEmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-[#ffc908]/40 flex items-center justify-center text-[#b38600]">
        <Factory className="w-6 h-6" />
      </div>
      <div className="max-w-md">
        <h3 className="text-sm font-bold text-gray-900 mb-1">
          {hasFilters ? 'Tidak Ada Catatan yang Cocok (无匹配记录)' : 'Belum Ada Catatan Produksi Sawmill (暂无锯材生产记录)'}
        </h3>
        <p className="text-xs text-gray-500">
          {hasFilters
            ? 'Coba sesuaikan kata kunci pencarian, shift, atau rentang tanggal filter Anda.'
            : 'Mulai catat pemotongan log kayu mentah menjadi papan, kaso, atau balok untuk melacak rendemen dan waste secara akurat.'}
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
              <span>Catat Produksi Pertama (录入首条生产)</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
