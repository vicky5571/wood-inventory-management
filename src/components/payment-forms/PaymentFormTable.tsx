'use client';

/**
 * src/components/payment-forms/PaymentFormTable.tsx
 *
 * Data table presenting weekly payment forms with status badges,
 * volumetric summary, net IDR amounts, and action delegates.
 */

import React from 'react';
import Link from 'next/link';
import { Eye, Printer } from 'lucide-react';
import type { PaymentForm, PaymentFormStatus } from '../../types/index.ts';

interface PaymentFormTableProps {
  forms: PaymentForm[];
  onPrint?: (form: PaymentForm) => void;
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function renderStatusBadge(status: PaymentFormStatus) {
  switch (status) {
    case 'DRAFT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
          Konsep / 草稿
        </span>
      );
    case 'ISSUED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          Terbit / 已开出
        </span>
      );
    case 'PAID':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          Lunas / 已结清
        </span>
      );
    case 'VOID':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Batal / 已作废
        </span>
      );
  }
}

export function PaymentFormTable({ forms, onPrint }: PaymentFormTableProps) {
  return (
    <div className="bg-white border border-gray-200/80 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100/90 border-b border-gray-200 text-gray-700 font-semibold select-none text-[11px]">
              <th className="p-3 border-r border-gray-200">
                No. Form (付款单号)
              </th>
              <th className="p-3 border-r border-gray-200">
                Minggu (周期)
              </th>
              <th className="p-3 border-r border-gray-200">
                Supplier (供应商)
              </th>
              <th className="p-3 border-r border-gray-200">
                Jenis Kayu (树种)
              </th>
              <th className="p-3 border-r border-gray-200">
                No. Kontrak (合同)
              </th>
              <th className="p-3 text-right border-r border-gray-200 font-mono">
                Volume / Pcs
              </th>
              <th className="p-3 text-right border-r border-gray-200 font-mono">
                Net Kayu (应付净额)
              </th>
              <th className="p-3 text-center border-r border-gray-200">
                Status (状态)
              </th>
              <th className="p-3 text-center sticky right-0 z-10 bg-gray-100 border-l border-gray-200">
                Aksi (操作)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {forms.map((form) => (
              <tr key={form.id} className="hover:bg-gray-50/80 transition-colors group">
                <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                  <Link
                    href={`/payment-forms/${form.id}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {form.formNumber}
                  </Link>
                </td>
                <td className="p-3 text-gray-600 whitespace-nowrap text-[11px]">
                  {form.weekStartDate} s/d {form.weekEndDate}
                </td>
                <td className="p-3 font-medium text-gray-900 whitespace-nowrap">
                  {form.supplierName}
                </td>
                <td className="p-3 font-semibold text-gray-800 whitespace-nowrap">
                  {form.woodSpecies}
                </td>
                <td className="p-3 text-gray-600 font-mono whitespace-nowrap text-[11px]">
                  {form.contractNumber || '—'}
                </td>
                <td className="p-3 text-right font-mono whitespace-nowrap">
                  <span className="font-bold text-gray-900">{form.totalTallyVolumeM3.toFixed(2)} m³</span>
                  <span className="text-gray-400 block text-[10px]">({form.totalTallyPieces} btg)</span>
                </td>
                <td className="p-3 text-right font-mono font-bold text-gray-950 whitespace-nowrap">
                  {formatRupiah(form.totalTimberNetIDR)}
                </td>
                <td className="p-3 text-center whitespace-nowrap">
                  {renderStatusBadge(form.status)}
                </td>
                <td className="p-3 text-center whitespace-nowrap sticky right-0 z-10 bg-white group-hover:bg-[#f3f4f6] transition-colors border-l border-gray-200">
                  <div className="inline-flex items-center gap-1.5">
                    <Link
                      href={`/payment-forms/${form.id}`}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Lihat Rincian (查看详情)"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => onPrint?.(form)}
                      className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                      title="Cetak Form (打印付款单)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
