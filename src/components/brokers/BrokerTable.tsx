'use client';

import React from 'react';
import { Pencil, Trash2, Phone, MapPin, Building2 } from 'lucide-react';
import type { BrokerWithMetrics } from '@/src/types';

export interface BrokerTableProps {
  brokers: BrokerWithMetrics[];
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

export function BrokerTable({ brokers, canWrite = true, onEdit, onDelete }: BrokerTableProps) {
  if (brokers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center text-gray-500">
        <p className="text-sm font-medium">Tidak ada data broker yang sesuai dengan kriteria pencarian.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <th className="py-3.5 px-4">Broker / Kontak</th>
              <th className="py-3.5 px-4">Default Komisi</th>
              <th className="py-3.5 px-4 text-center">Deals</th>
              <th className="py-3.5 px-4 text-right">Volume (m³)</th>
              <th className="py-3.5 px-4 text-right">Total Komisi</th>
              <th className="py-3.5 px-4">Pemasok Terkait</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              {canWrite && <th className="py-3.5 px-4 text-center">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {brokers.map((broker) => {
              const isActive = broker.status === 'ACTIVE';

              return (
                <tr key={broker.id} className="hover:bg-amber-50/30 transition">
                  {/* Broker & Contact */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70">
                        {broker.code}
                      </span>
                      <span className="font-bold text-[#101828] text-sm">{broker.name}</span>
                    </div>
                    {(broker.contactPerson || broker.phone) && (
                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                        {broker.contactPerson && <span>PIC: {broker.contactPerson}</span>}
                        {broker.phone && (
                          <span className="font-mono text-gray-600">({broker.phone})</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Default Commission per m³ */}
                  <td className="py-3 px-4 font-mono text-gray-700">
                    {broker.defaultCommissionPerM3 !== undefined && broker.defaultCommissionPerM3 > 0 ? (
                      <span className="font-semibold text-gray-900">
                        {formatRupiah(broker.defaultCommissionPerM3)}
                        <span className="text-[10px] text-gray-400 font-normal"> / m³</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Fleksibel</span>
                    )}
                  </td>

                  {/* Deals Count */}
                  <td className="py-3 px-4 text-center font-mono font-bold text-gray-900">
                    {broker.totalDeals}
                  </td>

                  {/* Facilitated Volume */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                    {broker.totalVolumeM3Facilitated.toFixed(2)}
                  </td>

                  {/* Total Commission */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-800 text-sm">
                    {formatRupiah(broker.totalCommissionIDR)}
                  </td>

                  {/* Primary Suppliers */}
                  <td className="py-3 px-4">
                    {broker.primarySuppliers.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {broker.primarySuppliers.map((sup, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200"
                          >
                            {sup}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-[11px]">-</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}
                    >
                      {isActive ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>

                  {/* Actions */}
                  {canWrite && (
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(broker)}
                          title="Edit Broker"
                          className="p-1 rounded-md text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(broker.id)}
                          title="Hapus Broker"
                          className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
