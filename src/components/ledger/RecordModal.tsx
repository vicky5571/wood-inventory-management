'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { WoodReceivingRecord } from '../../types/index.ts';
import { computeRecordCalculations } from '../../utils/timber-calc.ts';
import { X, Calculator } from 'lucide-react';

const formatRupiah = (num: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

const defaultRecord = (): Partial<WoodReceivingRecord> => ({
  id: `rec-${Date.now()}`, receiptDate: new Date().toISOString().slice(0, 10),
  truckPlateNumber: '', forestryDocNumber: '', receiptNumber: `KW-${Date.now().toString().slice(-4)}`,
  contractNumber: '', supplierName: '', woodSpecies: '', woodLengthM: 4.0,
  kavlingNumber: 'KAV-01', storageYard: 'TPK-1', deliveredPieces: 0, deliveredVolumeM3: 0,
  tallyPieces: 0, tallyVolumeM3: 0, timberPricePerM3: 0, timberPphRate: 0.5,
  freightRatePerM3: 0, freightPphAmount: 0, brokerFee: 0,
});

export function RecordModal({
  isOpen, initialRecord, onClose, onSave,
}: {
  isOpen: boolean;
  initialRecord: WoodReceivingRecord | null;
  onClose: () => void;
  onSave: (record: WoodReceivingRecord) => void;
}) {
  const [form, setForm] = useState<Partial<WoodReceivingRecord>>({});

  useEffect(() => {
    setForm(initialRecord ? initialRecord : defaultRecord());
  }, [initialRecord, isOpen]);

  // Live Math Preview
  const preview = useMemo(() => computeRecordCalculations({
    tallyVolumeM3: Math.max(0, Number(form.tallyVolumeM3) || 0),
    deliveredVolumeM3: Math.max(0, Number(form.deliveredVolumeM3) || 0),
    tallyPieces: Math.max(0, Number(form.tallyPieces) || 0),
    deliveredPieces: Math.max(0, Number(form.deliveredPieces) || 0),
    timberPricePerM3: Math.max(0, Number(form.timberPricePerM3) || 0),
    timberPphRate: Math.max(0, Number(form.timberPphRate) || 0),
    freightRatePerM3: Math.max(0, Number(form.freightRatePerM3) || 0),
    freightPphAmount: Math.max(0, Number(form.freightPphAmount) || 0),
    brokerFee: Math.max(0, Number(form.brokerFee) || 0),
  }), [form]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(form as WoodReceivingRecord),
      timberGrossTotal: preview.timberGrossTotal, timberPphAmount: preview.timberPphAmount,
      timberNetPayable: preview.timberNetPayable, freightGrossTotal: preview.freightGrossTotal,
      freightNetPayable: preview.freightNetPayable, grandNetPayable: preview.grandNetPayable,
      createdAt: form.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {initialRecord ? 'Edit Penerimaan Kayu (编辑入库)' : 'Input Penerimaan Kayu Baru (新增木材入库)'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
          <fieldset className="border border-slate-200 rounded-xl p-4">
            <legend className="text-xs font-bold text-amber-800 px-2 uppercase tracking-wide">1. Dokumen & Pengiriman (发货单据与物流)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Penerimaan (到货日期) *</label>
                <input type="date" required value={form.receiptDate || ''} onChange={(e) => setForm({ ...form, receiptDate: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">No. Polisi Truk (车牌号) *</label>
                <input type="text" required placeholder="B 1234 CD" value={form.truckPlateNumber || ''} onChange={(e) => setForm({ ...form, truckPlateNumber: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">SKSHHK / DKP (送货单号) *</label>
                <input type="text" required placeholder="SKSHHK-2026-..." value={form.forestryDocNumber || ''} onChange={(e) => setForm({ ...form, forestryDocNumber: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">No. Kontrak (合同编号)</label>
                <input type="text" placeholder="CTR-01" value={form.contractNumber || ''} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Supplier / Pemilik (供应商) *</label>
                <input type="text" required placeholder="Nama PT / Koperasi" value={form.supplierName || ''} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-slate-200 rounded-xl p-4">
            <legend className="text-xs font-bold text-amber-800 px-2 uppercase tracking-wide">2. Spesifikasi Kayu & Lokasi (材种与批号)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Kayu (树种) *</label>
                <input type="text" required placeholder="Teak / Merbau" value={form.woodSpecies || ''} onChange={(e) => setForm({ ...form, woodSpecies: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Panjang Kayu m (长度)</label>
                <input type="number" step="0.1" min="0" value={form.woodLengthM ?? 4.0} onChange={(e) => setForm({ ...form, woodLengthM: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nomer Kavling (进厂批号) *</label>
                <input type="text" required placeholder="KAV-01" value={form.kavlingNumber || ''} onChange={(e) => setForm({ ...form, kavlingNumber: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">TPK / Lapangan (场地)</label>
                <input type="text" placeholder="TPK-1" value={form.storageYard || ''} onChange={(e) => setForm({ ...form, storageYard: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-slate-200 rounded-xl p-4">
            <legend className="text-xs font-bold text-amber-800 px-2 uppercase tracking-wide">3. Pengukuran Batang & Volume (送货 vs 检尺)</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batang Surat Jalan (送货根数)</label>
                <input type="number" min="0" value={form.deliveredPieces ?? 0} onChange={(e) => setForm({ ...form, deliveredPieces: parseInt(e.target.value, 10) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Vol Surat Jalan m³ (送货立方)</label>
                <input type="number" step="0.01" min="0" value={form.deliveredVolumeM3 ?? 0} onChange={(e) => setForm({ ...form, deliveredVolumeM3: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batang Tally (检尺根数) *</label>
                <input type="number" required min="0" value={form.tallyPieces ?? 0} onChange={(e) => setForm({ ...form, tallyPieces: parseInt(e.target.value, 10) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Volume Tally m³ (检尺立方) *</label>
                <input type="number" step="0.01" required min="0" value={form.tallyVolumeM3 ?? 0} onChange={(e) => setForm({ ...form, tallyVolumeM3: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold" />
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-slate-200 rounded-xl p-4">
            <legend className="text-xs font-bold text-amber-800 px-2 uppercase tracking-wide">4. Harga Kayu, Ongkir & Pajak (货款、运费与税金)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Harga Kayu / m³ (均价)</label>
                <input type="number" min="0" value={form.timberPricePerM3 ?? 0} onChange={(e) => setForm({ ...form, timberPricePerM3: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">PPh Kayu % (税率 0.5% / 1.5%)</label>
                <input type="number" step="0.1" min="0" value={form.timberPphRate ?? 0.5} onChange={(e) => setForm({ ...form, timberPphRate: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ongkir / m³ (运费单价)</label>
                <input type="number" min="0" value={form.freightRatePerM3 ?? 0} onChange={(e) => setForm({ ...form, freightRatePerM3: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Potongan PPh Ongkir (运费税)</label>
                <input type="number" min="0" value={form.freightPphAmount ?? 0} onChange={(e) => setForm({ ...form, freightPphAmount: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Broker / Komisi (中介费)</label>
                <input type="number" min="0" value={form.brokerFee ?? 0} onChange={(e) => setForm({ ...form, brokerFee: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
            </div>

            {/* Dynamic Live Calculation Card */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Calculator className="w-4 h-4 text-amber-700" />
                <span>Kalkulasi Otomatis:</span>
              </div>
              <div>Selisih: <strong>{preview.volumeDiscrepancyM3 >= 0 ? `+${preview.volumeDiscrepancyM3.toFixed(2)}` : preview.volumeDiscrepancyM3.toFixed(2)} m³</strong></div>
              <div>Net Kayu: <strong>{formatRupiah(preview.timberNetPayable)}</strong></div>
              <div>Net Ongkir: <strong>{formatRupiah(preview.freightNetPayable)}</strong></div>
              <div className="text-sm font-bold text-amber-800">Total: {formatRupiah(preview.grandNetPayable)}</div>
            </div>
          </fieldset>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition">Batal (取消)</button>
            <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition">Simpan Data (保存入库)</button>
          </div>
        </form>
      </div>
    </div>
  );
}
