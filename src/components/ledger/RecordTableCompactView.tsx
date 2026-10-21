'use client';

import React from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { Pencil, Trash2, Printer, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { isInvoiceSearchMatch } from '@/src/utils/record-search';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function renderPaymentBadge(status?: WoodReceivingRecord['paymentStatus']) {
  if (status === 'PAID') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#00bb7f] border border-emerald-200/80">
        Lunas / 已结清
      </span>
    );
  }
  if (status === 'PARTIAL') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-[#b38600] border border-amber-200/80">
        Sebagian / 部分
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-[#ed1c24] border border-rose-200/80">
      Belum Lunas / 未付
    </span>
  );
}

export type SortField = 'receiptDate' | 'tallyVolumeM3' | 'grandNetPayable';
export type SortDirection = 'asc' | 'desc';

export interface RecordTableViewProps {
  records: WoodReceivingRecord[];
  canWrite?: boolean;
  searchQuery?: string;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onEdit: (record: WoodReceivingRecord) => void;
  onDelete: (id: string) => void;
  onPrint?: (record: WoodReceivingRecord) => void;
}

export function RecordTableCompactView({
  records,
  canWrite = true,
  searchQuery,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onPrint,
}: RecordTableViewProps) {
  const manifestItemCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of records) {
      if (r.manifest_id) {
        counts.set(r.manifest_id, (counts.get(r.manifest_id) || 0) + 1);
      }
    }
    return counts;
  }, [records]);

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
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-700 font-semibold select-none">
            <th
              onClick={() => onSort('receiptDate')}
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
              onClick={() => onSort('tallyVolumeM3')}
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
              onClick={() => onSort('grandNetPayable')}
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
          {records.map((r) => {
            const volDiff = Number((r.tallyVolumeM3 - r.deliveredVolumeM3).toFixed(2));
            const isMatch = Math.abs(volDiff) < 0.001;
            const isSurplus = volDiff > 0;
            const batchCount = r.manifest_id ? manifestItemCounts.get(r.manifest_id) || 0 : 0;

            return (
              <tr key={r.id} className="hover:bg-gray-50/70 transition-colors group">
                <td className="p-3.5 font-medium whitespace-nowrap text-gray-900">{r.receiptDate}</td>
                <td className="p-3.5 whitespace-nowrap font-medium text-gray-800">
                  <div className="flex items-center gap-1.5">
                    <span>{r.truckPlateNumber}</span>
                    {batchCount > 1 && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80"
                        title={`Bagian dari manifes ${r.manifest_id} (${batchCount} item)`}
                      >
                        Batch [{batchCount} item]
                      </span>
                    )}
                  </div>
                </td>
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
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                        : 'bg-rose-50 text-[#ed1c24] border border-rose-200/80'
                    }`}
                  >
                    {isMatch ? '0.00' : isSurplus ? `+${volDiff.toFixed(2)}` : volDiff.toFixed(2)}
                  </span>
                </td>
                <td className="p-3.5 whitespace-nowrap font-mono tabular-nums text-gray-700">
                  {r.timberNetPayable == null ? '—' : formatRupiah(r.timberNetPayable)}
                </td>
                <td className="p-3.5 whitespace-nowrap font-mono tabular-nums text-gray-700">{formatRupiah(r.freightNetPayable)}</td>
                <td className="p-3.5 font-bold font-mono tabular-nums text-[#101828] whitespace-nowrap">
                  {r.grandNetPayable == null ? (
                    <span className="text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded text-[11px] font-sans font-semibold">
                      Pending
                    </span>
                  ) : (
                    formatRupiah(r.grandNetPayable)
                  )}
                </td>
                <td className="p-3.5 whitespace-nowrap">
                  {renderPaymentBadge(r.paymentStatus)}
                  {isInvoiceSearchMatch(r, searchQuery || '') && (
                    <span className="block mt-1 text-[9px] font-mono font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
                      Faktur: {r.invoiceNumber}
                    </span>
                  )}
                </td>
                {canWrite && (
                  <td className="p-3.5 whitespace-nowrap text-center sticky right-0 z-10 bg-white group-hover:bg-[#f3f4f6] transition-colors border-l border-gray-200/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onPrint?.(r)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Cetak Tanda Terima (打印进厂单)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
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
                        title="Hapus data"
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
  );
}

