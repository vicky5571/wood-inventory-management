'use client';

import React, { useState } from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { Check, Loader2, Sparkles } from 'lucide-react';

const formatRupiah = (num: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);

export interface PendingPricingTableProps {
  records: WoodReceivingRecord[];
  onUpdatePrice: (id: string, price: number | null) => Promise<void>;
  canWrite?: boolean;
}

function PendingTableRow({
  record,
  onUpdatePrice,
  canWrite = true,
}: {
  record: WoodReceivingRecord;
  onUpdatePrice: (id: string, price: number | null) => Promise<void>;
  canWrite?: boolean;
}) {
  const [val, setVal] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const priceNum = val.trim() === '' ? null : Math.max(0, parseFloat(val) || 0);
  const pphRate = record.timberPphRate ?? 0.5;

  let estimatedNet: number | null = null;
  if (priceNum !== null) {
    const gross = Math.round(record.tallyVolumeM3 * priceNum);
    const pph = Math.round(gross * (pphRate / 100));
    estimatedNet = gross - pph;
  }

  const handleSave = async () => {
    if (priceNum === null) return;
    setIsSaving(true);
    try {
      await onUpdatePrice(record.id, priceNum);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <tr className="hover:bg-amber-50/30 transition-colors group">
      {/* 1. Truk & Tanggal */}
      <td className="p-3.5 whitespace-nowrap">
        <span className="font-mono font-bold text-gray-950 block text-xs tracking-wider">
          {record.truckPlateNumber}
        </span>
        <span className="text-[11px] text-gray-400">{record.receiptDate}</span>
      </td>

      {/* 2. Pemasok */}
      <td className="p-3.5 whitespace-nowrap">
        <span className="font-medium text-gray-900 block text-xs">{record.supplierName}</span>
        <span className="text-[10px] font-mono text-gray-400">{record.receiptNumber || '-'}</span>
      </td>

      {/* 3. Jenis & Kavling */}
      <td className="p-3.5 whitespace-nowrap">
        <span className="font-semibold text-gray-900 block text-xs">{record.woodSpecies}</span>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 mt-0.5">
          {record.storageYard} / {record.kavlingNumber || '-'}
        </span>
      </td>

      {/* 4. Batang & Volume */}
      <td className="p-3.5 whitespace-nowrap text-right font-mono tabular-nums">
        <span className="font-bold text-gray-900 block text-xs">
          {record.tallyVolumeM3.toFixed(3)} m³
        </span>
        <span className="text-[11px] text-gray-400">{record.tallyPieces} btg</span>
      </td>

      {/* 5. Tarif PPh */}
      <td className="p-3.5 whitespace-nowrap text-center font-mono text-xs text-gray-600">
        {pphRate}%
      </td>

      {/* 6. Input Harga */}
      <td className="p-3.5 whitespace-nowrap">
        <div className="relative min-w-[160px] max-w-[200px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-2xs font-bold text-gray-400 font-mono">
            Rp
          </span>
          <input
            type="number"
            min="0"
            step="10000"
            disabled={!canWrite || isSaving}
            placeholder="Ketik harga/m³..."
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-xl font-mono tabular-nums text-gray-950 font-bold placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
          />
        </div>
      </td>

      {/* 7. Estimasi Net */}
      <td className="p-3.5 whitespace-nowrap text-right font-mono tabular-nums">
        {estimatedNet !== null ? (
          <span className="font-bold text-emerald-700 block text-xs">
            {formatRupiah(estimatedNet)}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400 italic">Menunggu input...</span>
        )}
      </td>

      {/* 8. Aksi */}
      <td className="p-3.5 whitespace-nowrap text-center">
        {canWrite && (
          <button
            type="button"
            disabled={priceNum === null || isSaving}
            onClick={handleSave}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
              justSaved
                ? 'bg-emerald-600 text-white'
                : priceNum !== null
                ? 'bg-[#ffc908] text-[#101828] hover:bg-[#f0bc00] active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title="Simpan harga (Tekan Enter)"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : justSaved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Tersimpan</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </>
            )}
          </button>
        )}
      </td>
    </tr>
  );
}

export function PendingPricingTable({
  records,
  onUpdatePrice,
  canWrite = true,
}: PendingPricingTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-700 font-semibold select-none">
              <th className="p-3.5 whitespace-nowrap">
                Penerimaan / Truk
                <span className="block text-[10px] text-gray-400 font-normal">车牌与到货</span>
              </th>
              <th className="p-3.5 whitespace-nowrap">
                Supplier & No. Rec
                <span className="block text-[10px] text-gray-400 font-normal">供应商</span>
              </th>
              <th className="p-3.5 whitespace-nowrap">
                Jenis Kayu & TPK
                <span className="block text-[10px] text-gray-400 font-normal">材种/堆位</span>
              </th>
              <th className="p-3.5 whitespace-nowrap text-right font-mono">
                Volume & Batang
                <span className="block text-[10px] text-gray-400 font-normal font-sans">检尺立方</span>
              </th>
              <th className="p-3.5 whitespace-nowrap text-center font-mono">
                Tarif PPh
                <span className="block text-[10px] text-gray-400 font-normal font-sans">所得税率</span>
              </th>
              <th className="p-3.5 whitespace-nowrap">
                Input Harga / m³ (IDR)
                <span className="block text-[10px] text-gray-400 font-normal">设定均价</span>
              </th>
              <th className="p-3.5 whitespace-nowrap text-right font-mono">
                Estimasi Net Kayu
                <span className="block text-[10px] text-gray-400 font-normal font-sans">预估净额</span>
              </th>
              <th className="p-3.5 whitespace-nowrap text-center">
                Aksi
                <span className="block text-[10px] text-gray-400 font-normal">操作</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => (
              <PendingTableRow
                key={record.id}
                record={record}
                onUpdatePrice={onUpdatePrice}
                canWrite={canWrite}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
