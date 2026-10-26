'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Download,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { WoodReceivingRecord, ImportRow, ImportParseResult } from '@/src/types/index';
import { parseImportCsv, parseImportExcel } from '@/src/utils/records-import';
import { downloadCsvTemplate } from '@/src/utils/records-csv';
import { downloadExcelTemplate } from '@/src/utils/records-excel';
import { ImportPreviewTable } from './ImportPreviewTable';

export interface ImportTabProps {
  allRecords: WoodReceivingRecord[];
  onImportConfirm: (rows: ImportRow[]) => void;
  onClose: () => void;
}

export function ImportTab({ allRecords, onImportConfirm, onClose }: ImportTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    if (selectedFile.size > 5 * 1024 * 1024) {
      setParseError('Ukuran file melebihi batas 5 MB');
      setFile(null);
      setParseResult(null);
      return;
    }

    const name = selectedFile.name.toLowerCase();
    const isCsv = name.endsWith('.csv');
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');

    if (!isCsv && !isExcel) {
      setParseError('Format file tidak didukung. Gunakan .csv, .xlsx, atau .xls');
      setFile(null);
      setParseResult(null);
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);

    const existingReceiptNumbers = new Set(allRecords.map((r) => r.receiptNumber).filter(Boolean));

    try {
      let result: ImportParseResult;
      if (isCsv) {
        const text = await selectedFile.text();
        result = parseImportCsv(text, existingReceiptNumbers);
      } else {
        const buffer = await selectedFile.arrayBuffer();
        result = parseImportExcel(buffer, existingReceiptNumbers);
      }

      if (result.totalRows === 0) {
        setParseError('File tidak memiliki baris data untuk diimport');
        setParseResult(null);
        return;
      }

      setParseResult(result);
    } catch {
      setParseError('Gagal membaca file. Pastikan file tidak rusak dan sesuai format.');
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (!parseResult || parseResult.valid.length === 0) return;
    setIsImporting(true);
    onImportConfirm(parseResult.valid);
    onClose();
  };

  const handleClearFile = () => {
    setFile(null);
    setParseResult(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped) handleFileSelect(dropped);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
            isDragging
              ? 'border-[#ffc908] bg-[#ffc908]/10'
              : 'border-gray-200 hover:border-[#ffc908] bg-gray-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
            className="hidden"
          />
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#ffc908]/20 flex items-center justify-center text-gray-800">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-gray-800">
            Klik atau seret file CSV/Excel ke sini
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Format yang didukung: .csv, .xlsx, .xls (maksimal 5 MB)
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {file.name.endsWith('.csv') ? (
              <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />
            )}
            <div className="truncate">
              <div className="text-xs font-semibold text-gray-900 truncate">{file.name}</div>
              <div className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearFile}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Parsing state */}
      {isParsing && (
        <div className="flex items-center justify-center gap-2 p-4 text-xs text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin text-[#ffc908]" />
          <span>Memvalidasi format dan memeriksa duplikat...</span>
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Parse result preview & summary */}
      {parseResult && (
        <div className="space-y-3">
          <ImportPreviewTable
            validRows={parseResult.valid}
            duplicatesCount={parseResult.duplicates.length}
            errors={parseResult.errors}
          />

          {/* Confirm Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={parseResult.valid.length === 0 || isImporting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-900 bg-[#ffc908] hover:bg-[#e6b507] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengimport...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Import ({parseResult.valid.length} Record)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Template Download Section */}
      <div className="pt-3 border-t border-gray-100">
        <div className="text-[11px] font-semibold text-gray-700 mb-2">
          Unduh Template Kosong (下载空白模板):
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Template CSV</span>
          </button>
          <button
            type="button"
            onClick={downloadExcelTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Template Excel (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
