'use client';

import React from 'react';
import type { ReportPeriod } from '../../types/index.ts';
import {
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export interface PeriodListProps {
  periods: ReportPeriod[];
  canWrite: boolean;
  onPreviewClose: (period: ReportPeriod) => void;
  onReopenPrompt: (period: ReportPeriod) => void;
}

export function PeriodList({
  periods,
  canWrite,
  onPreviewClose,
  onReopenPrompt,
}: PeriodListProps) {
  const openPeriods = periods.filter((p) => p.status === 'OPEN' || p.status === 'REOPENED');
  const closedPeriods = periods.filter((p) => p.status === 'CLOSED');

  return (
    <div className="flex flex-col gap-6">
      {/* Active (OPEN or REOPENED) Periods */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Periode Berjalan (Terbuka)</h2>
              <p className="text-[11px] text-gray-500">Penerimaan kayu pada periode ini belum dikunci</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-full">
            {openPeriods.length} Periode Aktif
          </span>
        </div>

        {openPeriods.length === 0 ? (
          <div className="py-10 px-4 text-center text-gray-400 text-xs">
            Tidak ada periode terbuka. Buat periode baru untuk memulai penutupan laporan.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {openPeriods.map((p) => (
              <div
                key={p.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-amber-50/10 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">{p.name}</h3>
                    {p.status === 'REOPENED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        <RotateCcw className="w-3 h-3" /> Dibuka Kembali
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3" /> Terbuka (Open)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{p.startDate}</span>
                    <span className="text-gray-400">s/d</span>
                    <span>{p.endDate}</span>
                  </div>

                  {p.reopenReason && (
                    <div className="text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200/50 mt-1 max-w-xl">
                      <span className="font-semibold">Alasan dibuka kembali:</span> {p.reopenReason} (oleh {p.reopenedBy || 'Admin'})
                    </div>
                  )}

                  {p.notes && <p className="text-[11px] text-gray-500 mt-0.5">{p.notes}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onPreviewClose(p)}
                    className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                    <span>Preview & Tutup</span>
                  </button>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => onPreviewClose(p)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Tutup Laporan</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Closed Periods */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Riwayat Laporan Ditutup (Terkunci)</h2>
              <p className="text-[11px] text-gray-500">Penerimaan kayu terkunci permanen dengan audit snapshot harga</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-full">
            {closedPeriods.length} Periode Ditutup
          </span>
        </div>

        {closedPeriods.length === 0 ? (
          <div className="py-10 px-4 text-center text-gray-400 text-xs">
            Belum ada periode yang ditutup.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {closedPeriods.map((p) => (
              <div
                key={p.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">{p.name}</h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Lock className="w-3 h-3" /> Ditutup & Terkunci
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{p.startDate}</span>
                    <span>s/d</span>
                    <span>{p.endDate}</span>
                    <span className="text-gray-300">•</span>
                    <span>Ditutup oleh {p.closedBy || 'Admin'} ({p.closedAt?.slice(0, 10)})</span>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <div className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/80">
                      <span className="text-gray-400 text-[10px] block">TOTAL RECORD</span>
                      <span className="font-mono font-bold text-gray-800">{p.totalRecords ?? 0} Rit</span>
                    </div>
                    <div className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/80">
                      <span className="text-gray-400 text-[10px] block">TOTAL VOLUME</span>
                      <span className="font-mono font-bold text-gray-800">
                        {p.totalVolumeM3 !== undefined ? p.totalVolumeM3.toFixed(2) : '0.00'} m³
                      </span>
                    </div>
                    <div className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/80">
                      <span className="text-gray-400 text-[10px] block">TOTAL NET KAYU</span>
                      <span className="font-mono font-bold text-emerald-700">
                        Rp {(p.totalNetPayableIDR ?? 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {canWrite && (
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => onReopenPrompt(p)}
                      className="px-3.5 py-2 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Kembali</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
