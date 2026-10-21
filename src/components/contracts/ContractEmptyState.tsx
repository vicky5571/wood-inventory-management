'use client';

import React from 'react';
import { FileText, Plus } from 'lucide-react';

export interface ContractEmptyStateProps {
  onCreateClick?: () => void;
  canWrite?: boolean;
}

export function ContractEmptyState({ onCreateClick, canWrite }: ContractEmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs">
      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
        <FileText className="w-6 h-6 text-amber-700" />
      </div>
      <h3 className="text-base font-bold text-gray-900">
        Belum Ada Kontrak Perhutani (暂无合同记录)
      </h3>
      <p className="text-xs text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">
        Pencatatan kontrak Perhutani memungkinkan pemantauan stok kayu yang sudah dibeli tetapi belum terkirim (SKSHHK), cicilan kwitansi, dan tanggal jatuh tempo.
      </p>
      {canWrite && onCreateClick && (
        <div className="mt-5">
          <button
            type="button"
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kontrak Baru (录入新合同)</span>
          </button>
        </div>
      )}
    </div>
  );
}
