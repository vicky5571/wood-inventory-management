'use client';

/**
 * src/components/payment-forms/PaymentFormLinesTable.tsx
 *
 * Read-only line items table for issued and paid Lembar Tagihan.
 * Matches physical form 6-column structure. Kept strictly under 250 LOC.
 */

import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import type { PaymentFormLineItem } from '../../types/index.ts';

interface PaymentFormLinesTableProps {
  lines: PaymentFormLineItem[];
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function PaymentFormLinesTable({ lines }: PaymentFormLinesTableProps) {
  if (!lines || lines.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center text-xs text-gray-400">
        <FileSpreadsheet className="w-8 h-8 mx-auto text-gray-300 mb-2" />
        Belum ada rincian penerimaan untuk form pembayaran ini.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-950">
            Rincian Tagihan & Biaya (请款单明细)
          </h2>
          <p className="text-xs text-gray-500">
            {lines.length} baris rincian tercatat dalam form pembayaran ini
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">No.</th>
              <th className="py-3 px-4">Kategori (项目)</th>
              <th className="py-3 px-4">Konten (内容)</th>
              <th className="py-3 px-4">Tujuan (劲贷理由)</th>
              <th className="py-3 px-4 text-right">Harga Satuan (单价 Rp)</th>
              <th className="py-3 px-4 text-center">Jumlah (数量)</th>
              <th className="py-3 px-4 text-right">Total (金额 Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {lines.map((line, idx) => (
              <tr key={line.id || line.sourceItemId || line.sourceRecordId || idx} className="hover:bg-amber-50/30 transition">
                <td className="py-3 px-4 text-center font-mono text-gray-400">
                  {line.itemSequence || idx + 1}
                </td>
                <td className="py-3 px-4 font-semibold text-gray-800">
                  {line.kategori}
                </td>
                <td className="py-3 px-4 font-mono font-medium text-gray-900">
                  {line.konten || '—'}
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {line.tujuan || '—'}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatRupiah(line.hargaSatuanIDR)}
                </td>
                <td className="py-3 px-4 text-center font-mono font-semibold text-gray-900 whitespace-nowrap">
                  {line.jumlah} <span className="text-[10px] text-gray-500 font-normal">{line.unit}</span>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-gray-950">
                  {formatRupiah(line.totalIDR)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
