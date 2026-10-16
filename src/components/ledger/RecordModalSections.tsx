'use client';

import React from 'react';
import type { WoodReceivingRecord, RecordCalculationOutput } from '@/src/types';
import { TallyDimensionCalculator } from './TallyDimensionCalculator';
import { SpeciesCombobox } from './SpeciesCombobox';
import { SupplierCombobox } from './SupplierCombobox';
import {
  FileText,
  Boxes,
  Scale,
  CreditCard,
  Calculator,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const formatRupiah = (num: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);

export interface RecordModalSectionsProps {
  form: Partial<WoodReceivingRecord>;
  setForm: React.Dispatch<React.SetStateAction<Partial<WoodReceivingRecord>>>;
  availableSpecies?: string[];
  preview: RecordCalculationOutput;
}

export function RecordModalSections({
  form,
  setForm,
  availableSpecies,
  preview,
}: RecordModalSectionsProps) {
  const isSurplusOrMatch = preview.volumeDiscrepancyM3 >= 0;

  return (
    <>
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
              onChange={(e) => setForm((prev) => ({ ...prev, receiptDate: e.target.value }))}
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
              onChange={(e) => setForm((prev) => ({ ...prev, truckPlateNumber: e.target.value }))}
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
              onChange={(e) => setForm((prev) => ({ ...prev, forestryDocNumber: e.target.value }))}
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
              onChange={(e) => setForm((prev) => ({ ...prev, contractNumber: e.target.value }))}
              className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Supplier / Pemilik Kayu (供应商) <span className="text-[#ed1c24]">*</span>
            </label>
            <SupplierCombobox
              value={form.supplierName || ''}
              onChange={(val) => setForm((prev) => ({ ...prev, supplierName: val }))}
              required
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
            <SpeciesCombobox
              value={form.woodSpecies || ''}
              onChange={(species) => setForm((prev) => ({ ...prev, woodSpecies: species }))}
              availableSpecies={availableSpecies}
              required
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
              onChange={(e) =>
                setForm((prev) => ({ ...prev, woodLengthM: parseFloat(e.target.value) || 0 }))
              }
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
              onChange={(e) => setForm((prev) => ({ ...prev, kavlingNumber: e.target.value }))}
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
              onChange={(e) => setForm((prev) => ({ ...prev, storageYard: e.target.value }))}
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  deliveredPieces: parseInt(e.target.value, 10) || 0,
                }))
              }
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  deliveredVolumeM3: parseFloat(e.target.value) || 0,
                }))
              }
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  tallyPieces: parseInt(e.target.value, 10) || 0,
                }))
              }
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  tallyVolumeM3: parseFloat(e.target.value) || 0,
                }))
              }
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  timberPricePerM3: parseFloat(e.target.value) || 0,
                }))
              }
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  timberPphRate: parseFloat(e.target.value) || 0,
                }))
              }
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  freightRatePerM3: parseFloat(e.target.value) || 0,
                }))
              }
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  freightPphAmount: parseFloat(e.target.value) || 0,
                }))
              }
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  brokerFee: parseFloat(e.target.value) || 0,
                }))
              }
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
    </>
  );
}
