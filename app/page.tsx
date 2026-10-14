'use client';

import React, { useState } from 'react';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useAuth } from '@/src/hooks/useAuth';
import { UserNav } from '@/src/components/layout/UserNav';
import { KpiCards } from '@/src/components/dashboard/KpiCards';
import { SpeciesBar } from '@/src/components/dashboard/SpeciesBar';
import { Toolbar } from '@/src/components/ledger/Toolbar';
import { RecordTable } from '@/src/components/ledger/RecordTable';
import { RecordModal } from '@/src/components/ledger/RecordModal';
import type { WoodReceivingRecord } from '@/src/types';

export default function DashboardPage() {
  const { user, canWrite, isMonitorOnly } = useAuth();

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
    if (!canWrite) return;
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record: WoodReceivingRecord) => {
    if (!canWrite) return;
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Title and UserNav */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Penerimaan Kayu & Manajemen Stok (木材入库与库存管理)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bilingual Timber Gate Receiving, Tally Discrepancy & Material Ledger
          </p>
        </div>
        <UserNav />
      </header>

      {/* KPI Cards */}
      <KpiCards metrics={metrics} />

      {/* Species Distribution Chart */}
      <SpeciesBar
        breakdown={metrics.speciesVolumeBreakdown}
        totalVolume={metrics.totalTallyVolumeM3}
      />

      {/* Conditional Rendering based on Role Level */}
      {isMonitorOnly ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              Mode Monitor Eksekutif (Level 3 - 高管监控)
            </h3>
            <p className="text-xs text-amber-700 mt-1">
              Anda memiliki akses pemantauan metrik KPI dan komposisi spesies kayu. Buku besar penerimaan terperinci dan aksi pengeditan data hanya tersedia untuk otorisasi Level 1 (Manager) & Level 2 (Admin).
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar with Role Gating */}
          <Toolbar
            filters={filters}
            speciesList={speciesList}
            canWrite={canWrite}
            onFilterChange={setFilters}
            onResetDemo={resetDemo}
            onExportCsv={exportCsv}
            onNewEntry={handleNewEntry}
          />

          {/* Data Table with Role Gating */}
          <RecordTable
            records={records}
            canWrite={canWrite}
            onEdit={handleEdit}
            onDelete={deleteRecord}
          />
        </>
      )}

      {/* Add / Edit Modal (Level 1 only) */}
      {canWrite && (
        <RecordModal
          isOpen={isModalOpen}
          initialRecord={editingRecord}
          onClose={() => setIsModalOpen(false)}
          onSave={saveRecord}
        />
      )}
    </div>
  );
}
