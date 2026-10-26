'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUpDown, X } from 'lucide-react';
import type { ExportImportModalProps } from '@/src/types/index';
import { ExportTab } from './export-import/ExportTab';
import { ImportTab } from './export-import/ImportTab';

export function ExportImportModal({
  isOpen,
  allRecords,
  onClose,
  onImportConfirm,
}: ExportImportModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101828]/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ffc908]/20 text-gray-900 flex items-center justify-center shrink-0">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Export / Import Data</h2>
              <p className="text-xs text-gray-500">Buku Besar Penerimaan Kayu (木材入库总账)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 border-b border-gray-100 bg-white" role="tablist">
          <div className="flex gap-6">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'export'}
              onClick={() => setActiveTab('export')}
              className={`py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
                activeTab === 'export'
                  ? 'border-[#ffc908] text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ekspor Data (导出)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'import'}
              onClick={() => setActiveTab('import')}
              className={`py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
                activeTab === 'import'
                  ? 'border-[#ffc908] text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Import Data (导入)
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'export' ? (
            <div role="tabpanel">
              <ExportTab allRecords={allRecords} />
            </div>
          ) : (
            <div role="tabpanel">
              <ImportTab
                allRecords={allRecords}
                onImportConfirm={onImportConfirm}
                onClose={onClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
