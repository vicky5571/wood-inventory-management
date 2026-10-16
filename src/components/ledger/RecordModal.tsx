'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { computeRecordCalculations } from '@/src/utils/timber-calc.ts';
import { toast } from '@/src/utils/toast-store';
import {
  hasMeaningfulDraftData,
  loadRecordDraft,
  saveRecordDraft,
  clearRecordDraft,
} from '@/src/utils/record-draft';
import { DraftRecoveryBanner } from './DraftRecoveryBanner';
import { RecordDocumentSection } from './RecordDocumentSection';
import { RecordMeasurementSection } from './RecordMeasurementSection';
import { RecordFinancialSection } from './RecordFinancialSection';
import { RecordReconciliationCard } from './RecordReconciliationCard';
import { X, Scale, CheckCircle2 } from 'lucide-react';

export const DRAFT_KEY = 'wood_record_form_draft_v1';

const defaultRecord = (): Partial<WoodReceivingRecord> => ({
  id: `rec-${Date.now()}`,
  receiptDate: new Date().toISOString().slice(0, 10),
  truckPlateNumber: '',
  forestryDocNumber: '',
  receiptNumber: `KW-${Date.now().toString().slice(-4)}`,
  contractNumber: '',
  supplierName: '',
  woodSpecies: '',
  woodLengthM: 4.0,
  kavlingNumber: 'KAV-01',
  storageYard: 'TPK-1',
  deliveredPieces: 0,
  deliveredVolumeM3: 0,
  tallyPieces: 0,
  tallyVolumeM3: 0,
  timberPricePerM3: 0,
  timberPphRate: 0.5,
  freightRatePerM3: 0,
  freightPphAmount: 0,
  brokerFee: 0,
});

export function RecordModal({
  isOpen,
  initialRecord,
  availableSpecies,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  initialRecord: WoodReceivingRecord | null;
  availableSpecies?: string[];
  onClose: () => void;
  onSave: (record: WoodReceivingRecord) => void;
}) {
  const [form, setForm] = useState<Partial<WoodReceivingRecord>>({});
  const [pendingDraft, setPendingDraft] = useState<Partial<WoodReceivingRecord> | null>(null);

  // Initialize form or check uncommitted auto-draft on modal open
  useEffect(() => {
    if (!isOpen) {
      setPendingDraft(null);
      return;
    }

    if (initialRecord) {
      setForm({ ...initialRecord });
      setPendingDraft(null);
    } else {
      setForm(defaultRecord());
      const draft = loadRecordDraft();
      if (draft && hasMeaningfulDraftData(draft)) {
        setPendingDraft(draft);
      } else {
        setPendingDraft(null);
      }
    }
  }, [initialRecord, isOpen]);

  // Debounced auto-save when in Add mode and form has meaningful data
  useEffect(() => {
    if (!isOpen || initialRecord) return;
    if (!hasMeaningfulDraftData(form)) return;

    const timer = setTimeout(() => {
      saveRecordDraft(form);
    }, 400);

    return () => clearTimeout(timer);
  }, [form, initialRecord, isOpen]);

  // Live Math Preview
  const preview = useMemo(
    () =>
      computeRecordCalculations({
        tallyVolumeM3: Math.max(0, Number(form.tallyVolumeM3) || 0),
        deliveredVolumeM3: Math.max(0, Number(form.deliveredVolumeM3) || 0),
        tallyPieces: Math.max(0, Number(form.tallyPieces) || 0),
        deliveredPieces: Math.max(0, Number(form.deliveredPieces) || 0),
        timberPricePerM3: Math.max(0, Number(form.timberPricePerM3) || 0),
        timberPphRate: Math.max(0, Number(form.timberPphRate) || 0),
        freightRatePerM3: Math.max(0, Number(form.freightRatePerM3) || 0),
        freightPphAmount: Math.max(0, Number(form.freightPphAmount) || 0),
        brokerFee: Math.max(0, Number(form.brokerFee) || 0),
      }),
    [form]
  );

  if (!isOpen) return null;

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setForm((prev) => ({ ...defaultRecord(), ...prev, ...pendingDraft }));
      setPendingDraft(null);
      toast.info(
        'Draf Berhasil Dipulihkan (草稿已恢复)',
        'Data formulir telah dimuat ulang dari penyimpanan draf terakhir.'
      );
    }
  };

  const handleDiscardDraft = () => {
    clearRecordDraft();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(DRAFT_KEY);
    }
    setPendingDraft(null);
    toast.info('Draf Dihapus (草稿已丢弃)', 'Draf belum tersimpan berhasil dibersihkan.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(initialRecord);
    const savedRecord: WoodReceivingRecord = {
      ...(form as WoodReceivingRecord),
      timberGrossTotal: preview.timberGrossTotal,
      timberPphAmount: preview.timberPphAmount,
      timberNetPayable: preview.timberNetPayable,
      freightGrossTotal: preview.freightGrossTotal,
      freightNetPayable: preview.freightNetPayable,
      grandNetPayable: preview.grandNetPayable,
      createdAt: form.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedRecord);

    // Clean up draft upon successful creation
    if (!initialRecord) {
      clearRecordDraft();
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(DRAFT_KEY);
      }
      setPendingDraft(null);
    }

    const plate = savedRecord.truckPlateNumber ? `Truk ${savedRecord.truckPlateNumber}` : 'Data Penerimaan';
    const vol = savedRecord.tallyVolumeM3 ? `${savedRecord.tallyVolumeM3} m³` : '0 m³';
    const species = savedRecord.woodSpecies ? ` • ${savedRecord.woodSpecies}` : '';

    toast.success(
      isEdit ? 'Data Penerimaan Berhasil Diperbarui (入库已更新)' : 'Penerimaan Kayu Berhasil Disimpan (新增入库成功)',
      `${plate} • Vol Tally: ${vol}${species}`
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101828]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-gray-100 overflow-hidden">
        {/* Brand Accent Bar (LMS IOH Gold & Red) */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#ffc908] via-[#ffc908] to-[#ed1c24]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ffc908]/20 flex items-center justify-center text-[#101828]">
              <Scale className="w-5 h-5 text-[#b38600]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#101828] tracking-tight">
                {initialRecord ? 'Edit Penerimaan Kayu (编辑入库)' : 'Input Penerimaan Kayu Baru (新增木材入库)'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Verifikasi tally fisik, surat jalan pengiriman, dan kalkulasi pembayaran netto.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Uncommitted Draft Recovery Banner */}
        {pendingDraft && (
          <DraftRecoveryBanner
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-5">
          <RecordDocumentSection
            form={form}
            setForm={setForm}
            availableSpecies={availableSpecies}
          />
          <RecordMeasurementSection form={form} setForm={setForm} />
          <RecordFinancialSection form={form} setForm={setForm} />
          <RecordReconciliationCard preview={preview} />

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition shadow-2xs cursor-pointer"
            >
              Batal (取消)
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-[#101828] bg-[#ffc908] hover:bg-[#f0bc00] active:scale-[0.99] rounded-xl shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#101828]" />
              <span>Simpan Data (保存入库)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
