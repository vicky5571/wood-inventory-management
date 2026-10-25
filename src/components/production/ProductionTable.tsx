'use client';

/**
 * src/components/production/ProductionTable.tsx
 *
 * Tabular presentation for sawmill production logs with yield badges and action buttons.
 */

import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { SawmillProductionRecord } from '../../types/index.ts';

export interface ProductionTableProps {
  records: SawmillProductionRecord[];
  onEdit: (record: SawmillProductionRecord) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ProductionTable({
  records,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: ProductionTableProps) {
  const getYieldBadge = (yieldPercent: number) => {
    if (yieldPercent >= 70) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {yieldPercent.toFixed(1)}%
        </span>
      );
    }
    if (yieldPercent >= 50) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          {yieldPercent.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        {yieldPercent.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4 whitespace-nowrap">
                Tanggal & Shift
                <span className="block text-[10px] text-gray-400 font-normal">日期/班次</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap">
                Asal Log
                <span className="block text-[10px] text-gray-400 font-normal">原木来源</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap">
                Jenis Kayu
                <span className="block text-[10px] text-gray-400 font-normal">材种</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap text-right font-mono">
                Log Input
                <span className="block text-[10px] text-gray-400 font-normal font-sans">投入原木</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap">
                Hasil Olahan
                <span className="block text-[10px] text-gray-400 font-normal">产出规格</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap text-right font-mono">
                Volume Output
                <span className="block text-[10px] text-gray-400 font-normal font-sans">产出立方</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap text-center">
                Rendemen
                <span className="block text-[10px] text-gray-400 font-normal">出材率</span>
              </th>
              <th className="py-3 px-4 whitespace-nowrap text-right font-mono">
                Waste
                <span className="block text-[10px] text-gray-400 font-normal font-sans">废料</span>
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
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="font-semibold text-gray-900">{r.productionDate}</div>
                  <div className="text-[11px] text-gray-500">
                    {r.shift ? `Shift ${r.shift}` : 'Tanpa Shift'}
                  </div>
                </td>

                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="font-medium text-gray-800">{r.sourceStorageYard}</div>
                  <div className="text-[11px] font-mono text-amber-700">Kav. {r.sourceKavlingNumber}</div>
                </td>

                <td className="py-3 px-4 whitespace-nowrap font-semibold text-gray-800">
                  {r.inputSpecies}
                </td>

                <td className="py-3 px-4 whitespace-nowrap text-right font-mono">
                  <div className="font-bold text-gray-900">
                    {r.inputVolumeM3.toFixed(4)}{' '}
                    <span className="text-[10px] text-gray-400 font-sans font-normal">m³</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-sans">{r.inputPieces} btg</div>
                </td>

                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900 truncate max-w-[200px]">
                    {r.outputProduct}
                  </div>
                  {r.notes && (
                    <div className="text-[10px] text-gray-400 truncate max-w-[200px]" title={r.notes}>
                      {r.notes}
                    </div>
                  )}
                </td>

                <td className="py-3 px-4 whitespace-nowrap text-right font-mono">
                  <div className="font-bold text-gray-900">
                    {r.outputVolumeM3.toFixed(4)}{' '}
                    <span className="text-[10px] text-gray-400 font-sans font-normal">m³</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-sans">{r.outputPieces} pcs</div>
                </td>

                <td className="py-3 px-4 whitespace-nowrap text-center">
                  {getYieldBadge(r.yieldPercent)}
                </td>

                <td className="py-3 px-4 whitespace-nowrap text-right font-mono text-gray-700">
                  <span className="font-medium">{r.wasteVolumeM3.toFixed(4)}</span>{' '}
                  <span className="text-[10px] text-gray-400 font-sans font-normal">m³</span>
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
                          title="Ubah data produksi (编辑)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(r.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus data produksi (删除)"
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
