'use client';

import React, { useState } from 'react';
import { useReportPeriods } from '../../src/hooks/useReportPeriods';
import { useAuth } from '../../src/hooks/useAuth';
import { PeriodList } from '../../src/components/report-periods/PeriodList';
import { PeriodCloseModal } from '../../src/components/report-periods/PeriodCloseModal';
import {
  CreatePeriodModal,
  ReopenPeriodModal,
} from '../../src/components/report-periods/PeriodModals';
import type { ReportPeriod, ReportPeriodClosePreview } from '../../src/types/index.ts';
import { ClipboardCheck, Plus, RefreshCw, AlertCircle } from 'lucide-react';

export default function ReportPeriodsPage() {
  const { user } = useAuth();
  const canWrite = user?.roleLevel === 1;

  const {
    periods,
    isLoading,
    error,
    refresh,
    createPeriod,
    getPreview,
    closePeriod,
    reopenPeriod: executeReopen,
  } = useReportPeriods();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [closingPeriod, setClosingPeriod] = useState<ReportPeriod | null>(null);
  const [preview, setPreview] = useState<ReportPeriodClosePreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [reopeningPeriod, setReopeningPeriod] = useState<ReportPeriod | null>(null);

  const handlePreviewClose = async (period: ReportPeriod) => {
    setClosingPeriod(period);
    setPreview(null);
    setIsPreviewLoading(true);
    try {
      const data = await getPreview(period.id);
      setPreview(data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal memuat preview penutupan');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!closingPeriod) return;
    await closePeriod(closingPeriod.id);
  };

  const handleConfirmReopen = async (reason: string) => {
    if (!reopeningPeriod) return;
    await executeReopen(reopeningPeriod.id, reason);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Periode Laporan</h1>
              <p className="text-xs text-gray-500">
                Siklus penutupan buku besar, pencocokan patokan harga otomatis, dan audit penguncian data
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-2xs"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          {canWrite && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Periode Baru</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Period List */}
      <PeriodList
        periods={periods}
        canWrite={canWrite}
        onPreviewClose={handlePreviewClose}
        onReopenPrompt={(p) => setReopeningPeriod(p)}
      />

      {/* Modals */}
      <CreatePeriodModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={async (data) => {
          await createPeriod(data);
        }}
      />

      <PeriodCloseModal
        isOpen={Boolean(closingPeriod)}
        period={closingPeriod}
        preview={preview}
        isLoading={isPreviewLoading}
        onClose={() => setClosingPeriod(null)}
        onConfirmClose={handleConfirmClose}
      />

      <ReopenPeriodModal
        isOpen={Boolean(reopeningPeriod)}
        period={reopeningPeriod}
        onClose={() => setReopeningPeriod(null)}
        onConfirmReopen={handleConfirmReopen}
      />
    </div>
  );
}
