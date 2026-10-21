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
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          {yieldPercent.toFixed(1)}%
        </span>
      );
    }
    if (yieldPercent >= 50) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
          {yieldPercent.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
        {yieldPercent.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="bg-surface-raised border border-border-default rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface-base border-b border-border-default text-muted uppercase font-semibold tracking-wider">
              <th className="py-3 px-3.5 whitespace-nowrap">Tanggal & Shift</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Asal Log</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Jenis Kayu</th>
              <th className="py-3 px-3.5 whitespace-nowrap text-right">Log Input</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Hasil Olahan</th>
              <th className="py-3 px-3.5 whitespace-nowrap text-right">Volume Output</th>
              <th className="py-3 px-3.5 whitespace-nowrap text-center">Rendemen</th>
              <th className="py-3 px-3.5 whitespace-nowrap text-right">Waste</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Operator</th>
              {(canEdit || canDelete) && (
                <th className="py-3 px-3.5 whitespace-nowrap text-right">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {records.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-surface-overlay/50 transition-colors group"
              >
                <td className="py-3 px-3.5 whitespace-nowrap">
                  <div className="font-medium text-foreground">{r.productionDate}</div>
                  <div className="text-[11px] text-muted">
                    {r.shift ? `Shift ${r.shift}` : 'Tanpa Shift'}
                  </div>
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap">
                  <div className="font-semibold text-foreground">{r.sourceStorageYard}</div>
                  <div className="text-[11px] text-muted">{r.sourceKavlingNumber}</div>
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap font-medium text-foreground">
                  {r.inputSpecies}
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap text-right">
                  <div className="font-semibold text-foreground">
                    {r.inputVolumeM3.toFixed(4)}{' '}
                    <span className="text-[10px] text-muted font-normal">m3</span>
                  </div>
                  <div className="text-[11px] text-muted">{r.inputPieces} btg</div>
                </td>

                <td className="py-3 px-3.5">
                  <div className="font-medium text-foreground truncate max-w-[180px]">
                    {r.outputProduct}
                  </div>
                  {r.notes && (
                    <div className="text-[10px] text-muted truncate max-w-[180px]" title={r.notes}>
                      {r.notes}
                    </div>
                  )}
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap text-right">
                  <div className="font-semibold text-foreground">
                    {r.outputVolumeM3.toFixed(4)}{' '}
                    <span className="text-[10px] text-muted font-normal">m3</span>
                  </div>
                  <div className="text-[11px] text-muted">{r.outputPieces} pcs</div>
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap text-center">
                  {getYieldBadge(r.yieldPercent)}
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap text-right text-muted">
                  {r.wasteVolumeM3.toFixed(4)} m3
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap text-foreground">
                  {r.operatorName}
                </td>

                {(canEdit || canDelete) && (
                  <td className="py-3 px-3.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(r)}
                          className="p-1.5 text-muted hover:text-primary hover:bg-surface-base rounded-md transition-colors"
                          title="Ubah data produksi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(r.id)}
                          className="p-1.5 text-muted hover:text-rose-600 hover:bg-surface-base rounded-md transition-colors"
                          title="Hapus data produksi"
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
