'use client';

import React from 'react';
import type { SupplierWithMetrics, SupplierSummary, Supplier } from '@/src/types';
import { Building2, CheckCircle2, AlertCircle, AlertTriangle, Edit2, Trash2, User, Phone } from 'lucide-react';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

interface SupplierTableProps {
  suppliers: (SupplierWithMetrics | (SupplierSummary & Partial<Supplier>))[];
  onEdit?: (supplier: SupplierWithMetrics) => void;
  onDelete?: (id: string, name: string) => void;
  canWrite?: boolean;
}

export function SupplierTable({ suppliers, onEdit, onDelete, canWrite = true }: SupplierTableProps) {
  if (suppliers.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200/80 text-center text-gray-500">
        Belum ada data pemasok yang tercatat di sistem.
      </div>
    );
  }

  const hasActions = canWrite && (Boolean(onEdit) || Boolean(onDelete));

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50 border-b border-gray-200/80 text-gray-600 font-semibold">
            <tr>
              <th className="p-3.5 whitespace-nowrap">
                Nama Pemasok / Rekanan
                <span className="block text-[10px] text-gray-400 font-normal">供应商名称与编号</span>
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
              {hasActions && (
                <th className="p-3.5 whitespace-nowrap text-center sticky right-0 bg-gray-50 shadow-xs">
                  Aksi
                  <span className="block text-[10px] text-gray-400 font-normal">操作</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.map((s) => {
              const rating = ('ratingStatus' in s && s.ratingStatus) || s.status || 'OPTIMAL';
              const isOptimal = rating === 'OPTIMAL';
              const isAcceptable = rating === 'ACCEPTABLE';
              const name = s.name || s.supplierName || 'Pemasok';
              const code = s.code;

              return (
                <tr key={s.id || name} className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-3.5 whitespace-nowrap font-bold text-gray-900">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>{name}</span>
                          {code && (
                            <span className="font-mono text-[9px] font-bold text-sky-800 bg-sky-50 px-1 py-0.2 rounded border border-sky-200/80">
                              {code}
                            </span>
                          )}
                        </div>
                        {(s.contactPerson || s.phone) && (
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-normal text-gray-400">
                            {s.contactPerson && (
                              <span className="flex items-center gap-0.5">
                                <User className="w-2.5 h-2.5" />
                                {s.contactPerson}
                              </span>
                            )}
                            {s.phone && (
                              <span className="flex items-center gap-0.5 font-mono">
                                <Phone className="w-2.5 h-2.5" />
                                {s.phone}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
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
                    <span className={
                      s.discrepancyRatePercent > 0
                        ? 'text-blue-700'
                        : s.discrepancyRatePercent < -2.0
                        ? 'text-rose-700'
                        : s.discrepancyRatePercent < 0
                        ? 'text-amber-700'
                        : 'text-gray-700'
                    }>
                      {s.discrepancyRatePercent > 0 ? '+' : ''}{s.discrepancyRatePercent}%
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap text-right font-mono font-bold text-gray-900">
                    {formatRupiah(s.totalGrandNetPayable)}
                  </td>
                  <td className="p-3.5 whitespace-nowrap font-mono text-gray-500">
                    {s.lastDeliveryDate || '-'}
                  </td>
                  {hasActions && (
                    <td className="p-3.5 whitespace-nowrap text-center sticky right-0 bg-white/95 backdrop-blur-xs">
                      <div className="flex items-center justify-center gap-1.5">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(s as SupplierWithMetrics)}
                            className="p-1 rounded-lg text-sky-700 hover:bg-sky-50 transition cursor-pointer"
                            title="Edit Data Pemasok"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && s.id && (
                          <button
                            type="button"
                            onClick={() => onDelete(s.id!, name)}
                            className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Data Pemasok"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
