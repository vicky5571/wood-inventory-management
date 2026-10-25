'use client';

import React from 'react';
import Link from 'next/link';
import type { DashboardMetrics } from '@/src/types';
import { Tag, CheckCircle2 } from 'lucide-react';
import { formatRupiah, StatusPill } from './kpi-card-helpers';

export function KpiCardPendingPricing({ metrics }: { metrics: DashboardMetrics }) {
  const count = metrics.pendingPricingCount ?? 0;
  const volume = metrics.pendingPricingVolumeM3 ?? 0;
  const exposure = metrics.pendingPricingValueExposureIDR ?? 0;

  return (
    <Link
      href="/pending-pricing"
      className={`bg-white rounded-2xl border transition-all flex flex-col overflow-hidden group shadow-xs hover:shadow-md cursor-pointer ${
        count > 0 ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200/80'
      }`}
    >
      <div className={`h-1 w-full ${count > 0 ? 'bg-[#ffc908]' : 'bg-gray-300'}`} />
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${
          count > 0
            ? 'border-amber-100 bg-gradient-to-br from-amber-50/70 to-white'
            : 'border-gray-100 bg-gradient-to-br from-gray-50/40 to-white'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <Tag className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[#101828] uppercase tracking-wide">
            Pending Harga <span className="text-[11px] font-normal normal-case text-gray-500 tracking-normal">(待定价)</span>
          </span>
        </div>
      </div>

      <div className="px-4 pt-3.5 pb-2.5">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-3xl font-bold font-mono tracking-tight ${
              count > 0 ? 'text-amber-700' : 'text-[#101828]'
            }`}
          >
            {volume.toFixed(2)}
          </span>
          <span className="text-xs font-semibold text-gray-500">m³ Pending</span>
        </div>
        <div className="mt-1.5 flex items-center">
          <StatusPill
            text={count > 0 ? `${count} Item Belum Berharga` : 'Harga Lengkap'}
            variant={count > 0 ? 'amber' : 'emerald'}
            icon={count > 0 ? undefined : CheckCircle2}
            pulse={count > 0}
          />
        </div>
      </div>

      <div className="mt-auto px-4 pb-3.5 pt-1 flex flex-col gap-1.5">
        <div className="rounded-xl px-3 py-1.5 border bg-gray-50/80 border-gray-100 text-slate-600 flex flex-col justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 leading-tight">Estimasi</span>
          <span className="text-xs font-bold font-mono tabular-nums text-gray-800 mt-0.5 leading-tight">
            {formatRupiah(exposure)}
          </span>
        </div>
        <div className="rounded-xl px-3 py-1.5 border bg-amber-50/60 border-amber-100/80 text-amber-800 flex flex-col justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 leading-tight">Aksi</span>
          <span className="text-xs font-bold text-amber-900 mt-0.5 leading-tight group-hover:underline">
            Tetapkan &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
