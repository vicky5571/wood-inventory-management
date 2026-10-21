'use client';

/**
 * src/components/payment-forms/PaymentFormKpiStrip.tsx
 *
 * KPI summary strip displaying total forms, status distribution,
 * total volume, and outstanding accounts payable (AP).
 */

import React from 'react';
import { FileText, Clock, CheckCircle2, DollarSign } from 'lucide-react';

interface PaymentFormKpiStripProps {
  kpis: {
    totalForms: number;
    draftCount: number;
    issuedCount: number;
    paidCount: number;
    voidCount: number;
    totalOutstandingAP: number;
    totalVolumeM3: number;
  };
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function PaymentFormKpiStrip({ kpis }: PaymentFormKpiStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {/* 1. Total Forms */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Form (付款单数)
          </span>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-gray-950">{kpis.totalForms}</span>
          <span className="text-xs text-gray-500">form minggu ini</span>
        </div>
      </div>

      {/* 2. Status Breakdown */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Distribusi Status (状态分布)
          </span>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-gray-100 text-gray-700">
            {kpis.draftCount} Draft
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
            {kpis.issuedCount} Issued
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
            {kpis.paidCount} Paid
          </span>
        </div>
      </div>

      {/* 3. Total Volume */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Kubikasi (总材积)
          </span>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-gray-950">
            {kpis.totalVolumeM3.toFixed(2)}
          </span>
          <span className="text-xs font-medium text-gray-500">m³</span>
        </div>
      </div>

      {/* 4. Total Outstanding AP */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            AP Terbit / Belum Lunas (待付总额)
          </span>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-xl font-black font-mono text-gray-950">
            {formatRupiah(kpis.totalOutstandingAP)}
          </span>
        </div>
      </div>
    </div>
  );
}
