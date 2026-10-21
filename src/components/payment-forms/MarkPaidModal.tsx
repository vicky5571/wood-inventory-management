'use client';

/**
 * src/components/payment-forms/MarkPaidModal.tsx
 *
 * Modal dialog for transitioning PaymentForm from ISSUED to PAID.
 * Prompts for invoice number, payment date, method, and notes.
 */

import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign } from 'lucide-react';
import type { PaymentFormWithLines } from '../../types/index.ts';

interface MarkPaidModalProps {
  isOpen: boolean;
  form: PaymentFormWithLines;
  onClose: () => void;
  onConfirm: (
    formId: string,
    data: { invoiceNumber: string; paymentDate: string; paymentMethod: string; notes?: string }
  ) => Promise<unknown>;
}

export function MarkPaidModal({ isOpen, form, onClose, onConfirm }: MarkPaidModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Transfer Bank');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !paymentDate) return;

    setIsSubmitting(true);
    try {
      await onConfirm(form.id, {
        invoiceNumber: invoiceNumber.trim(),
        paymentDate,
        paymentMethod,
        notes: notes.trim() || undefined,
      });
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
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-950">Tandai Lunas (标记已结清)</h3>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Nomor Faktur / Bukti Bayar (发票/收据号) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Contoh: INV-2026-X102"
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#ffc908]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Tanggal Pembayaran (付款日期) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#ffc908]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Metode Pembayaran (方式)
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#ffc908]"
              >
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Bilyet Giro / Cek">Bilyet Giro / Cek</option>
                <option value="Tunai / Kas">Tunai / Kas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Catatan Pembayaran (备注 - opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan pembayaran..."
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#ffc908]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !invoiceNumber.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Konfirmasi Lunas'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
