'use client';

/**
 * src/components/payment-forms/VoidFormModal.tsx
 *
 * Destructive confirmation modal for voiding a PaymentForm.
 * Unlinks the associated records and reverts their payment status.
 */

import React, { useState } from 'react';
import { X, AlertOctagon, AlertTriangle } from 'lucide-react';
import type { PaymentFormWithLines } from '../../types/index.ts';
import { extractErrorMessage } from '../../utils/error-message.ts';

interface VoidFormModalProps {
  isOpen: boolean;
  form: PaymentFormWithLines;
  onClose: () => void;
  onConfirm: (formId: string, reason: string) => Promise<unknown>;
}

export function VoidFormModal({ isOpen, form, onClose, onConfirm }: VoidFormModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Alasan pembatalan wajib diisi.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(form.id, reason.trim());
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Gagal membatalkan form pembayaran.'));
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/50">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-bold text-gray-950">Batalkan Form Pembayaran (作废)</h3>
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

        <form onSubmit={handleVoid} className="p-6">
          <p className="text-xs text-gray-600 mb-3">
            Anda akan membatalkan form <span className="font-mono font-bold text-gray-900">{form.preprintedNumber ? `N° ${form.preprintedNumber}` : form.id}</span> ({form.supplierName} - {form.woodSpecies}).
          </p>

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 mb-4 flex items-start gap-2.5 text-xs text-rose-900 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Tindakan ini tidak dapat dibatalkan</p>
              <p className="text-rose-800">
                Semua penerimaan kayu ({form.lines?.length || 0} baris) yang tertaut akan dilepaskan dan status pembayarannya dikembalikan ke UNPAID.
              </p>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Alasan Pembatalan (作废原因) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Salah penetapan harga kontrak, direvisi ke minggu berikutnya..."
              className="w-full text-xs px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-gray-900 placeholder:text-gray-400"
            />
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Membatalkan...' : 'Batalkan Form (确认作废)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
