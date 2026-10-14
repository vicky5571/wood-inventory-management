'use client';

import React, { useState } from 'react';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { KpiCards } from '@/src/components/dashboard/KpiCards';
import { SpeciesBar } from '@/src/components/dashboard/SpeciesBar';
import { Toolbar } from '@/src/components/ledger/Toolbar';
import { RecordTable } from '@/src/components/ledger/RecordTable';
import { RecordModal } from '@/src/components/ledger/RecordModal';
import type { WoodReceivingRecord } from '@/src/types';

export default function DashboardPage() {
  const {
    records,
    metrics,
    filters,
    speciesList,
    setFilters,
    saveRecord,
    deleteRecord,
    resetDemo,
    exportCsv,
  } = useWoodRecords();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WoodReceivingRecord | null>(null);

  const handleNewEntry = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record: WoodReceivingRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Penerimaan Kayu & Manajemen Stok (木材入库与库存管理)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bilingual Timber Gate Receiving, Tally Discrepancy & Material Ledger
          </p>
        </div>
      </header>

      {/* KPI Cards */}
      <KpiCards metrics={metrics} />

      {/* Species Distribution Chart */}
      <SpeciesBar
        breakdown={metrics.speciesVolumeBreakdown}
        totalVolume={metrics.totalTallyVolumeM3}
      />

      {/* Toolbar */}
      <Toolbar
        filters={filters}
        speciesList={speciesList}
        onFilterChange={setFilters}
        onResetDemo={resetDemo}
        onExportCsv={exportCsv}
        onNewEntry={handleNewEntry}
      />

      {/* Data Table */}
      <RecordTable
        records={records}
        onEdit={handleEdit}
        onDelete={deleteRecord}
      />

      {/* Add / Edit Modal */}
      <RecordModal
        isOpen={isModalOpen}
        initialRecord={editingRecord}
        onClose={() => setIsModalOpen(false)}
        onSave={saveRecord}
      />
    </div>
  );
}
