'use client';

import React from 'react';
import type { ContractFulfillmentSummary } from '@/src/types/index';
import { AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';

export interface ContractFulfillmentCardProps {
  summary: ContractFulfillmentSummary;
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function ContractFulfillmentCard({ summary }: ContractFulfillmentCardProps) {
  const isOverDelivered = summary.receivedVolumeM3 > summary.purchasedVolumeM3;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Physical Volume Fulfillment Card */}
      <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-700" />
              <span>Realisasi Pengiriman Kayu (SKSHHK)</span>
            </span>
            <span className="text-xs font-mono font-bold text-gray-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
              {summary.fulfillmentPercent}%
            </span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden my-2.5">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                summary.fulfillmentPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, summary.fulfillmentPercent)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
            <div className="p-2 bg-gray-50 rounded-xl">
              <span className="text-[10px] text-gray-400 block">Dibeli</span>
              <span className="font-mono font-bold text-gray-900">{summary.purchasedVolumeM3.toFixed(4)} m³</span>
              <span className="text-[10px] text-gray-400 block">{summary.purchasedPieces} btg</span>
            </div>
            <div className="p-2 bg-blue-50/70 rounded-xl">
              <span className="text-[10px] text-blue-600 block font-semibold">Terkirim (SKSHHK)</span>
              <span className="font-mono font-bold text-blue-950">{summary.receivedVolumeM3.toFixed(4)} m³</span>
              <span className="text-[10px] text-blue-600 block">{summary.receivedPieces} btg</span>
            </div>
            <div className="p-2 bg-emerald-50/70 rounded-xl">
              <span className="text-[10px] text-emerald-700 block font-semibold">Sisa Stok Kontrak</span>
              <span className="font-mono font-bold text-emerald-950">{summary.remainingVolumeM3.toFixed(4)} m³</span>
              <span className="text-[10px] text-emerald-700 block">{summary.remainingPieces} btg</span>
            </div>
          </div>
        </div>

        {isOverDelivered && (
          <div className="mt-3 p-2.5 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Volume penerimaan SKSHHK melebihi kuota kontrak awal.</span>
          </div>
        )}
      </div>

      {/* Financial Kwitansi Settlement Card */}
      <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              <span>Status Pembayaran (Kwitansi Perhutani)</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
            <div className="p-2 bg-gray-50 rounded-xl">
              <span className="text-[10px] text-gray-400 block">Total Nilai Kontrak</span>
              <span className="font-mono font-bold text-gray-900 block mt-0.5">
                {formatRupiah(summary.totalContractValueIDR)}
              </span>
            </div>
            <div className="p-2 bg-emerald-50/70 rounded-xl">
              <span className="text-[10px] text-emerald-700 block font-semibold">Sudah Dibayar (Kwitansi)</span>
              <span className="font-mono font-bold text-emerald-950 block mt-0.5">
                {formatRupiah(summary.totalPaidIDR)}
              </span>
            </div>
            <div className="p-2 bg-amber-50/70 rounded-xl">
              <span className="text-[10px] text-amber-800 block font-semibold">Sisa Pelunasan</span>
              <span className="font-mono font-bold text-amber-950 block mt-0.5">
                {formatRupiah(summary.outstandingIDR)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
