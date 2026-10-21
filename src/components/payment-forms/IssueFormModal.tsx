'use client';

/**
 * src/components/payment-forms/IssueFormModal.tsx
 *
 * Modal dialog for transitioning PaymentForm from DRAFT to ISSUED.
 * Enforces input of preprinted serial number (buku kwitansi) and issue date per ADR-0006.
 */

import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import type { PaymentFormWithLines } from '../../types/index.ts';

interface IssueFormModalProps {
  isOpen: boolean;
  form: PaymentFormWithLines;
  onClose: () => void;
  onConfirm: (formId: string, data?: { preprintedNumber: string; issueDate: string }) => Promise<unknown>;
}

export function IssueFormModal({ isOpen, form, onClose, onConfirm }: IssueFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preprintedNumber, setPreprintedNumber] = useState(form.preprintedNumber || '');
  const [issueDate, setIssueDate] = useState(
    form.issueDate || new Date().toISOString().slice(0, 10)
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleIssue = async () => {
    if (!preprintedNumber.trim()) {
      setValidationError('Nomor Kwitansi Buku fisik wajib diisi (e.g. 018532)');
      return;
    }
    if (!issueDate.trim()) {
      setValidationError('Tanggal terbit dokumen wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    try {
      await onConfirm(form.id, {
        preprintedNumber: preprintedNumber.trim(),
        issueDate: issueDate.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menerbitkan form';
      setValidationError(msg);
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
            <h3 className="text-sm font-bold text-gray-950">Terbitkan Lembar Tagihan (开出请款单)</h3>
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
          <p className="text-xs text-gray-600 mb-4">
            Masukkan nomor seri dari buku kwitansi fisik dan tanggal terbit untuk mengunci tagihan ini.
          </p>

          <div className="space-y-3.5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                No. Kwitansi Buku Fisik (收据编号) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={preprintedNumber}
                onChange={(e) => {
                  setPreprintedNumber(e.target.value);
                  setValidationError(null);
                }}
                placeholder="Contoh: 018532"
                className="w-full px-3 py-2 text-sm font-mono font-bold text-gray-950 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Nomor seri tercetak di pojok kanan atas lembar kwitansi karbon
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Tanggal Terbit (开出日期) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => {
                  setIssueDate(e.target.value);
                  setValidationError(null);
                }}
                className="w-full px-3 py-2 text-xs font-medium text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>
          </div>

          {validationError && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {validationError}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 mb-5 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              Setelah diterbitkan (ISSUED), rincian tagihan akan terkunci dari perubahan langsung.
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
