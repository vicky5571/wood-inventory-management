'use client';

import React, { useState } from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { SearchX, RotateCcw, FileSpreadsheet, LayoutList, Printer } from 'lucide-react';
import { RecordTableCompactView, type SortField, type SortDirection } from './RecordTableCompactView';
import { RecordTableExcelView } from './RecordTableExcelView';

// Subcomponents provide print action trigger: title="Cetak Tanda Terima (打印进厂单)" invoking onPrint?.(r) with <Printer />

export function RecordTable({
  records,
  canWrite = true,
  searchQuery,
  onEdit,
  onDelete,
  onPrint,
  onResetFilters,
}: {
  records: WoodReceivingRecord[];
  canWrite?: boolean;
  searchQuery?: string;
  onEdit: (record: WoodReceivingRecord) => void;
  onDelete: (id: string) => void;
  onPrint?: (record: WoodReceivingRecord) => void;
  onResetFilters?: () => void;
}) {
  const [viewMode, setViewMode] = useState<'compact' | 'excel'>('excel');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedRecords = React.useMemo(() => {
    if (!sortField) return records;
    return [...records].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [records, sortField, sortDirection]);

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center text-gray-500 shadow-xs flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-[#ffc908]/40 flex items-center justify-center text-[#b38600]">
          <SearchX className="w-6 h-6" />
        </div>
        <div className="max-w-md">
          <h4 className="text-sm font-bold text-gray-900 mb-1">
            Tidak Ada Data Ditemukan (未找到相关记录)
          </h4>
          <p className="text-xs text-gray-500">
            Tidak ada catatan penerimaan kayu yang cocok dengan kriteria filter atau kata kunci saat ini.
          </p>
        </div>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#101828] bg-[#ffc908] hover:bg-[#f0bc00] rounded-xl shadow-2xs transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Semua Filter (重置筛选)</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Top Table Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-gray-50/70 border-b border-gray-200/80">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
            Format Tampilan (视图格式):
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            {records.length} Baris Data
          </span>
        </div>

        {/* View Switcher Segmented Control */}
        <div className="inline-flex items-center p-0.5 bg-gray-200/70 rounded-xl border border-gray-200 shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('excel')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === 'excel'
                ? 'bg-white text-[#101828] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${viewMode === 'excel' ? 'text-amber-600' : 'text-gray-400'}`} />
            <span>Excel Lengkap (完整总账)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('compact')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-white text-[#101828] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LayoutList className={`w-3.5 h-3.5 ${viewMode === 'compact' ? 'text-amber-600' : 'text-gray-400'}`} />
            <span>Ringkas (简略视图)</span>
          </button>
        </div>
      </div>

      {/* Render Active Table View */}
      {viewMode === 'excel' ? (
        <RecordTableExcelView
          records={sortedRecords}
          canWrite={canWrite}
          searchQuery={searchQuery}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onEdit={onEdit}
          onDelete={onDelete}
          onPrint={onPrint}
        />
      ) : (
        <RecordTableCompactView
          records={sortedRecords}
          canWrite={canWrite}
          searchQuery={searchQuery}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onEdit={onEdit}
          onDelete={onDelete}
          onPrint={onPrint}
        />
      )}
    </div>
  );
}
