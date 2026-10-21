'use client';

import React from 'react';
import { Pencil, Trash2, Phone, MapPin, Building2, Calendar, DollarSign, Layers } from 'lucide-react';
import type { BrokerWithMetrics } from '@/src/types';

export interface BrokerCardProps {
  broker: BrokerWithMetrics;
  canWrite?: boolean;
  onEdit: (broker: BrokerWithMetrics) => void;
  onDelete: (id: string) => void;
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function BrokerCard({ broker, canWrite = true, onEdit, onDelete }: BrokerCardProps) {
  const isActive = broker.status === 'ACTIVE';

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between gap-4">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                {broker.code}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
              >
                {isActive ? 'Aktif (生效)' : 'Non-Aktif (停用)'}
              </span>
            </div>
            <h3 className="text-base font-bold text-[#101828] mt-1.5">{broker.name}</h3>
            {broker.contactPerson && (
              <p className="text-xs text-gray-500 mt-0.5">PIC: {broker.contactPerson}</p>
            )}
          </div>

          {canWrite && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(broker)}
                title="Edit Broker"
                className="p-1.5 rounded-lg text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(broker.id)}
                title="Hapus Broker"
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1 text-xs text-gray-600">
          {broker.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="font-mono">{broker.phone}</span>
            </div>
          )}
          {broker.address && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{broker.address}</span>
            </div>
          )}
          {broker.defaultCommissionPerM3 !== undefined && broker.defaultCommissionPerM3 > 0 && (
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Default: {formatRupiah(broker.defaultCommissionPerM3)} / m³</span>
            </div>
          )}
        </div>
      </div>

      {/* Scorecard Metrics Grid */}
      <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[10px] text-gray-400 block font-semibold uppercase">Total Deals</span>
          <span className="font-mono font-bold text-gray-900">{broker.totalDeals} Transaksi</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 block font-semibold uppercase">Volume Fasilitasi</span>
          <span className="font-mono font-bold text-gray-900">{broker.totalVolumeM3Facilitated.toFixed(2)} m³</span>
        </div>
        <div className="col-span-2 pt-1 border-t border-gray-200/60">
          <span className="text-[10px] text-gray-400 block font-semibold uppercase">Total Komisi Diterima</span>
          <span className="font-mono font-bold text-base text-amber-800">
            {formatRupiah(broker.totalCommissionIDR)}
          </span>
        </div>
      </div>

      {/* Primary Suppliers Footnote */}
      {broker.primarySuppliers.length > 0 && (
        <div className="text-[11px] text-gray-500 flex items-start gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
          <div className="truncate">
            <span className="font-semibold text-gray-700">Pemasok Utama: </span>
            <span>{broker.primarySuppliers.join(', ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
