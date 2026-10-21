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
    <div className="bg-surface-raised border border-border-default rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface-base border-b border-border-default text-muted uppercase font-semibold tracking-wider">
              <th className="py-3 px-3.5 whitespace-nowrap">Tanggal</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Jenis Kayu</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Alur Perpindahan Kavling</th>
              <th className="py-3 px-3.5 whitespace-nowrap text-right">Volume</th>
              <th className="py-3 px-3.5 whitespace-nowrap text-right">Batang</th>
              <th className="py-3 px-3.5">Alasan Sortir</th>
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
                <td className="py-3 px-3.5 whitespace-nowrap font-medium text-foreground">
                  {r.sortingDate}
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap font-semibold text-foreground">
                  {r.species}
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-medium text-foreground">{r.sourceStorageYard}</div>
                      <div className="text-[11px] text-muted">{r.sourceKavlingNumber}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">{r.targetStorageYard}</div>
                      <div className="text-[11px] text-muted">{r.targetKavlingNumber}</div>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap text-right">
                  <span className="font-semibold text-foreground">{r.volumeM3.toFixed(4)}</span>{' '}
                  <span className="text-[10px] text-muted font-normal">m3</span>
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap text-right font-medium text-foreground">
                  {r.pieces} btg
                </td>

                <td className="py-3 px-3.5">
                  <div className="font-medium text-foreground max-w-[200px] truncate" title={r.reason}>
                    {r.reason}
                  </div>
                  {r.notes && (
                    <div className="text-[10px] text-muted max-w-[200px] truncate" title={r.notes}>
                      {r.notes}
                    </div>
                  )}
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
                          title="Ubah data sortir"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(r.id)}
                          className="p-1.5 text-muted hover:text-rose-600 hover:bg-surface-base rounded-md transition-colors"
                          title="Hapus data sortir"
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
