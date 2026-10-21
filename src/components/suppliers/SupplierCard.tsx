'use client';

import React from 'react';
import type { SupplierWithMetrics, SupplierSummary, Supplier } from '@/src/types';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  User,
  Phone,
} from 'lucide-react';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

interface SupplierCardProps {
  supplier: SupplierWithMetrics | (SupplierSummary & Partial<Supplier>);
  onEdit?: (supplier: SupplierWithMetrics) => void;
  onDelete?: (id: string, name: string) => void;
  canWrite?: boolean;
}

export function SupplierCard({ supplier, onEdit, onDelete, canWrite = true }: SupplierCardProps) {
  const rating = ('ratingStatus' in supplier && supplier.ratingStatus) || supplier.status || 'OPTIMAL';
  const isOptimal = rating === 'OPTIMAL';
  const isAcceptable = rating === 'ACCEPTABLE';

  const name = supplier.name || supplier.supplierName || 'Pemasok';
  const code = supplier.code;

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 group">
      {/* Header & Status */}
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-gray-900 truncate" title={name}>
                {name}
              </h3>
              {code && (
                <span className="font-mono text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200/80 shrink-0">
                  {code}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400 font-sans block truncate">
              {supplier.address || 'Rekanan Terdaftar'}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        {isOptimal && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Optimal (&lt;1%)
          </span>
        )}
        {isAcceptable && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Wajar (1-3%)
          </span>
        )}
        {!isOptimal && !isAcceptable && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shrink-0">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Deviasi (&gt;3%)
          </span>
        )}
      </div>

      {/* PIC / Contact (if available) */}
      {(supplier.contactPerson || supplier.phone) && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-gray-50/70 border border-gray-100 text-[11px] text-gray-600">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate font-medium">{supplier.contactPerson || 'PIC'}</span>
          </div>
          {supplier.phone && (
            <div className="flex items-center gap-1 font-mono text-[10px] text-gray-500 shrink-0">
              <Phone className="w-3 h-3 text-gray-400" />
              <span>{supplier.phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Total Tally
          </span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className="text-sm font-bold text-gray-900">{supplier.totalTallyVolumeM3.toFixed(2)}</span>
            <span className="text-[10px] text-gray-500 font-sans">m³</span>
          </div>
        </div>

        <div className="p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Deviasi Rata-rata
          </span>
          <span className={`text-sm font-bold font-mono mt-1 ${
            supplier.discrepancyRatePercent > 0
              ? 'text-blue-700'
              : supplier.discrepancyRatePercent < -2.0
              ? 'text-rose-700'
              : supplier.discrepancyRatePercent < 0
              ? 'text-amber-700'
              : 'text-gray-700'
          }`}>
            {supplier.discrepancyRatePercent > 0 ? '+' : ''}{supplier.discrepancyRatePercent}%
          </span>
        </div>
      </div>

      {/* Financials & Deliveries */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100/80">
        <div>
          <span className="block text-[10px] text-gray-400">Total Nilai Pembelian</span>
          <span className="font-bold font-mono text-gray-800 text-[11px]">
            {formatRupiah(supplier.totalGrandNetPayable)}
          </span>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-gray-400">Frekuensi</span>
          <span className="font-semibold text-gray-700 text-[11px]">
            {supplier.totalDeliveries} Rit Truk
          </span>
        </div>
      </div>

      {/* Species Tags & Date */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100/80 text-[10px] text-gray-500">
        <div className="flex items-center gap-1 truncate">
          <Layers className="w-3 h-3 text-gray-400 shrink-0" />
          <span className="truncate">{supplier.primarySpecies?.join(', ') || 'Kayu Alam'}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 font-mono text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>{supplier.lastDeliveryDate || '-'}</span>
        </div>
      </div>

      {/* Action Buttons */}
      {canWrite && (onEdit || onDelete) && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(supplier as SupplierWithMetrics)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 transition flex items-center gap-1 cursor-pointer"
              title="Edit Data Pemasok"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          )}
          {onDelete && supplier.id && (
            <button
              type="button"
              onClick={() => onDelete(supplier.id, name)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition flex items-center gap-1 cursor-pointer"
              title="Hapus Data Pemasok"
            >
              <Trash2 className="w-3 h-3" />
              <span>Hapus</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
