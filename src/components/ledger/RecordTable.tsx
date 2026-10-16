'use client';

import React, { useState } from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, SearchX, RotateCcw } from 'lucide-react';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function renderPaymentBadge(status?: WoodReceivingRecord['paymentStatus']) {
  if (status === 'PAID') {
    return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#00bb7f] border border-emerald-200/80">Lunas / 已结清</span>;
  }
  if (status === 'PARTIAL') {
    return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-[#b38600] border border-amber-200/80">Sebagian / 部分</span>;
  }
  return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-[#ed1c24] border border-rose-200/80">Belum Lunas / 未付</span>;
}

type SortField = 'receiptDate' | 'tallyVolumeM3' | 'grandNetPayable';
type SortDirection = 'asc' | 'desc';

export function RecordTable({
  records,
  canWrite = true,
  onEdit,
  onDelete,
  onResetFilters,
}: {
  records: WoodReceivingRecord[];
  canWrite?: boolean;
  onEdit: (record: WoodReceivingRecord) => void;
  onDelete: (id: string) => void;
  onResetFilters?: () => void;
}) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedRecords = React.useMemo(() => {
    if (!sortField) return records;
    return [...records].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [records, sortField, sortDirection]);

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center text-gray-500 shadow-xs flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-[#ffc908]/40 flex items-center justify-center text-[#b38600]">
          <SearchX className="w-6 h-6" />
        </div>
        <div className="max-w-md">
          <h4 className="text-sm font-bold text-gray-900 mb-1">
            Tidak Ada Data Ditemukan (未找到相关记录)
          </h4>
          <p className="text-xs text-gray-500">
            Tidak ada catatan penerimaan kayu yang cocok dengan kriteria filter atau kata kunci saat ini.
          </p>
        </div>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#101828] bg-[#ffc908] hover:bg-[#f0bc00] rounded-xl shadow-2xs transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Semua Filter (重置筛选)</span>
          </button>
        )}
      </div>
    );
  }

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#b38600] font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#b38600] font-bold" />
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-700 font-semibold select-none">
              <th
                onClick={() => handleSort('receiptDate')}
                className="p-3.5 whitespace-nowrap cursor-pointer hover:bg-gray-100/70 transition group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Penerimaan</span>
                  {renderSortIndicator('receiptDate')}
                </div>
                <span className="block text-[10px] text-gray-400 font-normal">到货日期</span>
              </th>
              <th className="p-3.5 whitespace-nowrap">No. Polisi<span className="block text-[10px] text-gray-400 font-normal">车牌号</span></th>
              <th className="p-3.5 whitespace-nowrap">SKSHHK / DKP<span className="block text-[10px] text-gray-400 font-normal">送货单号</span></th>
              <th className="p-3.5 whitespace-nowrap">No. Kontrak<span className="block text-[10px] text-gray-400 font-normal">合同编号</span></th>
              <th className="p-3.5 whitespace-nowrap">Supplier<span className="block text-[10px] text-gray-400 font-normal">供应商</span></th>
              <th className="p-3.5 whitespace-nowrap">Jenis Kayu<span className="block text-[10px] text-gray-400 font-normal">材种</span></th>
              <th className="p-3.5 whitespace-nowrap">No. Kav<span className="block text-[10px] text-gray-400 font-normal">进厂批号</span></th>
              <th className="p-3.5 whitespace-nowrap font-mono">Batang (Del / Tally)<span className="block text-[10px] text-gray-400 font-sans font-normal">送货/检尺根数</span></th>
              <th
                onClick={() => handleSort('tallyVolumeM3')}
                className="p-3.5 whitespace-nowrap font-mono cursor-pointer hover:bg-gray-100/70 transition group"
              >
                <div className="flex items-center gap-1.5 font-sans font-semibold">
                  <span>Vol m³ (Del / Tally)</span>
                  {renderSortIndicator('tallyVolumeM3')}
                </div>
                <span className="block text-[10px] text-gray-400 font-sans font-normal">送货/检尺立方</span>
              </th>
              <th className="p-3.5 whitespace-nowrap font-mono">Selisih Vol<span className="block text-[10px] text-gray-400 font-sans font-normal">误差立方</span></th>
              <th className="p-3.5 whitespace-nowrap font-mono">Net Kayu<span className="block text-[10px] text-gray-400 font-sans font-normal">木材应付</span></th>
              <th className="p-3.5 whitespace-nowrap font-mono">Net Ongkir<span className="block text-[10px] text-gray-400 font-sans font-normal">运费应付</span></th>
              <th
                onClick={() => handleSort('grandNetPayable')}
                className="p-3.5 whitespace-nowrap font-mono cursor-pointer hover:bg-gray-100/70 transition group"
              >
                <div className="flex items-center gap-1.5 font-sans font-semibold">
                  <span>Total Bayar</span>
                  {renderSortIndicator('grandNetPayable')}
                </div>
                <span className="block text-[10px] text-gray-400 font-sans font-normal">应付金额</span>
              </th>
              <th className="p-3.5 whitespace-nowrap">
                Status Bayar<span className="block text-[10px] text-gray-400 font-normal">付款状态</span>
              </th>
              {canWrite && (
                <th className="p-3.5 whitespace-nowrap text-center sticky right-0 z-20 bg-gray-50 border-l border-gray-200/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                  Aksi<span className="block text-[10px] text-gray-400 font-normal">操作</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRecords.map((r) => {
              const volDiff = Number((r.tallyVolumeM3 - r.deliveredVolumeM3).toFixed(2));
              const isMatch = Math.abs(volDiff) < 0.001;
              const isSurplus = volDiff > 0;

              return (
                <tr key={r.id} className="hover:bg-gray-50/70 transition-colors group">
                  <td className="p-3.5 font-medium whitespace-nowrap text-gray-900">{r.receiptDate}</td>
                  <td className="p-3.5 whitespace-nowrap font-medium text-gray-800">{r.truckPlateNumber}</td>
                  <td className="p-3.5 font-mono text-gray-600 whitespace-nowrap">{r.forestryDocNumber}</td>
                  <td className="p-3.5 whitespace-nowrap text-gray-600">{r.contractNumber}</td>
                  <td className="p-3.5 whitespace-nowrap font-medium text-gray-900">{r.supplierName}</td>
                  <td className="p-3.5 font-semibold text-gray-900 whitespace-nowrap">{r.woodSpecies}</td>
                  <td className="p-3.5 font-semibold text-[#b38600] whitespace-nowrap">{r.kavlingNumber}</td>
                  <td className="p-3.5 whitespace-nowrap font-mono tabular-nums text-gray-700">
                    {r.deliveredPieces} / <strong className="text-gray-950">{r.tallyPieces}</strong>
                  </td>
                  <td className="p-3.5 whitespace-nowrap font-mono tabular-nums text-gray-700">
                    {r.deliveredVolumeM3.toFixed(2)} / <strong className="text-gray-950">{r.tallyVolumeM3.toFixed(2)}</strong>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono tabular-nums ${
                        isMatch
                          ? 'bg-gray-100 text-gray-700'
                          : isSurplus
                          ? 'bg-emerald-50 text-[#00bb7f] border border-emerald-200/80'
                          : 'bg-rose-50 text-[#ed1c24] border border-rose-200/80'
                      }`}
                    >
                      {isMatch ? '0.00' : isSurplus ? `+${volDiff.toFixed(2)}` : volDiff.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap font-mono tabular-nums text-gray-700">{formatRupiah(r.timberNetPayable)}</td>
                  <td className="p-3.5 whitespace-nowrap font-mono tabular-nums text-gray-700">{formatRupiah(r.freightNetPayable)}</td>
                  <td className="p-3.5 font-bold font-mono tabular-nums text-[#101828] whitespace-nowrap">{formatRupiah(r.grandNetPayable)}</td>
                  <td className="p-3.5 whitespace-nowrap">{renderPaymentBadge(r.paymentStatus)}</td>
                  {canWrite && (
                    <td className="p-3.5 whitespace-nowrap text-center sticky right-0 z-10 bg-white group-hover:bg-[#f3f4f6] transition-colors border-l border-gray-200/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onEdit(r)}
                          className="p-1.5 text-gray-400 hover:text-[#b38600] hover:bg-[#ffc908]/15 rounded-lg transition"
                          title="Edit data"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(r.id)}
                          className="p-1.5 text-gray-400 hover:text-[#ed1c24] hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus data (Dapat diurungkan / Undo)"
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

