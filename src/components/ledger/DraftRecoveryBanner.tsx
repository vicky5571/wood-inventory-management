'use client';

import React from 'react';
import { History, RotateCcw, Trash2 } from 'lucide-react';

export interface DraftRecoveryBannerProps {
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryBanner({ onRestore, onDiscard }: DraftRecoveryBannerProps) {
  return (
    <div
      role="alert"
      className="bg-amber-50/90 border-b border-amber-200/80 px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center gap-2.5 text-xs text-amber-950 font-medium">
        <span className="p-1 rounded-lg bg-[#ffc908]/30 text-[#101828] shrink-0">
          <History className="w-4 h-4 text-amber-800" />
        </span>
        <span>
          Draf Belum Tersimpan Ditemukan (发现未保存草稿): Lanjutkan pengisian terakhir?
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button
          type="button"
          onClick={onDiscard}
          className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1 cursor-pointer border border-transparent hover:border-red-200"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          <span>Buang Draf (放弃)</span>
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="px-3.5 py-1.5 text-xs font-bold text-[#101828] bg-[#ffc908] hover:bg-[#f0bc00] active:scale-95 rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#101828]" />
          <span>Pulihkan Draf (恢复)</span>
        </button>
      </div>
    </div>
  );
}
