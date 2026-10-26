'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { ImportRow, ImportError } from '@/src/types/index';

export interface ImportPreviewTableProps {
  validRows: ImportRow[];
  duplicatesCount: number;
  errors: ImportError[];
}

export function ImportPreviewTable({
  validRows,
  duplicatesCount,
  errors,
}: ImportPreviewTableProps) {
  return (
    <div className="space-y-3">
      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {validRows.length} baris valid
        </span>
        {duplicatesCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            {duplicatesCount} duplikat dilewati
          </span>
        )}
        {errors.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.length} baris bermasalah
          </span>
        )}
      </div>

      {/* Preview Table of First 10 Rows */}
      {validRows.length > 0 ? (
        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold sticky top-0">
              <tr>
                <th className="py-2 px-2.5">#</th>
                <th className="py-2 px-2.5">Tgl Terima</th>
                <th className="py-2 px-2.5">No. Polisi</th>
                <th className="py-2 px-2.5">No. Kwitansi</th>
                <th className="py-2 px-2.5">Supplier</th>
                <th className="py-2 px-2.5">Jenis Kayu</th>
                <th className="py-2 px-2.5 text-right">Vol (m³)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {validRows.slice(0, 10).map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/60">
                  <td className="py-1.5 px-2.5 text-gray-400 font-mono">{idx + 1}</td>
                  <td className="py-1.5 px-2.5 text-gray-800 font-mono">{row.record.receiptDate}</td>
                  <td className="py-1.5 px-2.5 text-gray-800">{row.record.truckPlateNumber}</td>
                  <td className="py-1.5 px-2.5 text-gray-800 font-mono">{row.record.receiptNumber}</td>
                  <td className="py-1.5 px-2.5 text-gray-800 truncate max-w-[120px]">{row.record.supplierName}</td>
                  <td className="py-1.5 px-2.5 text-gray-800">{row.record.woodSpecies}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-gray-900">{row.record.tallyVolumeM3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          Semua baris sudah ada di buku besar atau tidak memiliki data valid baru.
        </div>
      )}

      {/* Error warnings if any */}
      {errors.length > 0 && (
        <div className="p-2.5 bg-red-50/60 border border-red-100 rounded-xl text-[11px] text-red-700 space-y-1">
          <div className="font-semibold">Beberapa baris dilewati karena format tidak sesuai:</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {errors.slice(0, 3).map((err, i) => (
              <li key={i}>Baris {err.rowIndex}: {err.reason}</li>
            ))}
            {errors.length > 3 && (
              <li>...dan {errors.length - 3} baris lainnya</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
