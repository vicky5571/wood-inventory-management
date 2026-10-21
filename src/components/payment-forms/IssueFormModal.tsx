'use client';

/**
 * src/components/payment-forms/IssueFormModal.tsx
 *
 * Modal dialog for transitioning PaymentForm from DRAFT to ISSUED.
 */

import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import type { PaymentFormWithLines } from '../../types/index.ts';

interface IssueFormModalProps {
  isOpen: boolean;
  form: PaymentFormWithLines;
  onClose: () => void;
  onConfirm: (formId: string) => Promise<any>;
}

export function IssueFormModal({ isOpen, form, onClose, onConfirm }: IssueFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleIssue = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(form.id);
      onClose();
    } catch {
      // Handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-gray-950">Terbitkan Form Pembayaran</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-gray-600 mb-3">
            Apakah Anda yakin ingin menerbitkan form pembayaran <span className="font-mono font-bold text-gray-900">{form.formNumber}</span>?
          </p>

          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 mb-5 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              Setelah diterbitkan (ISSUED), rincian penerimaan dan volume terkunci dari pengeditan langsung. Pengubahan memerlukan pembatalan (VOID) form.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Batal (取消)
            </button>
            <button
              type="button"
              onClick={handleIssue}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menerbitkan...' : 'Terbitkan Sekarang (确定开出)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
