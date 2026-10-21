'use client';

/**
 * src/components/sorting/SortingFormModal.tsx
 *
 * Creation and editing modal for stock sorting redistribution logs with dual kavling selection
 * and soft stock-allowance warning.
 */

import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import type {
  StockSortingRecord,
  StockSortingFormInput,
  LotStockBalance,
} from '../../types/index.ts';
import { KavlingPickerDual } from './KavlingPickerDual.tsx';
import { SortingReasonCombobox } from './SortingReasonCombobox.tsx';
import { SpeciesCombobox } from '../ledger/SpeciesCombobox.tsx';
import { toast } from '../../utils/toast-store.ts';

export interface SortingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: StockSortingFormInput) => Promise<void>;
  initialData?: StockSortingRecord | null;
  reasonSuggestions?: string[];
  sourceLotBalance?: LotStockBalance | null;
}

const defaultForm: StockSortingFormInput = {
  sortingDate: new Date().toISOString().split('T')[0],
  species: 'Jati', sourceStorageYard: 'TPK-Timur', sourceKavlingNumber: 'KAV-01',
  targetStorageYard: 'TPK-Timur', targetKavlingNumber: 'KAV-02',
  volumeM3: 3.0, pieces: 6,
  reason: 'Regrade kualitas B ke kavling sortimen kecil',
  operatorName: '', notes: '',
};

export function SortingFormModal({
  isOpen, onClose, onSave, initialData, reasonSuggestions = [], sourceLotBalance,
}: SortingFormModalProps) {
  const [form, setForm] = useState<StockSortingFormInput>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id, sortingDate: initialData.sortingDate, species: initialData.species,
        sourceStorageYard: initialData.sourceStorageYard, sourceKavlingNumber: initialData.sourceKavlingNumber,
        targetStorageYard: initialData.targetStorageYard, targetKavlingNumber: initialData.targetKavlingNumber,
        volumeM3: initialData.volumeM3, pieces: initialData.pieces,
        reason: initialData.reason, operatorName: initialData.operatorName, notes: initialData.notes || '',
      });
    } else {
      setForm(defaultForm);
    }
    setErrorMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isSelfTransfer =
    form.sourceStorageYard.trim().toLowerCase() === form.targetStorageYard.trim().toLowerCase() &&
    form.sourceKavlingNumber.trim().toLowerCase() === form.targetKavlingNumber.trim().toLowerCase();

  const isOverdrawn = sourceLotBalance && Number(form.volumeM3) > sourceLotBalance.remainingVolumeM3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isSelfTransfer) {
      setErrorMsg('Kavling tujuan tidak boleh sama dengan kavling asal');
      return;
    }
    if (!form.operatorName.trim()) {
      setErrorMsg('Nama operator wajib diisi');
      return;
    }
    if (!form.reason.trim()) {
      setErrorMsg('Alasan sortir wajib diisi');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(form);
      toast.success(initialData ? 'Data sortir diperbarui' : 'Sortir berhasil dicatat');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan catatan sortir';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-surface-base border border-border-default rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-surface-raised">
          <h2 className="text-base font-semibold text-foreground">
            {initialData ? 'Ubah Catatan Sortir Stok' : 'Catat Pemindahan / Sortir Stok'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted hover:text-foreground rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          {isOverdrawn && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Peringatan: Volume sortir ({Number(form.volumeM3).toFixed(4)} m3) melebihi sisa stok kavling asal{' '}
                ({sourceLotBalance.remainingVolumeM3.toFixed(4)} m3). Penyimpanan tetap diizinkan.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-muted font-medium mb-1">Tanggal *</label>
              <input
                type="date"
                required
                value={form.sortingDate}
                onChange={(e) => setForm({ ...form, sortingDate: e.target.value })}
                className="w-full px-3 py-2 bg-surface-raised border border-border-default rounded-md text-foreground focus:outline-none focus:border-primary text-xs"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Jenis Kayu *</label>
              <SpeciesCombobox value={form.species} onChange={(s) => setForm({ ...form, species: s })} />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Operator *</label>
              <input
                type="text"
                required
                placeholder="Nama operator sortir"
                value={form.operatorName}
                onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
                className="w-full px-3 py-2 bg-surface-raised border border-border-default rounded-md text-foreground focus:outline-none focus:border-primary text-xs"
              />
            </div>
          </div>

          <KavlingPickerDual
            sourceYard={form.sourceStorageYard}
            onSourceYardChange={(y) => setForm({ ...form, sourceStorageYard: y })}
            sourceKavling={form.sourceKavlingNumber}
            onSourceKavlingChange={(k) => setForm({ ...form, sourceKavlingNumber: k })}
            targetYard={form.targetStorageYard}
            onTargetYardChange={(y) => setForm({ ...form, targetStorageYard: y })}
            targetKavling={form.targetKavlingNumber}
            onTargetKavlingChange={(k) => setForm({ ...form, targetKavlingNumber: k })}
          />

          <div className="grid grid-cols-2 gap-3 p-3 bg-surface-raised/50 border border-border-subtle rounded-lg">
            <div>
              <label className="block text-muted font-medium mb-1">Volume Dipindah (m3) *</label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={form.volumeM3}
                onChange={(e) => setForm({ ...form, volumeM3: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-raised border border-border-default rounded-md text-foreground focus:outline-none focus:border-primary text-xs"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Jumlah Batang Dipindah *</label>
              <input
                type="number"
                min="1"
                required
                value={form.pieces}
                onChange={(e) => setForm({ ...form, pieces: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-raised border border-border-default rounded-md text-foreground focus:outline-none focus:border-primary text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted font-medium mb-1">Alasan Sortir / Pemindahan *</label>
            <SortingReasonCombobox
              value={form.reason}
              onChange={(r) => setForm({ ...form, reason: r })}
              suggestions={reasonSuggestions}
            />
          </div>

          <div>
            <label className="block text-muted font-medium mb-1">Catatan</label>
            <textarea
              rows={2}
              placeholder="Catatan tambahan sortir..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 bg-surface-raised border border-border-default rounded-md text-foreground focus:outline-none focus:border-primary text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border-default hover:bg-surface-raised text-foreground rounded-lg transition-colors font-medium text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSelfTransfer}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-lg transition-colors font-medium text-xs shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Sortir'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
