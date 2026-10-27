'use client';

import React, { useState } from 'react';
import type { ReportPeriod, ReportPeriodClosePreview } from '../../types/index.ts';
import { X, Lock, CheckCircle2, AlertTriangle, Loader2, Calendar } from 'lucide-react';

export interface PeriodCloseModalProps {
  isOpen: boolean;
  period: ReportPeriod | null;
  preview: ReportPeriodClosePreview | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirmClose: () => Promise<unknown>;
}

export function PeriodCloseModal({
  isOpen,
  period,
  preview,
  isLoading,
  onClose,
  onConfirmClose,
}: PeriodCloseModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !period) return null;

  const handleClose = async () => {
    setIsClosing(true);
    setError(null);
    try {
      await onConfirmClose();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menutup laporan');
    } finally {
      setIsClosing(false);
    }
  };

  const readyCount = preview?.readyRecords.length ?? 0;
  const pendingCount = preview?.pendingRecords.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Penutupan Periode Laporan</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono mt-0.5">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>{period.name}</span>
                <span>({period.startDate} s/d {period.endDate})</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-gray-500 font-medium">Mencocokkan patokan harga kayu...</p>
            </div>
          ) : (
            <>
              {/* Ready Summary Card */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{readyCount} Record Siap Diberi Harga Otomatis</span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {preview?.totalReadyVolumeM3.toFixed(2)} m³
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-emerald-200/50">
                  <span className="text-emerald-700 font-medium">Estimasi Total Pembayaran Kayu Net:</span>
                  <span className="font-mono font-bold text-sm text-emerald-900">
                    Rp {(preview?.totalEstimatedNetIDR ?? 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Pending / Unmatched Card */}
              {pendingCount > 0 && (
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{pendingCount} Record Tanpa Patokan Harga (Tetap Pending)</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Record di bawah ini tidak menemukan entri harga yang cocok dan akan tetap berstatus Pending
                    Harga setelah laporan ditutup:
                  </p>
                  <div className="max-h-40 overflow-y-auto divide-y divide-amber-200/60 rounded-lg border border-amber-200/60 bg-white/80">
                    {preview?.pendingRecords.map((p) => (
                      <div key={p.recordId} className="p-2.5 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-gray-900 mr-2">{p.truckPlateNumber}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px] mr-2">
                            {p.woodSpecies}
                          </span>
                          <span className="text-gray-500 text-[11px]">{p.supplierName}</span>
                        </div>
                        <span className="text-[10px] text-amber-800 italic shrink-0">
                          {p.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Notice */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-[11px] leading-relaxed">
                <span className="font-semibold text-gray-800">Perhatian:</span> Menutup laporan akan mengunci
                seluruh penerimaan kayu dalam rentang tanggal periode ini. Record yang telah terkunci tidak dapat
                diedit harganya secara manual kecuali periode dibuka kembali oleh Admin L1.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isClosing}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200/60 rounded-xl font-medium transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isClosing || isLoading || (readyCount === 0 && pendingCount === 0)}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-900 font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            {isClosing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            <span>Tutup Laporan ({readyCount} Record)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
