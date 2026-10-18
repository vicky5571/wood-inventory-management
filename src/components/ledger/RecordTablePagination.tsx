'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface RecordTablePaginationProps {
  currentPage: number;
  pageSize: number; // 25, 50, 100, or -1 (Semua / All)
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZES: readonly number[] = [25, 50, 100, -1];

export function RecordTablePagination({
  currentPage,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: RecordTablePaginationProps) {
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalRecords / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const start = totalRecords === 0 ? 0 : pageSize === -1 ? 1 : (validPage - 1) * pageSize + 1;
  const end = pageSize === -1 ? totalRecords : Math.min(validPage * pageSize, totalRecords);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50/70 border-t border-gray-200/80 select-none">
      {/* Page Size Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Baris per halaman (每页行数):</span>
        <div className="inline-flex items-center p-0.5 bg-gray-200/70 rounded-lg border border-gray-200 shadow-inner">
          {PAGE_SIZES.map((size) => {
            const isActive = pageSize === size;
            const label = size === -1 ? 'Semua (全部)' : size.toString();
            return (
              <button
                key={size}
                type="button"
                onClick={() => onPageSizeChange(size)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#ffc908] text-[#101828] font-bold shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bilingual Record Counter */}
      <div className="text-xs text-gray-600 font-medium">
        {totalRecords === 0 ? (
          <span>0 data (0 条数据)</span>
        ) : (
          <span>
            Menampilkan <span className="font-semibold text-gray-900">{start}-{end}</span> dari{' '}
            <span className="font-semibold text-gray-900">{totalRecords}</span> data{' '}
            <span className="text-gray-400 font-normal">
              (显示 {start}-{end} 条，共 {totalRecords} 条)
            </span>
          </span>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || pageSize === -1}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
          title="Halaman Sebelumnya (上一页)"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg shadow-2xs">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || pageSize === -1}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
          title="Halaman Berikutnya (下一页)"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
