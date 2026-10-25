'use client';

/**
 * src/components/sorting/SortingView.tsx
 *
 * Coordinator view for Stock Sorting and Kavling Redistribution Logging.
 * Integrates KPI metrics, filters, data table, modals, and persistence.
 */

import React, { useState, useMemo } from 'react';
import { useSortingRecords } from '../../hooks/useSortingRecords.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { SortingKpiStrip } from './SortingKpiStrip.tsx';
import { SortingToolbar } from './SortingToolbar.tsx';
import { SortingTable } from './SortingTable.tsx';
import { SortingEmptyState } from './SortingEmptyState.tsx';
import { SortingFormModal } from './SortingFormModal.tsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';
import type { StockSortingRecord } from '../../types/index.ts';

export function SortingView() {
  const { user, canWrite } = useAuth();
  const {
    records,
    isSyncing,
    saveRecord,
    deleteRecord,
    reasonSuggestions,
  } = useSortingRecords();

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StockSortingRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canDelete = user?.roleLevel === 1;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (startDate && r.sortingDate < startDate) return false;
      if (endDate && r.sortingDate > endDate) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSpecies = r.species.toLowerCase().includes(q);
        const matchReason = r.reason.toLowerCase().includes(q);
        const matchOperator = r.operatorName.toLowerCase().includes(q);
        const matchSrcYard = r.sourceStorageYard.toLowerCase().includes(q);
        const matchSrcKav = r.sourceKavlingNumber.toLowerCase().includes(q);
        const matchTgtYard = r.targetStorageYard.toLowerCase().includes(q);
        const matchTgtKav = r.targetKavlingNumber.toLowerCase().includes(q);
        const matchNotes = (r.notes || '').toLowerCase().includes(q);
        if (
          !matchSpecies &&
          !matchReason &&
          !matchOperator &&
          !matchSrcYard &&
          !matchSrcKav &&
          !matchTgtYard &&
          !matchTgtKav &&
          !matchNotes
        ) {
          return false;
        }
      }
      return true;
    });
  }, [records, startDate, endDate, searchQuery]);

  const handleEdit = (record: StockSortingRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    await deleteRecord(id);
  };

  const hasActiveFilters = Boolean(searchQuery || startDate || endDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#101828]">
            Sortir & Mutasi Stok Kavling
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Pencatatan perpindahan dan pemilahan log kayu antar kavling TPK dengan pergeseran net-zero inventori
          </p>
        </div>
        {isSyncing && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Sinkronisasi server...</span>
          </div>
        )}
      </div>

      <SortingKpiStrip records={filteredRecords} />

      <SortingToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onOpenCreateModal={handleOpenCreate}
        canCreate={canWrite}
      />

      {filteredRecords.length > 0 ? (
        <SortingTable
          records={filteredRecords}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteId(id)}
          canEdit={canWrite}
          canDelete={canDelete}
        />
      ) : (
        <SortingEmptyState
          hasFilters={hasActiveFilters}
          onResetFilters={() => {
            setSearchQuery('');
            setStartDate('');
            setEndDate('');
          }}
          onOpenCreateModal={handleOpenCreate}
          canCreate={canWrite}
        />
      )}

      <SortingFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={async (input) => {
          await saveRecord(input);
        }}
        initialData={editingRecord}
        reasonSuggestions={reasonSuggestions}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Hapus Catatan Sortir"
        description="Apakah Anda yakin ingin menghapus catatan sortir ini? Perpindahan stok pada kedua kavling akan dibatalkan."
        confirmLabel="Hapus Data"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
