'use client';

import React, { useState } from 'react';
import type { ReportPeriod } from '../../types/index.ts';
import { X, Calendar, Unlock, Loader2 } from 'lucide-react';

export interface CreatePeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; startDate: string; endDate: string; notes?: string }) => Promise<unknown>;
}

export function CreatePeriodModal({ isOpen, onClose, onCreate }: CreatePeriodModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      setError('Nama periode, tanggal mulai, dan tanggal akhir wajib diisi');
      return;
    }
    if (startDate > endDate) {
      setError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), startDate, endDate, notes: notes.trim() || undefined });
      setName('');
      setStartDate('');
      setEndDate('');
      setNotes('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat periode');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Buat Periode Laporan Baru</h2>
              <p className="text-[11px] text-gray-500">Tentukan rentang tanggal penerimaan kayu</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">{error}</div>}

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Nama Periode *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Periode Minggu 1 Oktober 2026"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Tanggal Mulai *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Tanggal Akhir *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Catatan (Opsional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan internal periode..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-medium">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold rounded-xl shadow-xs flex items-center gap-1.5">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Buat Periode</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface ReopenModalProps {
  isOpen: boolean;
  period: ReportPeriod | null;
  onClose: () => void;
  onConfirmReopen: (reason: string) => Promise<unknown>;
}

export function ReopenPeriodModal({ isOpen, period, onClose, onConfirmReopen }: ReopenModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !period) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Alasan pembukaan kembali wajib diisi untuk audit trail');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirmReopen(reason.trim());
      setReason('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuka kembali periode');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-700 flex items-center justify-center">
              <Unlock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Buka Kembali Periode Laporan</h2>
              <p className="text-[11px] text-gray-500">{period.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">{error}</div>}

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Alasan Pembukaan Kembali (Audit Trail) *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan mengapa laporan ini perlu dibuka kembali (misal: revisi harga supplier, perbaikan surat jalan)..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-orange-500"
              required
            />
          </div>

          <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-medium">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Buka Kembali</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
