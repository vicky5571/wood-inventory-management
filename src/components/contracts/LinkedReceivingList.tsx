'use client';

import React from 'react';
import Link from 'next/link';
import type { WoodReceivingRecord } from '@/src/types/index';
import { Truck, ExternalLink } from 'lucide-react';

export interface LinkedReceivingListProps {
  records: WoodReceivingRecord[];
}

export function LinkedReceivingList({ records }: LinkedReceivingListProps) {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center text-xs text-gray-500 shadow-2xs">
        <Truck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <h4 className="text-xs font-bold text-gray-800">
          Belum Ada Penerimaan SKSHHK Masuk (暂无入库SKSHHK记录)
        </h4>
        <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
          Kayu dari kontrak ini belum pernah diinput di Buku Besar. Masukkan nomor kontrak saat input penerimaan untuk menautkannya secara otomatis.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-700" />
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider text-[10px]">
            Realisasi SKSHHK Masuk ({records.length} Pengiriman)
          </h3>
        </div>
        <Link
          href="/ledger"
          className="text-xs font-semibold text-amber-800 hover:text-amber-950 inline-flex items-center gap-1"
        >
          <span>Buka Buku Besar</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">Tanggal & SKSHHK</th>
              <th className="py-2.5 px-4">Truk & Supir</th>
              <th className="py-2.5 px-4">Lokasi TPK</th>
              <th className="py-2.5 px-4">Jenis Kayu</th>
              <th className="py-2.5 px-4 text-right">Volume Fisik (m³)</th>
              <th className="py-2.5 px-4 text-right">Batang</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-amber-50/20 transition-colors">
                <td className="py-2.5 px-4">
                  <div className="font-mono font-bold text-gray-900">{r.forestryDocNumber}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{r.receiptDate}</div>
                </td>
                <td className="py-2.5 px-4">
                  <div className="font-mono font-semibold text-gray-800">{r.truckPlateNumber}</div>
                  <div className="text-[10px] text-gray-500">{r.supplierName}</div>
                </td>
                <td className="py-2.5 px-4">
                  <div className="font-medium text-gray-800">{r.storageYard}</div>
                  <div className="text-[10px] font-mono text-amber-800">Kav. {r.kavlingNumber}</div>
                </td>
                <td className="py-2.5 px-4 font-semibold text-gray-900">{r.woodSpecies}</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">
                  {r.tallyVolumeM3.toFixed(4)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-gray-600">
                  {r.tallyPieces.toLocaleString('id-ID')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
