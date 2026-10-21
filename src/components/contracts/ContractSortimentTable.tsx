'use client';

import React from 'react';
import type { ContractSortimentItem } from '@/src/types/index';
import { Layers } from 'lucide-react';

export interface ContractSortimentTableProps {
  items: ContractSortimentItem[];
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function ContractSortimentTable({ items }: ContractSortimentTableProps) {
  if (items.length === 0) {
    return (
      <div className="p-4 bg-white rounded-2xl border border-gray-200/80 text-center text-xs text-gray-500">
        Belum ada rincian sortimen kayu untuk kontrak ini.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <Layers className="w-4 h-4 text-amber-700" />
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider text-[10px]">
          Alokasi Sortimen Kayu ({items.length} Sortimen)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">#</th>
              <th className="py-2.5 px-4">Jenis Kayu</th>
              <th className="py-2.5 px-4">Grade</th>
              <th className="py-2.5 px-4 text-right">Panjang (m)</th>
              <th className="py-2.5 px-4 text-right">Volume (m³)</th>
              <th className="py-2.5 px-4 text-right">Batang</th>
              <th className="py-2.5 px-4 text-right">Harga / m³</th>
              <th className="py-2.5 px-4 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                <td className="py-2.5 px-4 font-mono text-gray-400">{idx + 1}</td>
                <td className="py-2.5 px-4 font-semibold text-gray-900">{item.woodSpecies}</td>
                <td className="py-2.5 px-4">
                  <span className="font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-semibold text-[11px]">
                    {item.grade}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-gray-700">
                  {item.woodLengthM ? `${item.woodLengthM} m` : '-'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">
                  {item.volumeM3.toFixed(4)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-gray-600">
                  {item.pieces ? item.pieces.toLocaleString('id-ID') : '-'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-gray-700">
                  {formatRupiah(item.pricePerM3)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-950">
                  {formatRupiah(item.subtotalIDR)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
