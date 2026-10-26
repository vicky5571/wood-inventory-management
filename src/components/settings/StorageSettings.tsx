'use client';

import React, { useState } from 'react';
import type { AppSettings, StorageLotWithYard, StorageYard } from '@/src/types';
import { Warehouse, MapPin, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { useStorageLocations } from '@/src/hooks/useStorageLocations';
import { YardSection } from './storage/YardSection';
import { AddYardModal } from './storage/AddYardModal';
import { AddLotModal } from './storage/AddLotModal';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';

export interface StorageSettingsProps {
  settings: AppSettings;
  canWrite: boolean;
  lotOccupancy: Record<string, number>;
}

export function StorageSettings({ settings, canWrite, lotOccupancy }: StorageSettingsProps) {
  const {
    yards,
    lots,
    isLoading,
    error,
    refresh,
    addYard,
    addLot,
    updateLotStatus,
    deleteLot,
    deleteYard,
  } = useStorageLocations();

  const [isAddYardOpen, setIsAddYardOpen] = useState(false);
  const [isAddLotOpen, setIsAddLotOpen] = useState(false);
  const [addLotYardId, setAddLotYardId] = useState<string | undefined>(undefined);
  const [lotToDelete, setLotToDelete] = useState<StorageLotWithYard | null>(null);
  const [yardToDelete, setYardToDelete] = useState<StorageYard | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpenAddLot = (yardId?: string) => {
    setAddLotYardId(yardId);
    setIsAddLotOpen(true);
  };

  const handleConfirmDeleteLot = async () => {
    if (!lotToDelete) return;
    setActionError(null);
    try {
      await deleteLot(lotToDelete.id);
      setLotToDelete(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal menghapus kavling');
    }
  };

  const handleConfirmDeleteYard = async () => {
    if (!yardToDelete) return;
    setActionError(null);
    try {
      await deleteYard(yardToDelete.id);
      setYardToDelete(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal menghapus yard');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Facility Metadata Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>{settings.yardName}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                {settings.yardCode}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Tempat Penimbunan Kayu (TPK) Operasional Pengeringan & Logistik Bahan Baku
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span>Zona Industri Utama</span>
          </div>
          {canWrite && (
            <button
              type="button"
              onClick={() => setIsAddYardOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Yard</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-semibold text-red-600 hover:text-red-800 ml-2 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-red-200 rounded-lg hover:bg-red-100 transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-gray-100 h-28 rounded-2xl border border-gray-200" />
          ))}
        </div>
      )}

      {!isLoading && yards.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 p-8">
          <Warehouse className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Belum ada lokasi penyimpanan tersimpan.</p>
          <p className="text-xs text-gray-400 mt-1">Tambahkan yard penimbunan untuk mengelompokkan kavling kayu.</p>
          {canWrite && (
            <button
              type="button"
              onClick={() => setIsAddYardOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Yard Pertama</span>
            </button>
          )}
        </div>
      )}

      {/* Yard Sections */}
      {!isLoading &&
        yards.map((yard) => (
          <YardSection
            key={yard.id}
            yard={yard}
            lots={lots}
            lotOccupancy={lotOccupancy}
            canWrite={canWrite}
            onOpenAddLot={handleOpenAddLot}
            onDeleteYard={(target) => setYardToDelete(target)}
            onStatusChange={updateLotStatus}
            onDeleteLot={(target) => setLotToDelete(target)}
          />
        ))}

      {/* Modals & Dialogs */}
      <AddYardModal
        isOpen={isAddYardOpen}
        onClose={() => setIsAddYardOpen(false)}
        onSave={addYard}
      />

      <AddLotModal
        isOpen={isAddLotOpen}
        onClose={() => setIsAddLotOpen(false)}
        yards={yards}
        initialYardId={addLotYardId}
        onSave={addLot}
      />

      <ConfirmDialog
        isOpen={lotToDelete !== null}
        title="Hapus Kavling"
        description={`Apakah Anda yakin ingin menghapus kavling ${lotToDelete?.lotCode || ''}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Kavling"
        isDestructive={true}
        onConfirm={handleConfirmDeleteLot}
        onCancel={() => setLotToDelete(null)}
      />

      <ConfirmDialog
        isOpen={yardToDelete !== null}
        title="Hapus Yard"
        description={`Apakah Anda yakin ingin menghapus yard ${yardToDelete?.name || ''} (${yardToDelete?.yardCode || ''})?`}
        confirmLabel="Hapus Yard"
        isDestructive={true}
        onConfirm={handleConfirmDeleteYard}
        onCancel={() => setYardToDelete(null)}
      />
    </div>
  );
}
