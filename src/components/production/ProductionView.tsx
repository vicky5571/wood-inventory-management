'use client';

/**
 * src/components/production/ProductionView.tsx
 *
 * Coordinator view for Sawmill Production Logging.
 * Integrates KPI metrics, filters, data table, modals, and persistence.
 */

import React, { useState, useMemo } from 'react';
import { useProductionRecords } from '../../hooks/useProductionRecords.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { ProductionKpiStrip } from './ProductionKpiStrip.tsx';
import { ProductionToolbar } from './ProductionToolbar.tsx';
import { ProductionTable } from './ProductionTable.tsx';
import { ProductionEmptyState } from './ProductionEmptyState.tsx';
import { ProductionFormModal } from './ProductionFormModal.tsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';
import type { SawmillProductionRecord } from '../../types/index.ts';

export function ProductionView() {
  const { user, canWrite } = useAuth();
  const {
    records,
    isSyncing,
    saveRecord,
    deleteRecord,
    productSuggestions,
  } = useProductionRecords();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShift, setSelectedShift] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SawmillProductionRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canDelete = user?.roleLevel === 1;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedShift !== 'ALL' && (r.shift || '') !== selectedShift) return false;
      if (startDate && r.productionDate < startDate) return false;
      if (endDate && r.productionDate > endDate) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchProduct = r.outputProduct.toLowerCase().includes(q);
        const matchSpecies = r.inputSpecies.toLowerCase().includes(q);
        const matchOperator = r.operatorName.toLowerCase().includes(q);
        const matchYard = r.sourceStorageYard.toLowerCase().includes(q);
        const matchKav = r.sourceKavlingNumber.toLowerCase().includes(q);
        const matchNotes = (r.notes || '').toLowerCase().includes(q);
        if (!matchProduct && !matchSpecies && !matchOperator && !matchYard && !matchKav && !matchNotes) {
          return false;
        }
      }
      return true;
    });
  }, [records, selectedShift, startDate, endDate, searchQuery]);

  const dateRange = useMemo(() => {
    if (startDate && endDate) return { startDate, endDate };
    return undefined;
  }, [startDate, endDate]);

  const handleEdit = (record: SawmillProductionRecord) => {
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

  const hasActiveFilters = Boolean(searchQuery || selectedShift !== 'ALL' || startDate || endDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Produksi Sawmill
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Pencatatan pemotongan log mentah menjadi produk sawn timber dan kalkulasi rendemen
          </p>
        </div>
        {isSyncing && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-full self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>Sinkronisasi server...</span>
          </div>
        )}
      </div>

      <ProductionKpiStrip records={filteredRecords} dateRange={dateRange} />

      <ProductionToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedShift={selectedShift}
        onShiftChange={setSelectedShift}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onOpenCreateModal={handleOpenCreate}
        canCreate={canWrite}
      />

      {filteredRecords.length > 0 ? (
        <ProductionTable
          records={filteredRecords}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteId(id)}
          canEdit={canWrite}
          canDelete={canDelete}
        />
      ) : (
        <ProductionEmptyState
          hasFilters={hasActiveFilters}
          onResetFilters={() => {
            setSearchQuery('');
            setSelectedShift('ALL');
            setStartDate('');
            setEndDate('');
          }}
          onOpenCreateModal={handleOpenCreate}
          canCreate={canWrite}
        />
      )}

      <ProductionFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={async (input) => {
          await saveRecord(input);
        }}
        initialData={editingRecord}
        productSuggestions={productSuggestions}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Hapus Catatan Produksi"
        description="Apakah Anda yakin ingin menghapus catatan produksi ini? Tindakan ini dapat diurungkan sesaat setelah dihapus."
        confirmLabel="Hapus Data"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
