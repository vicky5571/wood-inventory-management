'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { computeRecordCalculations } from '@/src/utils/timber-calc';
import { TallyDimensionCalculator } from './TallyDimensionCalculator';
import {
  X,
  Calculator,
  FileText,
  Boxes,
  Scale,
  CreditCard,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';

const formatRupiah = (num: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);

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
  onClose,
  onSave,
}: {
  isOpen: boolean;
  initialRecord: WoodReceivingRecord | null;
  onClose: () => void;
  onSave: (record: WoodReceivingRecord) => void;
}) {
  const [form, setForm] = useState<Partial<WoodReceivingRecord>>({});

  useEffect(() => {
    setForm(initialRecord ? { ...initialRecord } : defaultRecord());
  }, [initialRecord, isOpen]);

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

  const isSurplusOrMatch = preview.volumeDiscrepancyM3 >= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(form as WoodReceivingRecord),
      timberGrossTotal: preview.timberGrossTotal,
      timberPphAmount: preview.timberPphAmount,
      timberNetPayable: preview.timberNetPayable,
      freightGrossTotal: preview.freightGrossTotal,
      freightNetPayable: preview.freightNetPayable,
      grandNetPayable: preview.grandNetPayable,
      createdAt: form.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101828]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-gray-100 overflow-hidden">
        {/* Brand Accent Bar (LMS IOH Gold & Red) */}
        <div className="h-1.5 w-full bg-linear-to-r from-[#ffc908] via-[#ffc908] to-[#ed1c24]" />

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
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-5">
          {/* Section 1: Dokumen & Pengiriman */}
          <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4.5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-[#ffc908] text-[#101828] text-xs font-bold flex items-center justify-center shadow-2xs">
                1
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#101828] uppercase tracking-wider">
                <FileText className="w-4 h-4 text-gray-500" />
                <span>Dokumen & Pengiriman (发货单据与物流)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Tanggal Penerimaan (到货日期) <span className="text-[#ed1c24]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.receiptDate || ''}
                  onChange={(e) => setForm({ ...form, receiptDate: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  No. Polisi Truk (车牌号) <span className="text-[#ed1c24]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: B 1234 CD"
                  value={form.truckPlateNumber || ''}
                  onChange={(e) => setForm({ ...form, truckPlateNumber: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  SKSHHK / DKP (送货单号) <span className="text-[#ed1c24]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="SKSHHK-2026-..."
                  value={form.forestryDocNumber || ''}
                  onChange={(e) => setForm({ ...form, forestryDocNumber: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  No. Kontrak (合同编号)
                </label>
                <input
                  type="text"
                  placeholder="CTR-01 / PO-..."
                  value={form.contractNumber || ''}
                  onChange={(e) => setForm({ ...form, contractNumber: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Supplier / Pemilik Kayu (供应商) <span className="text-[#ed1c24]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama PT / CV / Koperasi Hutan"
                  value={form.supplierName || ''}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Spesifikasi Kayu & Lokasi */}
          <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4.5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-[#ffc908] text-[#101828] text-xs font-bold flex items-center justify-center shadow-2xs">
                2
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#101828] uppercase tracking-wider">
                <Boxes className="w-4 h-4 text-gray-500" />
                <span>Spesifikasi Kayu & Alokasi Kavling (材种与批号)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Jenis Kayu (树种) <span className="text-[#ed1c24]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Teak / Meranti / Pine"
                  value={form.woodSpecies || ''}
                  onChange={(e) => setForm({ ...form, woodSpecies: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Panjang Kayu m (长度)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.woodLengthM ?? 4.0}
                  onChange={(e) => setForm({ ...form, woodLengthM: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Nomer Kavling (进厂批号) <span className="text-[#ed1c24]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="KAV-01"
                  value={form.kavlingNumber || ''}
                  onChange={(e) => setForm({ ...form, kavlingNumber: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  TPK / Lapangan (场地)
                </label>
                <input
                  type="text"
                  placeholder="TPK-1"
                  value={form.storageYard || ''}
                  onChange={(e) => setForm({ ...form, storageYard: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pengukuran Batang & Volume */}
          <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4.5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-[#ffc908] text-[#101828] text-xs font-bold flex items-center justify-center shadow-2xs">
                3
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#101828] uppercase tracking-wider">
                <Scale className="w-4 h-4 text-gray-500" />
                <span>Pengukuran Fisik & Volume (送货 vs 检尺)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Batang Surat Jalan (送货根数)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.deliveredPieces ?? 0}
                  onChange={(e) => setForm({ ...form, deliveredPieces: parseInt(e.target.value, 10) || 0 })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Vol Surat Jalan m³ (送货立方)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.deliveredVolumeM3 ?? 0}
                  onChange={(e) => setForm({ ...form, deliveredVolumeM3: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
                />
              </div>
              <div className="bg-[#ffc908]/10 p-2.5 rounded-xl border border-[#ffc908]/30">
                <label className="block text-[11px] font-bold text-[#101828] mb-1">
                  Batang Tally Fisik (检尺根数) <span className="text-[#ed1c24]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={form.tallyPieces ?? 0}
                  onChange={(e) => setForm({ ...form, tallyPieces: parseInt(e.target.value, 10) || 0 })}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#ffc908] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] font-mono tabular-nums font-bold"
                />
              </div>
              <div className="bg-[#ffc908]/10 p-2.5 rounded-xl border border-[#ffc908]/30">
                <label className="block text-[11px] font-bold text-[#101828] mb-1">
                  Volume Tally m³ (检尺立方) <span className="text-[#ed1c24]">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={form.tallyVolumeM3 ?? 0}
                  onChange={(e) => setForm({ ...form, tallyVolumeM3: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#ffc908] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] font-mono tabular-nums font-bold"
                />
              </div>
            </div>

            {/* Dimensional Calculation Helper */}
            <TallyDimensionCalculator
              tallyPieces={form.tallyPieces}
              onApplyVolume={(vol) => setForm((prev) => ({ ...prev, tallyVolumeM3: vol }))}
            />
          </div>

          {/* Section 4: Harga Kayu, Ongkir & Pajak */}
          <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4.5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-[#ffc908] text-[#101828] text-xs font-bold flex items-center justify-center shadow-2xs">
                4
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#101828] uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <span>Harga Kayu, Ongkir & Potongan Pajak (货款、运费与税金)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Harga Kayu / m³ (均价 IDR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.timberPricePerM3 ?? 0}
                  onChange={(e) => setForm({ ...form, timberPricePerM3: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Tarif PPh Kayu % (税率 0.5% / 1.5%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.timberPphRate ?? 0.5}
                  onChange={(e) => setForm({ ...form, timberPphRate: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Tarif Ongkir / m³ (运费单价 IDR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.freightRatePerM3 ?? 0}
                  onChange={(e) => setForm({ ...form, freightRatePerM3: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Potongan PPh Ongkir (运费税 IDR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.freightPphAmount ?? 0}
                  onChange={(e) => setForm({ ...form, freightPphAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Broker / Komisi (中介费 IDR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.brokerFee ?? 0}
                  onChange={(e) => setForm({ ...form, brokerFee: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Real-time Reconciliation & Calculation Banner (LMS IOH High-Contrast Card) */}
          <div className="bg-[#101828] text-white rounded-2xl p-4.5 border border-gray-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffc908] text-[#101828] flex items-center justify-center font-bold">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Rekonsiliasi Realtime & Netto Bayar
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">Selisih Vol:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isSurplusOrMatch
                        ? 'bg-emerald-500/20 text-[#00bb7f] border border-emerald-500/30'
                        : 'bg-rose-500/20 text-[#ed1c24] border border-rose-500/30'
                    }`}
                  >
                    {isSurplusOrMatch ? (
                      <TrendingUp className="w-3 h-3 text-[#00bb7f]" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-[#ed1c24]" />
                    )}
                    {isSurplusOrMatch && '+'}
                    {preview.volumeDiscrepancyM3.toFixed(2)} m³
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="bg-gray-800/80 px-3 py-2 rounded-xl border border-gray-700/60">
                <div className="text-[10px] uppercase text-gray-400 font-medium">Net Material Kayu</div>
                <div className="font-mono tabular-nums font-semibold text-gray-100 mt-0.5">
                  {formatRupiah(preview.timberNetPayable)}
                </div>
              </div>

              <div className="bg-gray-800/80 px-3 py-2 rounded-xl border border-gray-700/60">
                <div className="text-[10px] uppercase text-gray-400 font-medium">Net Ongkos Kirim</div>
                <div className="font-mono tabular-nums font-semibold text-gray-100 mt-0.5">
                  {formatRupiah(preview.freightNetPayable)}
                </div>
              </div>

              <div className="bg-[#ffc908]/20 px-3.5 py-2 rounded-xl border border-[#ffc908]/40">
                <div className="text-[10px] uppercase text-[#ffc908] font-bold">Total Grand Net</div>
                <div className="font-mono tabular-nums font-bold text-base text-[#ffc908] mt-0.5">
                  {formatRupiah(preview.grandNetPayable)}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition shadow-2xs"
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


