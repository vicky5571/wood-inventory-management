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
    <div className="bg-surface-raised border border-border-default rounded-xl p-8 sm:p-12 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
        <ArrowLeftRight className="w-7 h-7" />
      </div>
      <div className="max-w-md mx-auto space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">
          {hasFilters ? 'Tidak ada catatan yang cocok' : 'Belum ada catatan sortir / mutasi kavling'}
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          {hasFilters
            ? 'Coba sesuaikan kata kunci pencarian atau rentang tanggal filter Anda.'
            : 'Gunakan fitur sortir untuk memindahkan stok antar kavling (regrade kualitas, pemisahan sortimen, atau konsolidasi penumpukan) dengan akurasi net-zero inventori.'}
        </p>
      </div>
      <div>
        {hasFilters ? (
          onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-foreground bg-surface-base border border-border-default hover:bg-surface-overlay rounded-lg transition-colors"
            >
              Reset Filter
            </button>
          )
        ) : (
          canCreate && onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Sortir Pertama</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
