'use client';

import React, { useState, useEffect } from 'react';
import type { ContractFormInput, ContractSortimentInput, PerhutaniContract } from '@/src/types/index';
import { ContractHeaderFields } from './ContractHeaderFields';
import { SortimentItemRow } from './SortimentItemRow';
import { computeContractTotals } from '@/src/utils/contract-calc';
import { X, Plus, Save, FileText } from 'lucide-react';

export interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: ContractFormInput) => Promise<void>;
  initialData?: PerhutaniContract | null;
  initialItems?: ContractSortimentInput[];
}

const DRAFT_KEY = 'wood_contract_draft';

function createDefaultItem(): ContractSortimentInput {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    woodSpecies: 'Jati',
    grade: 'A1',
    woodLengthM: 4,
    volumeM3: 0,
    pieces: 0,
    pricePerM3: 0,
  };
}

export function ContractFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  initialItems,
}: ContractFormModalProps) {
  const [form, setForm] = useState<ContractFormInput>({
    contractNumber: '',
    contractDate: new Date().toISOString().split('T')[0],
    effectiveStartDate: new Date().toISOString().split('T')[0],
    effectiveEndDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
    kphOrigin: 'KPH Randublatung',
    status: 'ACTIVE',
    items: [createDefaultItem()],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id,
        contractNumber: initialData.contractNumber,
        contractDate: initialData.contractDate,
        effectiveStartDate: initialData.effectiveStartDate,
        effectiveEndDate: initialData.effectiveEndDate,
        kphOrigin: initialData.kphOrigin,
        poNumber: initialData.poNumber,
        status: initialData.status,
        notes: initialData.notes,
        items: initialItems && initialItems.length > 0 ? initialItems : [createDefaultItem()],
      });
    } else {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          setForm(JSON.parse(draft));
        } else {
          setForm({
            contractNumber: '',
            contractDate: new Date().toISOString().split('T')[0],
            effectiveStartDate: new Date().toISOString().split('T')[0],
            effectiveEndDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
            kphOrigin: 'KPH Randublatung',
            status: 'ACTIVE',
            items: [createDefaultItem()],
          });
        }
      } catch {
        // fallback
      }
    }
  }, [initialData, initialItems, isOpen]);

  if (!isOpen) return null;

  const totals = computeContractTotals(form.items);

  const handleAddItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, createDefaultItem()],
    }));
  };

  const handleUpdateItem = (index: number, updated: ContractSortimentInput) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = updated;
      const next = { ...prev, items };
      if (!initialData) localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setForm((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      const next = { ...prev, items: items.length > 0 ? items : [createDefaultItem()] };
      if (!initialData) localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(form);
      if (!initialData) localStorage.removeItem(DRAFT_KEY);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xl w-full max-w-4xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                {initialData ? 'Edit Kontrak Perhutani (编辑合同)' : 'Tambah Kontrak Perhutani Baru (录入新合同)'}
              </h2>
              <p className="text-[10px] text-gray-500">Pencatatan data induk kontrak dan rincian alokasi sortimen kayu.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-200/70">
            <h3 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider text-[10px]">1. Informasi Dokumen Kontrak</h3>
            <ContractHeaderFields form={form} onChange={(next) => { setForm(next); if (!initialData) localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); }} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider text-[10px]">2. Rincian Sortimen Kayu ({form.items.length} Baris)</h3>
              <button type="button" onClick={handleAddItem} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Sortimen</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {form.items.map((item, idx) => (
                <SortimentItemRow key={item.id} item={item} index={idx} onChange={(upd) => handleUpdateItem(idx, upd)} onRemove={() => handleRemoveItem(idx)} canRemove={form.items.length > 1} />
              ))}
            </div>
          </div>

          {/* Totals Summary Banner */}
          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-gray-500 font-medium">Total Volume: </span>
              <span className="font-mono font-bold text-gray-900">{totals.totalVolumeM3.toFixed(4)} m³</span>
              <span className="text-gray-400 ml-2">({totals.totalPieces.toLocaleString('id-ID')} btg)</span>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Estimasi Nilai Kontrak: </span>
              <span className="font-mono font-bold text-gray-950 text-sm">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totals.totalValueIDR)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50">
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kontrak (保存)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
