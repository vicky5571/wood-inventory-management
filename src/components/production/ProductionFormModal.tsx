'use client';

/**
 * src/components/production/ProductionFormModal.tsx
 *
 * Creation and editing modal for sawmill production logs with live yield preview
 * and soft stock-allowance warning.
 */

import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import type {
  SawmillProductionRecord,
  SawmillProductionFormInput,
  ProductionShift,
  LotStockBalance,
} from '../../types/index.ts';
import { ProductionYieldPreview } from './ProductionYieldPreview.tsx';
import { ProductionInputFields } from './ProductionInputFields.tsx';
import { YardSelect } from '../ledger/YardSelect.tsx';
import { KavlingSelect } from '../ledger/KavlingSelect.tsx';
import { SpeciesCombobox } from '../ledger/SpeciesCombobox.tsx';
import { toast } from '../../utils/toast-store.ts';

export interface ProductionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: SawmillProductionFormInput) => Promise<void>;
  initialData?: SawmillProductionRecord | null;
  productSuggestions?: string[];
  lotBalance?: LotStockBalance | null;
}

const defaultForm: SawmillProductionFormInput = {
  productionDate: new Date().toISOString().split('T')[0],
  shift: 'PAGI',
  sourceStorageYard: 'TPK-Timur',
  sourceKavlingNumber: 'KAV-01',
  inputSpecies: 'Jati',
  inputVolumeM3: 5.0,
  inputPieces: 10,
  outputProduct: 'Papan 2x20x400cm',
  outputVolumeM3: 3.5,
  outputPieces: 12,
  operatorName: '',
  notes: '',
};

export function ProductionFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  productSuggestions = [],
  lotBalance,
}: ProductionFormModalProps) {
  const [form, setForm] = useState<SawmillProductionFormInput>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id,
        productionDate: initialData.productionDate,
        shift: initialData.shift || 'PAGI',
        sourceStorageYard: initialData.sourceStorageYard,
        sourceKavlingNumber: initialData.sourceKavlingNumber,
        inputSpecies: initialData.inputSpecies,
        inputVolumeM3: initialData.inputVolumeM3,
        inputPieces: initialData.inputPieces,
        outputProduct: initialData.outputProduct,
        outputVolumeM3: initialData.outputVolumeM3,
        outputPieces: initialData.outputPieces,
        operatorName: initialData.operatorName,
        notes: initialData.notes || '',
      });
    } else {
      setForm(defaultForm);
    }
    setErrorMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isOverdrawn = lotBalance && Number(form.inputVolumeM3) > lotBalance.remainingVolumeM3;
  const isExceeded = Number(form.outputVolumeM3) > Number(form.inputVolumeM3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isExceeded) {
      setErrorMsg('Volume output tidak boleh melebihi volume input');
      return;
    }
    if (!form.operatorName.trim()) {
      setErrorMsg('Nama operator wajib diisi');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(form);
      toast.success(initialData ? 'Produksi diperbarui' : 'Produksi dicatat');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan catatan produksi';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70">
          <h2 className="text-base font-bold text-gray-900">
            {initialData ? 'Ubah Catatan Produksi Sawmill (编辑生产)' : 'Catat Pemotongan Produksi (锯材生产录入)'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
              {errorMsg}
            </div>
          )}

          {isOverdrawn && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Peringatan: Input ({Number(form.inputVolumeM3).toFixed(4)} m³) melebihi sisa stok kavling{' '}
                ({lotBalance.remainingVolumeM3.toFixed(4)} m³). Penyimpanan tetap diizinkan.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Tanggal *</label>
              <input
                type="date"
                required
                value={form.productionDate}
                onChange={(e) => setForm({ ...form, productionDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-xs"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Shift</label>
              <select
                value={form.shift || 'PAGI'}
                onChange={(e) => setForm({ ...form, shift: e.target.value as ProductionShift })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-xs"
              >
                <option value="PAGI">Pagi</option>
                <option value="SIANG">Siang</option>
                <option value="MALAM">Malam</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Operator *</label>
              <input
                type="text"
                required
                placeholder="Nama operator sawmill"
                value={form.operatorName}
                onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">TPK Asal *</label>
              <YardSelect value={form.sourceStorageYard} onChange={(y) => setForm({ ...form, sourceStorageYard: y })} />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Kavling Asal *</label>
              <KavlingSelect selectedYard={form.sourceStorageYard} value={form.sourceKavlingNumber} onChange={(k) => setForm({ ...form, sourceKavlingNumber: k })} />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Jenis Kayu *</label>
              <SpeciesCombobox value={form.inputSpecies} onChange={(s) => setForm({ ...form, inputSpecies: s })} />
            </div>
          </div>

          <ProductionInputFields
            form={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            productSuggestions={productSuggestions}
          />

          <ProductionYieldPreview
            inputVolumeM3={form.inputVolumeM3}
            outputVolumeM3={form.outputVolumeM3}
          />

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Catatan</label>
            <textarea
              rows={2}
              placeholder="Catatan tambahan hasil pemotongan..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl transition-colors font-medium text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isExceeded}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ffc908] hover:bg-[#e0b007] disabled:opacity-50 text-gray-950 font-bold rounded-xl transition-colors text-xs shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Produksi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
