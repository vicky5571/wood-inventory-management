'use client';

/**
 * src/components/sorting/SortingTable.tsx
 *
 * Tabular presentation for stock sorting redistribution logs with directional lot flow.
 */

import React from 'react';
import { ArrowRight, Edit2, Trash2 } from 'lucide-react';
import type { StockSortingRecord } from '../../types/index.ts';

export interface SortingTableProps {
  records: StockSortingRecord[];
  onEdit: (record: StockSortingRecord) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function SortingTable({
  records,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: SortingTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4 whitespace-nowrap">
                Tanggal
                <span className="block text-[10px] text-gray-400 font-normal">日期</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap">
                Jenis Kayu
                <span className="block text-[10px] text-gray-400 font-normal">材种</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap">
                Alur Perpindahan Kavling
                <span className="block text-[10px] text-gray-400 font-normal">库位流转 (调拨)</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap text-right font-mono">
                Volume
                <span className="block text-[10px] text-gray-400 font-normal font-sans">调拨立方</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap text-right font-mono">
                Batang
                <span className="block text-[10px] text-gray-400 font-normal font-sans">调拨根数</span>
              </th>
              <th className="py-3 px-4">
                Alasan Sortir
                <span className="block text-[10px] text-gray-400 font-normal">分拣原因</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap">
                Operator
                <span className="block text-[10px] text-gray-400 font-normal">操作员</span>
              </th>
              {(canEdit || canDelete) && (
                <th className="py-3 px-4 whitespace-nowrap text-right">
                  Aksi
                  <span className="block text-[10px] text-gray-400 font-normal">操作</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-amber-50/20 transition-colors group"
              >
                <td className="py-3 px-4 whitespace-nowrap font-semibold text-gray-900">
                  {r.sortingDate}
                </td>

                <td className="py-3 px-4 whitespace-nowrap font-semibold text-gray-800">
                  {r.species}
                </td>

                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-medium text-gray-800">{r.sourceStorageYard}</div>
                      <div className="text-[11px] font-mono text-amber-700">Kav. {r.sourceKavlingNumber}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-medium text-gray-800">{r.targetStorageYard}</div>
                      <div className="text-[11px] font-mono text-emerald-700">Kav. {r.targetKavlingNumber}</div>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-4 whitespace-nowrap text-right font-mono">
                  <span className="font-bold text-gray-900">{r.volumeM3.toFixed(4)}</span>{' '}
                  <span className="text-[10px] text-gray-400 font-sans font-normal">m³</span>
                </td>

                <td className="py-3 px-4 whitespace-nowrap text-right font-medium text-gray-700 font-mono">
                  {r.pieces} btg
                </td>

                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900 max-w-[220px] truncate" title={r.reason}>
                    {r.reason}
                  </div>
                  {r.notes && (
                    <div className="text-[10px] text-gray-400 max-w-[220px] truncate" title={r.notes}>
                      {r.notes}
                    </div>
                  )}
                </td>

                <td className="py-3 px-4 whitespace-nowrap text-gray-800 font-medium">
                  {r.operatorName}
                </td>

                {(canEdit || canDelete) && (
                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(r)}
                          className="p-1.5 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          title="Ubah data sortir (编辑)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(r.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus data sortir (删除)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
