'use client';

/**
 * src/components/payment-forms/PaymentFormLinesTable.tsx
 *
 * Detailed line items table for a PaymentForm.
 * Shows every receiving record contributing to the form with financial breakdown.
 */

import React from 'react';
import Link from 'next/link';
import { ExternalLink, FileSpreadsheet } from 'lucide-react';
import type { PaymentFormLineItem } from '../../types/index.ts';

interface PaymentFormLinesTableProps {
  lines: PaymentFormLineItem[];
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
            Rincian Penerimaan Kayu (入库明细)
          </h2>
          <p className="text-xs text-gray-500">
            {lines.length} surat jalan terdaftar dalam periode operasional ini
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">No.</th>
              <th className="py-3 px-4">Tgl Terima (日期)</th>
              <th className="py-3 px-4">No. Surat Jalan (单号)</th>
              <th className="py-3 px-4">Kavling (堆位)</th>
              <th className="py-3 px-4 text-right">Btg (根)</th>
              <th className="py-3 px-4 text-right">Volume (m³)</th>
              <th className="py-3 px-4 text-right">Harga/m³ (Rp)</th>
              <th className="py-3 px-4 text-right">Bruto (Rp)</th>
              <th className="py-3 px-4 text-right">PPh 22 (Rp)</th>
              <th className="py-3 px-4 text-right">Netto (Rp)</th>
              <th className="py-3 px-4 text-center w-16">Buku Besar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {lines.map((line, idx) => (
              <tr key={line.itemId || line.recordId || idx} className="hover:bg-amber-50/30 transition">
                <td className="py-3 px-4 text-center font-mono text-gray-400">
                  {idx + 1}
                </td>
                <td className="py-3 px-4 font-mono whitespace-nowrap">
                  {line.receiptDate}
                </td>
                <td className="py-3 px-4 font-mono font-medium text-gray-900 whitespace-nowrap">
                  {line.forestryDocNumber || '—'}
                </td>
                <td className="py-3 px-4 font-mono text-gray-600">
                  {line.kavlingNumber || '—'}
                </td>
                <td className="py-3 px-4 text-right font-mono font-medium">
                  {line.tallyPieces.toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">
                  {line.tallyVolumeM3.toFixed(4)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {Math.round(line.timberPricePerM3).toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-4 text-right font-mono text-gray-900">
                  {Math.round(line.timberGrossIDR).toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-4 text-right font-mono text-amber-700">
                  {Math.round(line.timberPphIDR).toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-gray-950">
                  {Math.round(line.timberNetIDR).toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-4 text-center">
                  <Link
                    href={`/ledger?search=${encodeURIComponent(line.forestryDocNumber || line.recordId)}`}
                    target="_blank"
                    className="p-1 inline-flex text-gray-400 hover:text-amber-700 rounded-md hover:bg-gray-100 transition"
                    title="Lihat di Buku Besar"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
