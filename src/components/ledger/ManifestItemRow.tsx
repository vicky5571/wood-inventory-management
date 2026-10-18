'use client';

import React from 'react';
import type { ManifestItemInput } from '@/src/types';
import { SpeciesCombobox } from './SpeciesCombobox';
import { YardSelect } from './YardSelect';
import { KavlingSelect } from './KavlingSelect';
import { getYards, getLotsForYard } from '@/src/utils/storage-locations';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';

const formatRupiah = (num: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

const inputCls = 'w-full text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent font-mono tabular-nums shadow-2xs';
const tallyCls = 'w-full text-xs px-2 py-1 bg-white border border-[#ffc908] rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] font-mono tabular-nums font-bold';
const labelCls = 'block text-[10px] font-semibold text-gray-700 mb-1';

export interface ManifestItemRowProps {
  item: ManifestItemInput;
  index: number;
  totalItems: number;
  onChange: (updated: ManifestItemInput) => void;
  onDelete: () => void;
  availableSpecies?: string[];
  disabledDelete?: boolean;
}

export function ManifestItemRow({
  item, index, totalItems, onChange, onDelete, availableSpecies, disabledDelete,
}: ManifestItemRowProps) {
  const tallyVol = Math.max(0, Number(item.tallyVolumeM3) || 0), delivVol = Math.max(0, Number(item.deliveredVolumeM3) || 0);
  const tallyPcs = Math.max(0, Number(item.tallyPieces) || 0), delivPcs = Math.max(0, Number(item.deliveredPieces) || 0);
  const pricePerM3 = Math.max(0, Number(item.timberPricePerM3) || 0), pphRate = Math.max(0, Number(item.timberPphRate) || 0);

  const volDiff = Number((tallyVol - delivVol).toFixed(4)), pcsDiff = tallyPcs - delivPcs;
  const timberGross = Math.round(tallyVol * pricePerM3), timberPph = Math.round(timberGross * (pphRate / 100));
  const timberNet = timberGross - timberPph;

  const isSurplusOrMatch = volDiff >= 0;
  const cannotDelete = disabledDelete ?? totalItems <= 1;

  const updateField = <K extends keyof ManifestItemInput>(field: K, value: ManifestItemInput[K]) => {
    onChange({ ...item, [field]: value });
  };

  const handleYardChange = (newYard: string) => {
    let nextKavling = item.kavlingNumber || '';
    const trimmed = newYard.trim(), norm = trimmed.toLowerCase();
    if (!trimmed) {
      nextKavling = '';
    } else if (getYards().some((y) => y.name.toLowerCase() === norm || y.yardCode.toLowerCase() === norm || y.id.toLowerCase() === norm)) {
      if (nextKavling && !getLotsForYard(trimmed).some((l) => l.lotCode.toLowerCase() === nextKavling.toLowerCase())) {
        nextKavling = '';
      }
    }
    onChange({ ...item, storageYard: newYard, kavlingNumber: nextKavling });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs hover:border-gray-300 transition-all p-3.5 flex flex-col gap-3">
      {/* Row Header: Sequence, Discrepancy Badges, Subtotal Timber Net, Delete */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-[#101828] text-white text-[11px] font-mono font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-gray-800 tracking-tight">
            Baris #{index + 1} (第{index + 1}行)
          </span>

          {/* Volume Discrepancy Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              isSurplusOrMatch ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
            title="Selisih Volume Tally vs Surat Jalan"
          >
            {isSurplusOrMatch ? <TrendingUp className="w-2.5 h-2.5 text-emerald-600" /> : <TrendingDown className="w-2.5 h-2.5 text-rose-600" />}
            <span>Δ Vol: {isSurplusOrMatch ? '+' : ''}{volDiff.toFixed(2)} m³</span>
          </span>

          {/* Piece Discrepancy Badge */}
          {pcsDiff !== 0 && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium font-mono ${
                pcsDiff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
              title="Selisih Batang Tally vs Surat Jalan"
            >
              Δ Btg: {pcsDiff > 0 ? `+${pcsDiff}` : pcsDiff}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">Subtotal Net Kayu</span>
            <span className="font-mono tabular-nums text-xs font-bold text-gray-900">{formatRupiah(timberNet)}</span>
          </div>

          <button
            type="button" onClick={onDelete} disabled={cannotDelete} aria-label={`Hapus baris ${index + 1}`}
            title={cannotDelete ? 'Manifest harus memiliki minimal 1 baris kayu' : 'Hapus baris kayu ini'}
            className="p-1.5 text-gray-400 hover:text-[#ed1c24] hover:bg-rose-50 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 cursor-pointer disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tier 1: Spesifikasi Kayu & Lokasi Penempatan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
        <div className="sm:col-span-2 lg:col-span-5">
          <label className={labelCls}>Jenis Kayu (树种) <span className="text-[#ed1c24]">*</span></label>
          <SpeciesCombobox value={item.woodSpecies || ''} onChange={(val) => updateField('woodSpecies', val)}
            availableSpecies={availableSpecies} required id={`species-combobox-${item.id || index}`} />
        </div>
        <div className="lg:col-span-2">
          <label className={labelCls}>Panjang m (长)</label>
          <input type="number" step="0.1" min="0" value={item.woodLengthM ?? 4.0}
            onChange={(e) => updateField('woodLengthM', parseFloat(e.target.value) || 0)} className={inputCls} />
        </div>
        <div className="lg:col-span-2">
          <label className={labelCls}>TPK (场地)</label>
          <YardSelect id={`yard-select-${item.id || index}`} value={item.storageYard || ''} onChange={handleYardChange} />
        </div>
        <div className="lg:col-span-3">
          <label className={labelCls}>Kavling (批号) <span className="text-[#ed1c24]">*</span></label>
          <KavlingSelect id={`kavling-select-${item.id || index}`} selectedYard={item.storageYard || ''}
            value={item.kavlingNumber || ''} onChange={(lot) => updateField('kavlingNumber', lot)} required />
        </div>
      </div>

      {/* Tier 2: Rekonsiliasi Dokumen SJ vs Tally Fisik & Finansial */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2 border-t border-gray-100">
        {/* Cluster A: Surat Jalan (SJ) */}
        <div className="md:col-span-4 bg-gray-50/70 p-2.5 rounded-xl border border-gray-200/70 flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Surat Jalan (SJ - 送货)</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>SJ Btg (根)</label>
              <input type="number" min="0" value={item.deliveredPieces ?? 0}
                onChange={(e) => updateField('deliveredPieces', parseInt(e.target.value, 10) || 0)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>SJ Vol m³ (方)</label>
              <input type="number" step="0.01" min="0" value={item.deliveredVolumeM3 ?? 0}
                onChange={(e) => updateField('deliveredVolumeM3', parseFloat(e.target.value) || 0)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Cluster B: Tally Fisik TPK */}
        <div className="md:col-span-4 bg-amber-50/80 p-2.5 rounded-xl border border-amber-300/80 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950">
              Tally Fisik (TPK - 检尺) <span className="text-[#ed1c24]">*</span>
            </span>
            <span className="text-[9px] font-bold text-amber-800 bg-amber-200/60 px-1.5 py-0.2 rounded">Wajib</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-amber-950 mb-1">Tally Btg (检根) <span className="text-[#ed1c24]">*</span></label>
              <input type="number" required min="0" value={item.tallyPieces ?? 0}
                onChange={(e) => updateField('tallyPieces', parseInt(e.target.value, 10) || 0)} className={tallyCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-amber-950 mb-1">Tally m³ (检方) <span className="text-[#ed1c24]">*</span></label>
              <input type="number" step="0.01" required min="0" value={item.tallyVolumeM3 ?? 0}
                onChange={(e) => updateField('tallyVolumeM3', parseFloat(e.target.value) || 0)} className={tallyCls} />
            </div>
          </div>
        </div>

        {/* Cluster C: Finansial Kayu */}
        <div className="md:col-span-4 bg-gray-50/70 p-2.5 rounded-xl border border-gray-200/70 flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Komersial & Pajak (定价)</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Harga / m³ (单价)</label>
              <input type="number" min="0" value={item.timberPricePerM3 ?? 0}
                onChange={(e) => updateField('timberPricePerM3', parseFloat(e.target.value) || 0)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>PPh % (税率)</label>
              <input type="number" step="0.1" min="0" value={item.timberPphRate ?? 0.5}
                onChange={(e) => updateField('timberPphRate', parseFloat(e.target.value) || 0)} className={inputCls} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
