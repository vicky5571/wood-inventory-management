'use client';

import React, { useState, useMemo } from 'react';
import type { LotStockBalance } from '@/src/types/index';
import { ArrowUpDown, ArrowUp, ArrowDown, Warehouse } from 'lucide-react';

export interface InventoryTableProps {
  lots: LotStockBalance[];
}

type SortField = 'remainingVolumeM3' | 'kavlingNumber' | 'storageYard';
type SortDirection = 'asc' | 'desc';

export function InventoryTable({ lots }: InventoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('remainingVolumeM3');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'remainingVolumeM3' ? 'desc' : 'asc');
    }
  };

  const sortedLots = useMemo(() => {
    return [...lots].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'remainingVolumeM3') {
        comparison = a.remainingVolumeM3 - b.remainingVolumeM3;
      } else if (sortField === 'kavlingNumber') {
        comparison = a.kavlingNumber.localeCompare(b.kavlingNumber, undefined, { numeric: true });
      } else if (sortField === 'storageYard') {
        comparison = a.storageYard.localeCompare(b.storageYard);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [lots, sortField, sortDirection]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-amber-700" />
    ) : (
      <ArrowDown className="w-3 h-3 text-amber-700" />
    );
  };

  if (lots.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center shadow-2xs">
        <Warehouse className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <h4 className="text-xs font-bold text-gray-800">
          Tidak Ada Kavling yang Sesuai (无匹配库位)
        </h4>
        <p className="text-[11px] text-gray-500 mt-1">
          Coba sesuaikan kata kunci pencarian atau hilangkan filter sembunyikan kavling kosong.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
              <th
                onClick={() => handleSort('storageYard')}
                className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 select-none group"
              >
                <div className="flex items-center gap-1">
                  <span>Gudang / TPK (库区)</span>
                  {renderSortIndicator('storageYard')}
                </div>
              </th>
              <th
                onClick={() => handleSort('kavlingNumber')}
                className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 select-none group"
              >
                <div className="flex items-center gap-1">
                  <span>Nomor Kavling (库位)</span>
                  {renderSortIndicator('kavlingNumber')}
                </div>
              </th>
              <th className="py-3 px-4 text-right">Penerimaan Masuk (入库)</th>
              <th className="py-3 px-4 text-right">Pengeluaran / DO (出库)</th>
              <th className="py-3 px-4 text-right">Dikonsumsi (加工)</th>
              <th className="py-3 px-4 text-right">Mutasi Sortir (分拣)</th>
              <th
                onClick={() => handleSort('remainingVolumeM3')}
                className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100/80 select-none group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Sisa Stok (余量)</span>
                  {renderSortIndicator('remainingVolumeM3')}
                </div>
              </th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedLots.map((lot) => {
              const isDepleted = lot.remainingVolumeM3 <= 0;
              return (
                <tr
                  key={`${lot.storageYard}:::${lot.kavlingNumber}`}
                  className="hover:bg-amber-50/20 transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    <div className="flex items-center gap-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                      <span>{lot.storageYard}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/60">
                      {lot.kavlingNumber}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="font-mono font-semibold text-gray-800">
                      {lot.inboundVolumeM3.toFixed(4)} m³
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {lot.inboundPieces.toLocaleString('id-ID')} btg
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="font-mono font-semibold text-gray-800">
                      {lot.outboundVolumeM3.toFixed(4)} m³
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {lot.outboundPieces.toLocaleString('id-ID')} btg
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="font-mono font-semibold text-gray-800">
                      {lot.consumedVolumeM3.toFixed(4)} m³
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {lot.consumedPieces.toLocaleString('id-ID')} btg
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="font-mono font-semibold text-gray-800">
                      {lot.transferredInVolumeM3 > 0 && <span className="text-emerald-700">+{lot.transferredInVolumeM3.toFixed(2)} </span>}
                      {lot.transferredOutVolumeM3 > 0 && <span className="text-rose-600">-{lot.transferredOutVolumeM3.toFixed(2)} </span>}
                      {lot.transferredInVolumeM3 === 0 && lot.transferredOutVolumeM3 === 0 && '0 m³'}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      +{lot.transferredInPieces} / -{lot.transferredOutPieces} btg
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div
                      className={`font-mono font-bold ${
                        isDepleted ? 'text-gray-400 line-through' : 'text-emerald-700'
                      }`}
                    >
                      {lot.remainingVolumeM3.toFixed(4)} m³
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {lot.remainingPieces.toLocaleString('id-ID')} btg
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isDepleted ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        Habis (已清空)
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Tersedia (在库)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
