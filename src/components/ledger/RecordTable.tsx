'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { WoodReceivingRecord } from '@/src/types';
import { SearchX, RotateCcw, FileSpreadsheet, LayoutList, Smartphone, ArrowRight } from 'lucide-react';
import { RecordTableCompactView, type SortField, type SortDirection } from './RecordTableCompactView';
import { RecordTableExcelView } from './RecordTableExcelView';
import { RecordTableMobileView } from './RecordTableMobileView';
import { RecordTablePagination } from './RecordTablePagination';

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
  const [viewMode, setViewMode] = useState<'compact' | 'excel' | 'mobile'>('excel');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  React.useEffect(() => { setCurrentPage(1); }, [records, searchQuery]);

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

  const displayedRecords = React.useMemo(() => {
    if (pageSize === -1) return sortedRecords;
    const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center text-gray-500 shadow-xs flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-[#ffc908]/40 flex items-center justify-center text-[#b38600]">
          <SearchX className="w-6 h-6" />
        </div>
        <div className="max-w-md">
          <h4 className="text-sm font-bold text-gray-900 mb-1">Tidak Ada Data Ditemukan (未找到相关记录)</h4>
          <p className="text-xs text-gray-500">Tidak ada catatan penerimaan kayu yang cocok dengan kriteria filter saat ini.</p>
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
      {/* Quick Action Banner for Mobile Tally Workstation */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-transparent border-b border-amber-300/40 px-4 py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-900 font-bold">
          <span className="p-1 rounded bg-[#ffc908] text-[#101828]">📱</span>
          <span>Mode Tally Lapangan (现场检尺): Catat ukuran kayu langsung di bak truk.</span>
        </div>
        <Link
          href="/tally"
          className="px-3 py-1 bg-[#101828] hover:bg-gray-800 text-white rounded-lg font-bold text-[11px] shrink-0 transition flex items-center gap-1 shadow-2xs"
        >
          <span>Buka Tally (打开检尺台)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Top Table Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-gray-50/70 border-b border-gray-200/80">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Format Tampilan (视图格式):</span>
          <span className="text-[11px] text-gray-400 font-mono">{records.length} Baris Data</span>
        </div>

        {/* View Switcher Segmented Control */}
        <div className="inline-flex items-center p-0.5 bg-gray-200/70 rounded-xl border border-gray-200 shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('excel')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === 'excel' ? 'bg-white text-[#101828] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${viewMode === 'excel' ? 'text-amber-600' : 'text-gray-400'}`} />
            <span>Excel Lengkap (完整总账)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('compact')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === 'compact' ? 'bg-white text-[#101828] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LayoutList className={`w-3.5 h-3.5 ${viewMode === 'compact' ? 'text-amber-600' : 'text-gray-400'}`} />
            <span>Ringkas (简略视图)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === 'mobile' ? 'bg-white text-[#101828] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Smartphone className={`w-3.5 h-3.5 ${viewMode === 'mobile' ? 'text-amber-600' : 'text-gray-400'}`} />
            <span>Kartu (卡片)</span>
          </button>
        </div>
      </div>

      {/* Render Active Table View */}
      {viewMode === 'excel' ? (
        <RecordTableExcelView
          records={displayedRecords}
          canWrite={canWrite}
          searchQuery={searchQuery}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onEdit={onEdit}
          onDelete={onDelete}
          onPrint={onPrint}
        />
      ) : viewMode === 'compact' ? (
        <RecordTableCompactView
          records={displayedRecords}
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
        <RecordTableMobileView
          records={displayedRecords}
          canWrite={canWrite}
          onEdit={onEdit}
          onDelete={onDelete}
          onPrint={onPrint}
        />
      )}

      {/* Pagination Footer */}
      <RecordTablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalRecords={sortedRecords.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
