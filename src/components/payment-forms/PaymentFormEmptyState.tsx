'use client';

/**
 * src/components/payment-forms/PaymentFormEmptyState.tsx
 *
 * Friendly empty state for Weekly Payment Forms view.
 */

import React from 'react';
import { FileCheck, Sparkles } from 'lucide-react';

interface PaymentFormEmptyStateProps {
  onOpenGenerateModal?: () => void;
  canWrite?: boolean;
}

export function PaymentFormEmptyState({
  onOpenGenerateModal,
  canWrite = true,
}: PaymentFormEmptyStateProps) {
  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-12 text-center shadow-xs">
      <div className="w-14 h-14 mx-auto mb-4 bg-amber-50 text-[#b38600] rounded-2xl flex items-center justify-center border border-amber-200/60 shadow-xs">
        <FileCheck className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1">
        Belum Ada Form Pembayaran untuk Minggu Ini
      </h3>
      <p className="text-xs text-gray-500 max-w-md mx-auto mb-5 leading-relaxed">
        Penerimaan kayu pada minggu ini belum dikonsolidasikan ke dalam form pembayaran mingguan. Klik tombol di bawah untuk membuat form otomatis dikelompokkan per Supplier, Jenis Kayu, dan Kontrak.
      </p>

      {canWrite && onOpenGenerateModal && (
        <button
          type="button"
          onClick={onOpenGenerateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Form Sekarang (立即生成)</span>
        </button>
      )}
    </div>
  );
}
