'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, Calendar } from 'lucide-react';
import type { WoodReceivingRecord, DatePreset } from '@/src/types/index';
import {
  resolveDatePreset,
  filterRecordsByDateRange,
} from '@/src/utils/records-export-filter';
import { exportRecordsToCsvWithRange } from '@/src/utils/records-csv';
import { exportRecordsToExcelWithRange } from '@/src/utils/records-excel';

export interface ExportTabProps {
  allRecords: WoodReceivingRecord[];
}

const PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: 'all', label: 'Semua Data' },
  { key: 'this_month', label: 'Bulan Ini' },
  { key: 'last_month', label: 'Bulan Lalu' },
  { key: 'this_week', label: 'Minggu Ini' },
  { key: 'last_week', label: 'Minggu Lalu' },
  { key: 'custom', label: 'Kustom' },
];

export function ExportTab({ allRecords }: ExportTabProps) {
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const resolvedRange = selectedPreset === 'custom'
    ? { startDate: customStart || undefined, endDate: customEnd || undefined }
    : resolveDatePreset(selectedPreset);

  const filteredRecords = filterRecordsByDateRange(
    allRecords,
    resolvedRange.startDate,
    resolvedRange.endDate,
  );

  const handleExport = () => {
    setIsExporting(true);
    try {
      if (exportFormat === 'csv') {
        exportRecordsToCsvWithRange(filteredRecords, resolvedRange.startDate, resolvedRange.endDate);
      } else {
        exportRecordsToExcelWithRange(filteredRecords, resolvedRange.startDate, resolvedRange.endDate);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date preset selector */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">
          Rentang Tanggal (日期范围)
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const active = selectedPreset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelectedPreset(p.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition border cursor-pointer ${
                  active
                    ? 'bg-[#ffc908]/20 border-[#ffc908] text-gray-900 font-semibold shadow-2xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {selectedPreset === 'custom' && (
          <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Dari Tanggal (起始)</label>
              <div className="relative">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Sampai Tanggal (结束)</label>
              <div className="relative">
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Format selector */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">
          Format Ekspor (导出格式)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setExportFormat('csv')}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
              exportFormat === 'csv'
                ? 'border-[#ffc908] bg-[#ffc908]/10 text-gray-900'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold">CSV (.csv)</div>
              <div className="text-[11px] text-gray-500">Universal text format (RFC 4180)</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setExportFormat('excel')}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
              exportFormat === 'excel'
                ? 'border-[#ffc908] bg-[#ffc908]/10 text-gray-900'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold">Excel (.xlsx)</div>
              <div className="text-[11px] text-gray-500">SheetJS spreadsheet with styles</div>
            </div>
          </button>
        </div>
      </div>

      {/* Summary and Action */}
      <div className="pt-2 flex items-center justify-between border-t border-gray-100">
        <div className="text-xs text-gray-600">
          {filteredRecords.length > 0 ? (
            <span>
              <strong className="text-gray-900">{filteredRecords.length}</strong> record siap diekspor
            </span>
          ) : (
            <span className="text-amber-600 font-medium">
              Tidak ada data dalam rentang tanggal ini
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={filteredRecords.length === 0 || isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-900 bg-[#ffc908] hover:bg-[#e6b507] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Mengekspor...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Ekspor {exportFormat === 'csv' ? 'CSV' : 'Excel'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
