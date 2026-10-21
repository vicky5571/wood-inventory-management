'use client';

import React from 'react';
import type { ContractReceipt } from '@/src/types/index';
import { Receipt, Plus, Trash2 } from 'lucide-react';

export interface ContractReceiptsPanelProps {
  receipts: ContractReceipt[];
  onAddReceipt: () => void;
  onDeleteReceipt: (id: string) => void;
  canWrite: boolean;
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function ContractReceiptsPanel({
  receipts,
  onAddReceipt,
  onDeleteReceipt,
  canWrite,
}: ContractReceiptsPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-700" />
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider text-[10px]">
            Kwitansi & Pembayaran ({receipts.length} Bukti)
          </h3>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={onAddReceipt}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Kwitansi</span>
          </button>
        )}
      </div>

      {receipts.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-500">
          Belum ada kwitansi pembayaran yang dicatat untuk kontrak ini.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">No Kwitansi</th>
                <th className="py-2.5 px-4">Tanggal</th>
                <th className="py-2.5 px-4 text-right">Nominal Bayar</th>
                <th className="py-2.5 px-4 text-right">Cakupan Volume</th>
                <th className="py-2.5 px-4">Catatan</th>
                {canWrite && <th className="py-2.5 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-gray-900">{r.receiptNumber}</td>
                  <td className="py-2.5 px-4 font-mono text-gray-700">{r.receiptDate}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">
                    {formatRupiah(r.amountIDR)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-gray-700">
                    {r.coveredVolumeM3 ? `${r.coveredVolumeM3.toFixed(4)} m³` : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-gray-600">{r.notes || '-'}</td>
                  {canWrite && (
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteReceipt(r.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                        title="Hapus kwitansi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
