'use client';

import React, { useState } from 'react';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useAuth } from '@/src/hooks/useAuth';
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
      {/* Page Title & Operational Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight">
            Ringkasan Operasional & Buku Besar (运营概况与总账)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pencatatan kayu masuk, verifikasi tally fisik, dan pelaporan logistik material pabrik.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 bg-white rounded-xl border border-gray-200/80 text-xs text-gray-700 shadow-2xs">
          <span className="inline-block w-2 h-2 rounded-full bg-[#00bb7f] animate-pulse" />
          <span className="font-semibold text-gray-800">Sinkronisasi Realtime Aktif</span>
        </div>
      </div>

      {/* KPI Cards Section */}
      <section id="dashboard" className="scroll-mt-24">
        <KpiCards metrics={metrics} />
      </section>

      {/* Species Distribution Chart Section */}
      <section id="species" className="scroll-mt-24">
        <SpeciesBar
          breakdown={metrics.speciesVolumeBreakdown}
          totalVolume={metrics.totalTallyVolumeM3}
        />
      </section>

      {/* Conditional Rendering based on Role Level */}
      {isMonitorOnly ? (
        <div className="bg-amber-50/60 border border-[#ffc908]/60 rounded-2xl p-5 text-gray-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#101828] flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ffc908]" />
              Mode Monitor Eksekutif (Level 3 - 高管监控)
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Anda memiliki akses pemantauan metrik KPI dan komposisi spesies kayu. Buku besar penerimaan terperinci dan aksi pengeditan data hanya tersedia untuk otorisasi Level 1 (Manager) & Level 2 (Admin).
            </p>
          </div>
        </div>
      ) : (
        <section id="ledger" className="scroll-mt-24 flex flex-col gap-6">
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
        </section>
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
