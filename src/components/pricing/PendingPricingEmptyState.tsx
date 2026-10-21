'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Search, ArrowLeft } from 'lucide-react';

export interface PendingPricingEmptyStateProps {
  isFiltered: boolean;
  onResetFilter?: () => void;
}

export function PendingPricingEmptyState({
  isFiltered,
  onResetFilter,
}: PendingPricingEmptyStateProps) {
  if (isFiltered) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-10 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mb-3">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 tracking-tight">
          Tidak Ada Data yang Cocok (无匹配数据)
        </h3>
        <p className="text-xs text-gray-500 max-w-sm mt-1 mb-4">
          Tidak ditemukan muatan pending dengan kriteria pencarian atau filter yang dipilih.
        </p>
        {onResetFilter && (
          <button
            type="button"
            onClick={onResetFilter}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
          >
            Hapus Filter (重置筛选)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-12 text-center flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50/50">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-gray-950 tracking-tight">
        Semua Harga Kayu Telah Ditetapkan (所有木材已完成定价)
      </h3>
      <p className="text-xs text-gray-500 max-w-md mt-1.5 mb-5 leading-relaxed">
        Bagus! Tidak ada muatan kayu yang berstatus pending harga. Semua penerimaan telah memiliki harga kontrak/pasar dan total neto telah terekonsiliasi penuh.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 text-xs font-bold text-[#101828] bg-[#ffc908] hover:bg-[#f0bc00] active:scale-[0.99] rounded-xl shadow-xs transition flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Buku Besar (返回总账)</span>
      </Link>
    </div>
  );
}
