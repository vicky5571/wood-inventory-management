'use client';

/**
 * src/components/payment-forms/GenerateFormsModal.tsx
 *
 * Modal dialog for triggering weekly payment forms generation.
 */

import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, Calendar } from 'lucide-react';
import { listRecentWeeks, getWeekWindow } from '../../utils/week-window.ts';

interface GenerateFormsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (weekStartDate: string) => Promise<unknown>;
  defaultWeek?: string;
}

export function GenerateFormsModal({
  isOpen,
  onClose,
  onGenerate,
  defaultWeek,
}: GenerateFormsModalProps) {
  const recentWeeks = React.useMemo(() => listRecentWeeks(8), []);
  const [selectedWeek, setSelectedWeek] = useState<string>(
    () => defaultWeek || recentWeeks[0]?.startDate || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentWindow = getWeekWindow(selectedWeek);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeek) return;
    setIsSubmitting(true);
    try {
      await onGenerate(selectedWeek);
      onClose();
    } catch {
      // Error handled by parent hook via toast
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
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100/70 text-amber-800 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950">
                Generate Form Pembayaran Mingguan
              </h3>
              <p className="text-[11px] text-gray-500">
                Konsolidasi otomatis penerimaan kayu (Sabtu–Jumat)
              </p>
            </div>
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Pilih Minggu Operasional (周期选择)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#ffc908]"
              >
                {recentWeeks.map((w) => (
                  <option key={w.startDate} value={w.startDate}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Rentang: {currentWindow.startDate} (Sabtu 00:00 WIB) s/d {currentWindow.endDate} (Jumat 23:59 WIB)
            </p>
          </div>

          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 mb-5 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Ketentuan Pengelompokan:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-amber-800">
                <li>Satu form per kombinasi Supplier x Jenis Kayu x No. Kontrak.</li>
                <li>Record dengan harga kayu belum diisi (Pending) akan dilewati.</li>
                <li>Record yang sudah ada di form Terbit (Issued) atau Lunas (Paid) tidak akan diduplikasi.</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
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
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Memproses...' : 'Generate Form Sekarang'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
