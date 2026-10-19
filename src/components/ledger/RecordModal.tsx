'use client';

import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import type { WoodReceivingRecord, ManifestFormInput, ManifestItemInput } from '@/src/types';
import { computeManifestCalculations } from '@/src/utils/timber-calc.ts';
import { toast } from '@/src/utils/toast-store';
import {
  hasMeaningfulManifestDraft,
  hasMeaningfulDraftData,
  loadManifestDraft,
  saveManifestDraft,
  clearManifestDraft,
  loadRecordDraft,
  clearRecordDraft,
} from '@/src/utils/record-draft';
import { DraftRecoveryBanner } from './DraftRecoveryBanner';
import { RecordDocumentSection } from './RecordDocumentSection';
import { ManifestItemsTable } from './ManifestItemsTable';
import { RecordFinancialSection } from './RecordFinancialSection';
import { RecordReconciliationCard } from './RecordReconciliationCard';
import { useSettings } from '@/src/hooks/useSettings';
import { X, Scale, CheckCircle2, Zap } from 'lucide-react';
import { getQuickReceivingDraft } from '@/src/utils/dev-quick-fill.ts';

export const DRAFT_KEY = 'wood_record_form_draft_v1';
export const MANIFEST_DRAFT_KEY = 'wood_manifest_form_draft_v1';

const defaultRecord = (defaultBrokerFee: number = 0): Partial<WoodReceivingRecord> => ({
  id: `rec-${Date.now()}`, receiptDate: new Date().toISOString().slice(0, 10),
  truckPlateNumber: '', forestryDocNumber: '', receiptNumber: `KW-${Date.now().toString().slice(-4)}`,
  contractNumber: '', supplierName: '', woodSpecies: '', woodLengthM: 4.0,
  kavlingNumber: 'KAV-01', storageYard: 'TPK-Timur', freightRatePerM3: 0, freightPphAmount: 0, brokerFee: defaultBrokerFee,
});

const createItem = (r?: Partial<WoodReceivingRecord>, defaultTimberPphRate: number = 0.5): ManifestItemInput => ({
  id: r?.item_id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  woodSpecies: r?.woodSpecies || '', woodLengthM: r?.woodLengthM ?? 4.0,
  kavlingNumber: r?.kavlingNumber || 'KAV-01', storageYard: r?.storageYard || 'TPK-Timur',
  deliveredPieces: r?.deliveredPieces ?? 0, deliveredVolumeM3: r?.deliveredVolumeM3 ?? 0,
  tallyPieces: r?.tallyPieces ?? 0, tallyVolumeM3: r?.tallyVolumeM3 ?? 0,
  timberPricePerM3: r?.timberPricePerM3 ?? 0, timberPphRate: r?.timberPphRate ?? defaultTimberPphRate,
});

