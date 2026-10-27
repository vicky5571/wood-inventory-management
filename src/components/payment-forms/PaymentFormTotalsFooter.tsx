'use client';

/**
 * src/components/payment-forms/PaymentFormTotalsFooter.tsx
 *
 * Summary totals footer for PaymentForm detail view.
 * Aggregates volume, pieces, gross, tax, and net payable IDR.
 */

import React from 'react';
import type { PaymentForm } from '../../types/index.ts';

interface PaymentFormTotalsFooterProps {
  form: PaymentForm;
  isDirty?: boolean;
}

export function PaymentFormTotalsFooter({ form, isDirty }: PaymentFormTotalsFooterProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Ringkasan Keuangan & Volume (金额及体积汇总)
        </h3>
        {isDirty && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            Preview — Belum Disimpan
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
          <span className="text-[11px] font-medium text-gray-500 block mb-0.5">
            Total Batang (根数)
          </span>
          <p className="text-base font-bold font-mono text-gray-900">
            {form.totalTallyPieces.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-gray-500 ml-1">btg</span>
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
          <span className="text-[11px] font-medium text-gray-500 block mb-0.5">
            Total Volume (体积)
          </span>
          <p className="text-base font-bold font-mono text-gray-900">
            {form.totalTallyVolumeM3.toFixed(4)}
            <span className="text-xs font-normal text-gray-500 ml-1">m³</span>
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
          <span className="text-[11px] font-medium text-gray-500 block mb-0.5">
            Total Bruto (毛额)
          </span>
          <p className="text-base font-bold font-mono text-gray-900">
            Rp {Math.round(form.totalTimberGrossIDR).toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/70">
          <span className="text-[11px] font-medium text-amber-800 block mb-0.5">
            Potongan PPh 22 (预扣税)
          </span>
          <p className="text-base font-bold font-mono text-amber-900">
            Rp {Math.round(form.totalTimberPphIDR).toLocaleString('id-ID')}
          </p>
        </div>

        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-3.5 text-white shadow-xs">
          <span className="text-[11px] font-medium text-amber-100 block mb-0.5">
            Netto / Yang Dibayar (应付净额)
          </span>
          <p className="text-lg font-black font-mono tracking-tight">
            Rp {Math.round(form.totalTimberNetIDR).toLocaleString('id-ID')}
          </p>
        </div>
      </div>
    </div>
  );
}
