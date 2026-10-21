'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { ContractWithDetails, ContractStatus } from '@/src/types/index';
import { Eye, Edit3, Trash2, ArrowUpDown, ArrowUp, ArrowDown, FileText, AlertTriangle } from 'lucide-react';

export interface ContractTableProps {
  contracts: ContractWithDetails[];
  onEdit: (contract: ContractWithDetails) => void;
  onDelete: (id: string) => void;
  canWrite: boolean;
}

type SortField = 'contractDate' | 'remainingVolumeM3' | 'contractNumber' | 'fulfillmentPercent';
type SortDirection = 'asc' | 'desc';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

function renderStatusBadge(status: ContractStatus, isNearExpiry: boolean, isOverdue: boolean) {
  if (status === 'FULFILLED') return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Selesai (已履约)</span>;
  if (status === 'EXPIRED' || isOverdue) return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Lewat Tempo (过期)</span>;
  if (isNearExpiry) return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">Kritis (临期)</span>;
  if (status === 'ACTIVE') return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Aktif (生效中)</span>;
  if (status === 'DRAFT') return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">Draf (草稿)</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">Batal (取消)</span>;
}

export function ContractTable({ contracts, onEdit, onDelete, canWrite }: ContractTableProps) {
  const [sortField, setSortField] = useState<SortField>('contractDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'contractDate' ? 'desc' : 'asc');
    }
  };

  const sortedContracts = useMemo(() => {
    return [...contracts].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'contractDate') {
        comparison = a.contractDate.localeCompare(b.contractDate);
      } else if (sortField === 'remainingVolumeM3') {
        comparison = a.summary.remainingVolumeM3 - b.summary.remainingVolumeM3;
      } else if (sortField === 'fulfillmentPercent') {
        comparison = a.summary.fulfillmentPercent - b.summary.fulfillmentPercent;
      } else if (sortField === 'contractNumber') {
        comparison = a.contractNumber.localeCompare(b.contractNumber);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [contracts, sortField, sortDirection]);

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

  if (contracts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center shadow-2xs">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <h4 className="text-xs font-bold text-gray-800">
          Tidak Ada Kontrak yang Sesuai (无匹配合同)
        </h4>
        <p className="text-[11px] text-gray-500 mt-1">
          Sesuaikan kata kunci pencarian atau ubah filter status kontrak.
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
                onClick={() => handleSort('contractNumber')}
                className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 select-none group"
              >
                <div className="flex items-center gap-1">
                  <span>Kontrak & KPH (合同/林场)</span>
                  {renderSortIndicator('contractNumber')}
                </div>
              </th>
              <th
                onClick={() => handleSort('contractDate')}
                className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 select-none group"
              >
                <div className="flex items-center gap-1">
                  <span>Masa Berlaku (有效期)</span>
                  {renderSortIndicator('contractDate')}
                </div>
              </th>
              <th className="py-3 px-4 text-right">Volume Beli</th>
              <th
                onClick={() => handleSort('fulfillmentPercent')}
                className="py-3 px-4 text-center cursor-pointer hover:bg-gray-100/80 select-none group"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Penerimaan SKSHHK</span>
                  {renderSortIndicator('fulfillmentPercent')}
                </div>
              </th>
              <th
                onClick={() => handleSort('remainingVolumeM3')}
                className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100/80 select-none group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Sisa Stok Kontrak</span>
                  {renderSortIndicator('remainingVolumeM3')}
                </div>
              </th>
              <th className="py-3 px-4 text-right">Nilai & Pembayaran</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedContracts.map((c) => {
              const { summary } = c;
              return (
                <tr key={c.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="py-3 px-4">
                    <Link
                      href={`/contracts/${c.id}`}
                      className="font-mono font-bold text-gray-900 hover:text-amber-800 transition"
                    >
                      {c.contractNumber}
                    </Link>
                    <div className="text-[10px] text-gray-500 font-medium">
                      {c.kphOrigin}
                      {c.poNumber && <span className="ml-1 text-gray-400 font-mono">({c.poNumber})</span>}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="text-gray-800 font-medium">{c.effectiveStartDate} s/d</div>
                    <div className={`text-[10px] font-mono ${summary.isOverdue ? 'text-rose-600 font-bold' : summary.isNearExpiry ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
                      {c.effectiveEndDate} ({summary.daysUntilExpiry >= 0 ? `${summary.daysUntilExpiry} hari` : `lewat ${Math.abs(summary.daysUntilExpiry)} hari`})
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="font-mono font-bold text-gray-900">
                      {c.totalPurchasedVolumeM3.toFixed(4)} m³
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {c.totalPurchasedPieces.toLocaleString('id-ID')} btg
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="w-32 mx-auto">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="font-mono text-gray-700">{summary.receivedVolumeM3.toFixed(2)} m³</span>
                        <span className="font-bold text-gray-900">{summary.fulfillmentPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${summary.fulfillmentPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                          style={{ width: `${Math.min(100, summary.fulfillmentPercent)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className={`font-mono font-bold ${summary.remainingVolumeM3 <= 0 ? 'text-gray-400' : 'text-emerald-700'}`}>
                      {summary.remainingVolumeM3.toFixed(4)} m³
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {summary.remainingPieces.toLocaleString('id-ID')} btg
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="font-mono font-bold text-gray-950">
                      {formatRupiah(c.totalContractValueIDR)}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-mono">
                      Terbayar: {formatRupiah(summary.totalPaidIDR)}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    {renderStatusBadge(summary.status, summary.isNearExpiry, summary.isOverdue)}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/contracts/${c.id}`}
                        className="p-1.5 text-gray-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                        title="Lihat Rincian Kontrak (详情)"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      {canWrite && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEdit(c)}
                            className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Edit Kontrak (编辑)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(c.id)}
                            className="p-1.5 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Kontrak (删除)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
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