export function RecordModal({
  isOpen, initialRecord, allRecords, availableSpecies, onClose, onSave,
}: {
  isOpen: boolean;
  initialRecord: WoodReceivingRecord | null;
  allRecords?: WoodReceivingRecord[];
  availableSpecies?: string[];
  onClose: () => void;
  onSave: (record: WoodReceivingRecord, manifest?: ManifestFormInput) => void;
}) {
  const { settings } = useSettings();
  const [form, setForm] = useState<Partial<WoodReceivingRecord>>({});
  const [items, setItems] = useState<ManifestItemInput[]>([]);
  const [pendingDraft, setPendingDraft] = useState<Partial<ManifestFormInput> | null>(null);

  useEffect(() => {
    if (!isOpen) { setPendingDraft(null); return; }
    if (initialRecord) {
      const manifestId = initialRecord.manifest_id || initialRecord.id;
      const siblings = allRecords
        ? allRecords.filter((r) => (r.manifest_id && r.manifest_id === manifestId) || r.id === manifestId)
        : [];
      const editItems = siblings.length > 0
        ? siblings.map((r) => createItem(r, settings.defaultTimberPphRate))
        : [createItem(initialRecord, settings.defaultTimberPphRate)];
      const totalBrokerFee = siblings.length > 1
        ? siblings.reduce((sum, s) => sum + (s.brokerFee || 0), 0)
        : (initialRecord.brokerFee || 0);

      setForm({ ...initialRecord, manifest_id: manifestId, brokerFee: totalBrokerFee });
      setItems(editItems);
      setPendingDraft(null);
    } else {
      setForm(defaultRecord(settings.defaultBrokerFee));
      setItems([createItem(undefined, settings.defaultTimberPphRate)]);
      const mDraft = loadManifestDraft();
      if (mDraft && hasMeaningfulManifestDraft(mDraft)) {
        setPendingDraft(mDraft);
      } else {
        const rDraft = loadRecordDraft();
        setPendingDraft(rDraft && hasMeaningfulDraftData(rDraft) ? { ...rDraft, items: [createItem(rDraft, settings.defaultTimberPphRate)] } : null);
      }
    }
  }, [initialRecord, allRecords, isOpen, settings.defaultBrokerFee, settings.defaultTimberPphRate]);

  useEffect(() => {
    if (!isOpen || initialRecord) return;
    const draftPayload: Partial<ManifestFormInput> = { ...form, items };
    if (!hasMeaningfulManifestDraft(draftPayload)) return;
    const timer = setTimeout(() => saveManifestDraft(draftPayload), 400);
    return () => clearTimeout(timer);
  }, [form, items, initialRecord, isOpen]);

  const handleItemsChange = useCallback((nextItems: ManifestItemInput[]) => {
    setItems(nextItems);
  }, []);

  const handleQuickFill = useCallback(() => {
    const { form: devForm, items: devItems } = getQuickReceivingDraft(availableSpecies);
    setForm((prev) => ({ ...prev, ...devForm }));
    setItems(devItems);
    toast.info('Form Terisi Otomatis (开发填充)', 'Data sampel penerimaan multi-item telah dimuat.');
  }, [availableSpecies]);

  const manifestPayload: ManifestFormInput = useMemo(() => ({
    id: form.manifest_id || (initialRecord?.manifest_id ?? `man-${Date.now()}`),
    receiptDate: form.receiptDate || new Date().toISOString().slice(0, 10),
    docDate: form.docDate, truckPlateNumber: form.truckPlateNumber || '',
    forestryDocNumber: form.forestryDocNumber || '', receiptNumber: form.receiptNumber || '',
    contractNumber: form.contractNumber || '', supplierName: form.supplierName || '',
    freightRatePerM3: Math.max(0, Number(form.freightRatePerM3) || 0),
    freightPphAmount: form.freightPphAmount, brokerFee: Math.max(0, Number(form.brokerFee) || 0),
    paymentStatus: form.paymentStatus, invoiceNumber: form.invoiceNumber,
    paymentDate: form.paymentDate, paymentNotes: form.paymentNotes, items,
  }), [form, items, initialRecord]);

  const deferredManifestPayload = useDeferredValue(manifestPayload);
  const preview = useMemo(() => computeManifestCalculations(deferredManifestPayload), [deferredManifestPayload]);

  if (!isOpen) return null;

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setForm((prev) => ({ ...defaultRecord(settings.defaultBrokerFee), ...prev, ...pendingDraft }));
      if (Array.isArray(pendingDraft.items) && pendingDraft.items.length > 0) setItems(pendingDraft.items);
      setPendingDraft(null);
      toast.info('Draf Berhasil Dipulihkan (草稿已恢复)', 'Data formulir telah dimuat ulang.');
    }
  };

  const handleDiscardDraft = () => {
    clearManifestDraft(); clearRecordDraft();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(MANIFEST_DRAFT_KEY); window.localStorage.removeItem(DRAFT_KEY);
    }
    setPendingDraft(null);
    toast.info('Draf Dihapus (草稿已丢弃)', 'Draf belum tersimpan dibersihkan.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitPreview = computeManifestCalculations(manifestPayload);
    const primary = items[0] || createItem(form, settings.defaultTimberPphRate);
    const savedRecord: WoodReceivingRecord = {
      ...(form as WoodReceivingRecord),
      manifest_id: manifestPayload.id, item_id: primary.id,
      woodSpecies: primary.woodSpecies || form.woodSpecies || '',
      woodLengthM: primary.woodLengthM ?? form.woodLengthM ?? 4.0,
      kavlingNumber: primary.kavlingNumber || form.kavlingNumber || 'KAV-01',
      storageYard: primary.storageYard || form.storageYard || 'TPK-Timur',
      deliveredPieces: submitPreview.totalDeliveredPieces, deliveredVolumeM3: submitPreview.totalDeliveredVolumeM3,
      tallyPieces: submitPreview.totalTallyPieces, tallyVolumeM3: submitPreview.totalTallyVolumeM3,
      timberPricePerM3: primary.timberPricePerM3, timberPphRate: primary.timberPphRate,
      timberGrossTotal: submitPreview.totalTimberGross, timberPphAmount: submitPreview.totalTimberPph,
      timberNetPayable: submitPreview.totalTimberNet, freightGrossTotal: submitPreview.freightGrossTotal,
      freightNetPayable: submitPreview.freightNetPayable, grandNetPayable: submitPreview.grandNetPayable,
      createdAt: form.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    onSave(savedRecord, manifestPayload);

    if (!initialRecord) {
      clearManifestDraft(); clearRecordDraft();
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(MANIFEST_DRAFT_KEY); window.localStorage.removeItem(DRAFT_KEY);
      }
      setPendingDraft(null);
    }

    const plate = savedRecord.truckPlateNumber ? `Truk ${savedRecord.truckPlateNumber}` : 'Data Penerimaan';
    const vol = savedRecord.tallyVolumeM3 ? `${savedRecord.tallyVolumeM3} m³` : '0 m³';
    const count = items.length > 1 ? ` • ${items.length} jenis` : '';
    toast.success(Boolean(initialRecord) ? 'Data Diperbarui (入库已更新)' : 'Penerimaan Disimpan (新增入库成功)', `${plate} • Vol: ${vol}${count}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101828]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-gray-100 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#ffc908] via-[#ffc908] to-[#ed1c24]" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ffc908]/20 flex items-center justify-center text-[#101828]">
              <Scale className="w-5 h-5 text-[#b38600]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#101828] tracking-tight">
                {initialRecord ? 'Edit Penerimaan Kayu (编辑入库)' : 'Input Penerimaan Kayu Baru (新增木材入库)'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Verifikasi surat jalan, muatan kayu multi-item, dan rekonsiliasi neto.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickFill}
              className="px-2.5 py-1 text-2xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg flex items-center gap-1 transition cursor-pointer"
              title="Isi otomatis formulir penerimaan dengan data sampel dev"
            >
              <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
              <span>Isi Cepat (Dev)</span>
            </button>
            <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer" aria-label="Tutup">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {pendingDraft && <DraftRecoveryBanner onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-5">
          <RecordDocumentSection form={form} setForm={setForm} availableSpecies={availableSpecies} hideSpeciesSection={true} />
          <ManifestItemsTable items={items} onChange={handleItemsChange} availableSpecies={availableSpecies} />
          <RecordFinancialSection form={form} setForm={setForm} hideTimberPricing={true} />
          <RecordReconciliationCard preview={preview} />

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition shadow-2xs cursor-pointer">
              Batal (取消)
            </button>
            <button type="submit" className="px-6 py-2.5 text-xs font-bold text-[#101828] bg-[#ffc908] hover:bg-[#f0bc00] active:scale-[0.99] rounded-xl shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer">
              <CheckCircle2 className="w-4 h-4 text-[#101828]" />
              <span>Simpan Data (保存入库)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
