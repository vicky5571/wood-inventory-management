'use client';

import React from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { Truck, MapPin, Printer, Edit3, Trash2, Layers } from 'lucide-react';

export interface RecordTableMobileViewProps {
  records: WoodReceivingRecord[];
  canWrite?: boolean;
  onEdit: (record: WoodReceivingRecord) => void;
  onDelete: (id: string) => void;
  onPrint?: (record: WoodReceivingRecord) => void;
}

export function RecordTableMobileView({
  records,
  canWrite = true,
  onEdit,
  onDelete,
  onPrint,
}: RecordTableMobileViewProps) {
  return (
    <div className="divide-y divide-gray-100 bg-gray-50/50 p-2 sm:p-3 space-y-3">
      {records.map((record) => {
        const truckPlate = record.truckPlateNumber || '-';
        const receiptDate = record.receiptDate || '-';
        const supplier = record.supplierName || '-';
        const species = record.woodSpecies || '-';
        const yard = record.storageYard || '-';
        const kavling = record.kavlingNumber || '-';
        const deliveredVol = record.deliveredVolumeM3 ?? 0;
        const deliveredPcs = record.deliveredPieces ?? 0;
        const tallyVol = record.tallyVolumeM3 ?? 0;
        const tallyPcs = record.tallyPieces ?? 0;
        const paymentStatus = record.paymentStatus || 'UNPAID';
        const diffVol = tallyVol - deliveredVol;

        const badgeClass =
          paymentStatus === 'PAID'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : paymentStatus === 'PARTIAL'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-rose-50 text-rose-700 border-rose-200';

        const badgeLabel =
          paymentStatus === 'PAID'
            ? 'Lunas (已付)'
            : paymentStatus === 'PARTIAL'
            ? 'Sebagian (部分)'
            : 'Belum (未付)';

        return (
          <div
            key={record.id}
            data-testid={`mobile-record-card-${record.id}`}
            className="bg-white rounded-2xl border border-gray-200/90 p-3.5 shadow-2xs hover:shadow-xs transition"
          >
            {/* Header: Truck Plate & Payment Status */}
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <Truck className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-mono font-black text-sm text-gray-950 tracking-wider uppercase block">
                    {truckPlate}
                  </span>
                  <span className="text-[10px] text-gray-400">{receiptDate}</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                {badgeLabel}
              </span>
            </div>

            {/* Body: Supplier, Species, Yard & Lot */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Pemasok / Jenis:</span>
                <span className="font-bold text-gray-900 truncate max-w-[200px]">
                  {supplier} • <span className="text-amber-800">{species}</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gray-400" /> Lokasi TPK:
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md text-[11px]">
                  <span>{yard}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-amber-700 font-bold">{kavling}</span>
                </span>
              </div>
            </div>

            {/* Metrics: Surat Jalan vs Physical Tally */}
            <div className="grid grid-cols-3 gap-1.5 bg-gray-50 rounded-xl p-2.5 mt-2.5 border border-gray-100 text-center">
              <div>
                <span className="block text-[9px] text-gray-400 font-medium">SJ Sopir</span>
                <span className="text-xs font-mono font-bold text-gray-700">{deliveredVol.toFixed(3)} m³</span>
                <span className="block text-[9px] text-gray-400">{deliveredPcs} btg</span>
              </div>
              <div>
                <span className="block text-[9px] text-gray-400 font-medium">Ukur Tally</span>
                <span className="text-xs font-mono font-black text-amber-950">{tallyVol.toFixed(3)} m³</span>
                <span className="block text-[9px] text-amber-700 font-bold">{tallyPcs} btg</span>
              </div>
              <div>
                <span className="block text-[9px] text-gray-400 font-medium">Selisih (Δ)</span>
                <span
                  className={`text-xs font-mono font-black ${
                    Math.abs(diffVol) <= 0.05
                      ? 'text-emerald-600'
                      : diffVol > 0
                      ? 'text-blue-600'
                      : 'text-rose-600'
                  }`}
                >
                  {diffVol >= 0 ? `+${diffVol.toFixed(3)}` : diffVol.toFixed(3)}
                </span>
                <span className="block text-[9px] text-gray-400">
                  {Math.abs(diffVol) <= 0.05 ? 'Cocok' : diffVol > 0 ? 'Surplus' : 'Susut'}
                </span>
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-gray-100">
              {onPrint && (
                <button
                  type="button"
                  onClick={() => onPrint(record)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-gray-500" />
                  <span>Cetak (打印)</span>
                </button>
              )}
              {canWrite && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => onEdit(record)}
                    className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                    title="Edit Record"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(record.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Hapus Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
