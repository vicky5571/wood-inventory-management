'use client';

import React, { useState } from 'react';
import { useTimberPrices } from '../../src/hooks/useTimberPrices';
import { useWoodRecords } from '../../src/hooks/useWoodRecords';
import { useSuppliers } from '../../src/hooks/useSuppliers';
import { useAuth } from '../../src/hooks/useAuth';
import { PriceTable } from '../../src/components/prices/PriceTable';
import { PriceFormModal } from '../../src/components/prices/PriceFormModal';
import type { TimberPriceEntry } from '../../src/types/index.ts';
import { DollarSign, Plus, RefreshCw, AlertCircle } from 'lucide-react';

export default function PricesPage() {
  const { user } = useAuth();
  const canWrite = user?.roleLevel === 1;

  const {
    activeEntries,
    expiredEntries,
    isLoading,
    error,
    refresh,
    saveEntry,
    deleteEntry,
  } = useTimberPrices();

  const { speciesList } = useWoodRecords();
  const { suppliers } = useSuppliers();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimberPriceEntry | null>(null);

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: TimberPriceEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus patokan harga ini?')) {
      try {
        await deleteEntry(id);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Gagal menghapus patokan harga');
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tabel Harga Kayu</h1>
              <p className="text-xs text-gray-500">
                Basis data harga patokan kayu dan tarif PPh untuk penutupan laporan otomatis
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-2xs"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          {canWrite && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Harga</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table */}
      <PriceTable
        activeEntries={activeEntries}
        expiredEntries={expiredEntries}
        canWrite={canWrite}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {/* Form Modal */}
      <PriceFormModal
        isOpen={isModalOpen}
        entry={editingEntry}
        speciesList={speciesList}
        suppliers={suppliers}
        onClose={() => setIsModalOpen(false)}
        onSave={saveEntry}
      />
    </div>
  );
}
