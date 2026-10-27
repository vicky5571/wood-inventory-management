'use client';

import React, { useState } from 'react';
import type { TimberPriceEntry } from '../../types/index.ts';
import { DollarSign, Edit2, Trash2, ChevronDown, ChevronRight, Calendar, AlertCircle } from 'lucide-react';

export interface PriceTableProps {
  activeEntries: TimberPriceEntry[];
  expiredEntries: TimberPriceEntry[];
  canWrite: boolean;
  onEdit: (entry: TimberPriceEntry) => void;
  onDelete: (id: string) => void;
}

export function PriceTable({
  activeEntries,
  expiredEntries,
  canWrite,
  onEdit,
  onDelete,
}: PriceTableProps) {
  const [isExpiredOpen, setIsExpiredOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Active Prices Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Harga Berlaku Saat Ini</h2>
              <p className="text-[11px] text-gray-500">Daftar patokan harga aktif untuk penilaian kayu otomatis</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-full">
            {activeEntries.length} Standar Aktif
          </span>
        </div>

        {activeEntries.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-500">Belum ada harga kayu yang aktif</p>
            <p className="text-xs text-gray-400 mt-0.5">Tambahkan patokan harga melalui tombol di atas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Jenis Kayu / 树种</th>
                  <th className="py-3 px-4">Supplier / 供应商</th>
                  <th className="py-3 px-4 text-right">Harga/m³ (Rp) / 单价</th>
                  <th className="py-3 px-4 text-center">Tarif PPh (%) / 税率</th>
                  <th className="py-3 px-4">Masa Berlaku / 有效期</th>
                  <th className="py-3 px-4">Catatan / 备注</th>
                  {canWrite && <th className="py-3 px-4 text-right">Aksi / 操作</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {activeEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-bold border border-amber-200/60">
                        {e.woodSpecies}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {e.supplierName ? (
                        <span>{e.supplierName}</span>
                      ) : (
                        <span className="text-gray-400 italic">Semua Supplier (Global)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                      Rp {e.pricePerM3.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-gray-700">
                      {e.timberPphRate}%
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{e.effectiveFrom}</span>
                        <span className="text-gray-400">s/d</span>
                        <span className={e.effectiveTo ? 'text-gray-700' : 'text-emerald-600 font-medium'}>
                          {e.effectiveTo || 'Sekarang'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 max-w-xs truncate" title={e.notes}>
                      {e.notes || '—'}
                    </td>
                    {canWrite && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(e)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-700 hover:bg-amber-100/50 transition-colors"
                            title="Edit Harga"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(e.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Hapus Harga"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expired Prices Accordion */}
      {expiredEntries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsExpiredOpen(!isExpiredOpen)}
            className="w-full px-5 py-3.5 bg-gray-50/50 hover:bg-gray-50 flex items-center justify-between transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              {isExpiredOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
              <span>Riwayat Harga Lampau (Kedaluwarsa)</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200/70 text-gray-600 font-mono">
                {expiredEntries.length}
              </span>
            </div>
            <span className="text-[11px] text-gray-400">
              {isExpiredOpen ? 'Tutup riwayat' : 'Tampilkan riwayat'}
            </span>
          </button>

          {isExpiredOpen && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse opacity-80">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Jenis Kayu</th>
                    <th className="py-2.5 px-4">Supplier</th>
                    <th className="py-2.5 px-4 text-right">Harga/m³ (Rp)</th>
                    <th className="py-2.5 px-4 text-center">Tarif PPh (%)</th>
                    <th className="py-2.5 px-4">Masa Berlaku</th>
                    <th className="py-2.5 px-4">Catatan</th>
                    {canWrite && <th className="py-2.5 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {expiredEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/50 text-gray-600">
                      <td className="py-2.5 px-4 font-semibold text-gray-700">{e.woodSpecies}</td>
                      <td className="py-2.5 px-4">{e.supplierName || 'Semua (Global)'}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-gray-700">
                        Rp {e.pricePerM3.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono">{e.timberPphRate}%</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-gray-500">
                        {e.effectiveFrom} s/d {e.effectiveTo}
                      </td>
                      <td className="py-2.5 px-4 text-gray-400 truncate max-w-xs">{e.notes || '—'}</td>
                      {canWrite && (
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onDelete(e.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-700 hover:bg-red-50"
                            title="Hapus Harga Lampau"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
