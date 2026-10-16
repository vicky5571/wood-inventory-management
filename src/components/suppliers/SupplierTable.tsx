'use client';

import React from 'react';
import type { SupplierSummary } from '@/src/types';
import { Building2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function SupplierTable({ suppliers }: { suppliers: SupplierSummary[] }) {
  if (suppliers.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200/80 text-center text-gray-500">
        Belum ada data pemasok yang tercatat di sistem.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50 border-b border-gray-200/80 text-gray-600 font-semibold">
            <tr>
              <th className="p-3.5 whitespace-nowrap">
                Nama Pemasok / Rekanan
                <span className="block text-[10px] text-gray-400 font-normal">供应商名称</span>
              </th>
              <th className="p-3.5 whitespace-nowrap text-center">
                Mutu Discrepancy
                <span className="block text-[10px] text-gray-400 font-normal">差异评级</span>
              </th>
              <th className="p-3.5 whitespace-nowrap text-right">
                Total Rit
                <span className="block text-[10px] text-gray-400 font-normal">到货车次</span>
              </th>
              <th className="p-3.5 whitespace-nowrap text-right">
                Vol SJ (m³)
                <span className="block text-[10px] text-gray-400 font-normal">送货立方</span>
              </th>
              <th className="p-3.5 whitespace-nowrap text-right">
                Vol Tally (m³)
                <span className="block text-[10px] text-gray-400 font-normal">实测立方</span>
              </th>
              <th className="p-3.5 whitespace-nowrap text-right">
                Selisih Rate (%)
                <span className="block text-[10px] text-gray-400 font-normal">差异率</span>
              </th>
              <th className="p-3.5 whitespace-nowrap text-right">
                Total Pembayaran
                <span className="block text-[10px] text-gray-400 font-normal">采购支出</span>
              </th>
              <th className="p-3.5 whitespace-nowrap">
                Terakhir Masuk
                <span className="block text-[10px] text-gray-400 font-normal">最近到货</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.map((s) => {
              const isOptimal = s.status === 'OPTIMAL';
              const isAcceptable = s.status === 'ACCEPTABLE';

              return (
                <tr key={s.supplierName} className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-3.5 whitespace-nowrap font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>{s.supplierName}</span>
                    </div>
                  </td>
                  <td className="p-3.5 whitespace-nowrap text-center">
                    {isOptimal && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Optimal
                      </span>
                    )}
                    {isAcceptable && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        Wajar
                      </span>
                    )}
                    {!isOptimal && !isAcceptable && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Deviasi
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 whitespace-nowrap text-right font-mono font-semibold text-gray-700">
                    {s.totalDeliveries}
                  </td>
                  <td className="p-3.5 whitespace-nowrap text-right font-mono text-gray-600">
                    {s.totalDeliveredVolumeM3.toFixed(2)}
                  </td>
                  <td className="p-3.5 whitespace-nowrap text-right font-mono font-bold text-gray-900">
                    {s.totalTallyVolumeM3.toFixed(2)}
                  </td>
                  <td className="p-3.5 whitespace-nowrap text-right font-mono font-bold">
                    <span className={s.discrepancyRatePercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {s.discrepancyRatePercent >= 0 ? '+' : ''}{s.discrepancyRatePercent}%
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap text-right font-mono font-bold text-gray-900">
                    {formatRupiah(s.totalGrandNetPayable)}
                  </td>
                  <td className="p-3.5 whitespace-nowrap font-mono text-gray-500">
                    {s.lastDeliveryDate || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
