'use client';

import React, { useState } from 'react';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useAuth } from '@/src/hooks/useAuth';
import { useActivityLog } from '@/src/hooks/useActivityLog';
import { Toolbar } from '@/src/components/ledger/Toolbar';
import { RecordTable } from '@/src/components/ledger/RecordTable';
import { RecordModal } from '@/src/components/ledger/RecordModal';
import { PrintReceivingSlipModal } from '@/src/components/ledger/PrintReceivingSlipModal';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import type { WoodReceivingRecord, ManifestFormInput } from '@/src/types';
import { TableProperties, ShieldAlert } from 'lucide-react';

export default function LedgerPage() {
  const { canWrite, isMonitorOnly, user } = useAuth();
  const { addLog } = useActivityLog();

  const {
    records,
    filters,
    speciesList,
    setFilters,
    saveRecord,
    saveManifest,
    deleteRecord,
    resetDemo,
    exportCsv,
  } = useWoodRecords();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WoodReceivingRecord | null>(null);
  const [printingRecord, setPrintingRecord] = useState<WoodReceivingRecord | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingRecord = pendingDeleteId ? records.find((r) => r.id === pendingDeleteId) : null;


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

  const handleSave = (record: WoodReceivingRecord, manifest?: ManifestFormInput) => {
    const isEdit = Boolean(editingRecord);
    if (manifest && manifest.items && manifest.items.length > 0) {
      saveManifest(manifest);
    } else {
      saveRecord(record);
    }

    addLog({
      action: isEdit ? 'RECORD_UPDATED' : 'RECORD_CREATED',
      entityId: record.id,
      entitySummary: `Truk ${record.truckPlateNumber || '-'} • ${record.tallyVolumeM3} m³ (${record.woodSpecies})`,
      operatorName: user?.name,
      operatorRole: user?.title,
    });
  };

  const handleDelete = (id: string) => {
    const target = records.find((r) => r.id === id);
    deleteRecord(id);

    if (target) {
      addLog({
        action: 'RECORD_DELETED',
        entityId: id,
        entitySummary: `Truk ${target.truckPlateNumber || '-'} • ${target.tallyVolumeM3} m³ (${target.woodSpecies})`,
        operatorName: user?.name,
        operatorRole: user?.title,
      });
    }
  };

  const handleResetDemo = () => {
    resetDemo();
    addLog({
      action: 'DEMO_RESET',
      entitySummary: 'Reset database penerimaan ke 4 data demonstrasi standar',
      operatorName: user?.name,
      operatorRole: user?.title,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
            <TableProperties className="w-5 h-5 text-amber-700 shrink-0" />
            <span>Buku Besar Penerimaan Kayu (入库总账)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pencatatan manifes truk, verifikasi dokumen legal kehutanan, kalkulasi kubikasi, dan pembayaran.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-2xs">
          <span className="text-gray-500">Total Baris:</span>
          <span className="font-bold text-gray-900">{records.length} Transaksi</span>
        </div>
      </div>

      {/* Role Restriction Banner */}
      {isMonitorOnly ? (
        <div className="bg-amber-50/60 border border-[#ffc908]/60 rounded-2xl p-5 text-gray-900 shadow-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[#101828]">
              Akses Mode Monitor (Level 3 - 高管监控)
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Buku besar penerimaan terperinci dan penambahan data hanya dapat dimodifikasi oleh Level 1 (Manager) dan Level 2 (Admin). Silakan gunakan halaman Ringkasan untuk memantau metrik eksekutif.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Action Toolbar */}
          <Toolbar
            filters={filters}
            speciesList={speciesList}
            canWrite={canWrite}
            onFilterChange={setFilters}
            onResetDemo={handleResetDemo}
            onExportCsv={exportCsv}
            onNewEntry={handleNewEntry}
          />

          {/* Ledger Table */}
          <RecordTable
            records={records}
            canWrite={canWrite}
            searchQuery={filters.searchQuery}
            onEdit={handleEdit}
            onDelete={(id) => setPendingDeleteId(id)}
            onPrint={(r) => setPrintingRecord(r)}
            onResetFilters={() => setFilters({})}
          />
        </div>
      )}

      {/* Input / Edit Modal */}
      {canWrite && (
        <RecordModal
          isOpen={isModalOpen}
          initialRecord={editingRecord}
          allRecords={records}
          availableSpecies={speciesList}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}

      {/* Printable Receiving Slip Modal */}
      <PrintReceivingSlipModal
        isOpen={Boolean(printingRecord)}
        record={printingRecord}
        onClose={() => setPrintingRecord(null)}
      />

      {/* Delete Confirmation Safeguard Dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteId)}
        title="Hapus Penerimaan Kayu? (确认删除入库记录)"
        description={
          pendingRecord
            ? `Data penerimaan Truk ${pendingRecord.truckPlateNumber || '-'} • ${pendingRecord.woodSpecies} (${pendingRecord.tallyVolumeM3} m³) akan dihapus dari buku besar. Tindakan ini dapat diurungkan melalui notifikasi setelahnya.`
            : 'Data penerimaan kayu akan dihapus dari buku besar. Tindakan ini dapat diurungkan melalui notifikasi setelahnya.'
        }
        confirmLabel="Hapus Penerimaan"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          if (pendingDeleteId) {
            handleDelete(pendingDeleteId);
          }
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
