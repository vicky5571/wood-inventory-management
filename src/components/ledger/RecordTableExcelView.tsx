'use client';

import React from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { Pencil, Trash2, Printer, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { RecordTableViewProps, SortField } from './RecordTableCompactView';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function renderPaymentBadge(status?: WoodReceivingRecord['paymentStatus']) {
  const isPaid = status === 'PAID';
  const isPartial = status === 'PARTIAL';
  const color = isPaid ? 'bg-emerald-50 text-[#00bb7f] border-emerald-200/80' : isPartial ? 'bg-amber-50 text-[#b38600] border-amber-200/80' : 'bg-rose-50 text-[#ed1c24] border-rose-200/80';
  const label = isPaid ? 'Lunas / 已结清' : isPartial ? 'Sebagian / 部分' : 'Belum Lunas / 未付';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>{label}</span>;
}

export function RecordTableExcelView({
  records,
  canWrite = true,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onPrint,
}: RecordTableViewProps) {
  const totals = React.useMemo(() => records.reduce(
    (acc, r) => {
      acc.delPieces += r.deliveredPieces;
      acc.delVol += r.deliveredVolumeM3;
      acc.tallyPieces += r.tallyPieces;
      acc.tallyVol += r.tallyVolumeM3;
      acc.timberNet += r.timberNetPayable ?? 0;
      acc.freightNet += r.freightNetPayable;
      acc.broker += r.brokerFee || 0;
      acc.grandTotal += r.grandNetPayable ?? 0;
      return acc;
    },
    { delPieces: 0, delVol: 0, tallyPieces: 0, tallyVol: 0, timberNet: 0, freightNet: 0, broker: 0, grandTotal: 0 }
  ), [records]);

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
          {/* Tier 1 Header */}
          <tr className="bg-gray-100/90 border-b border-gray-200 text-gray-700 font-semibold select-none text-[11px]">
            <th rowSpan={2} onClick={() => onSort('receiptDate')} className="p-2.5 whitespace-nowrap cursor-pointer hover:bg-gray-200/70 border-r border-gray-200">
              <div className="flex items-center gap-1">Penerimaan {renderSortIndicator('receiptDate')}</div>
              <span className="block text-[9px] text-gray-400 font-normal">到货日期</span>
            </th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">Dok. Tanggal<span className="block text-[9px] text-gray-400 font-normal">发货时间</span></th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">No. Polisi<span className="block text-[9px] text-gray-400 font-normal">车牌号</span></th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">SKSHHK / DKP<span className="block text-[9px] text-gray-400 font-normal">送货单号</span></th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">No. Kwitansi<span className="block text-[9px] text-gray-400 font-normal">订货单号</span></th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">No. Kontrak<span className="block text-[9px] text-gray-400 font-normal">合同编号</span></th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">Supplier<span className="block text-[9px] text-gray-400 font-normal">供应商</span></th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">Jenis Kayu<span className="block text-[9px] text-gray-400 font-normal">树种</span></th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">Panjang m<span className="block text-[9px] text-gray-400 font-normal">材长</span></th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">No. Kav<span className="block text-[9px] text-gray-400 font-normal">进厂批号</span></th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">TPK<span className="block text-[9px] text-gray-400 font-normal">木堆场地</span></th>
            <th colSpan={2} className="p-2 text-center bg-blue-50/70 text-blue-950 font-bold border-r border-gray-200">Pengiriman (送货数据)</th>
            <th colSpan={2} className="p-2 text-center bg-indigo-50/70 text-indigo-950 font-bold border-r border-gray-200">Pemeriksaan / Tally (检尺数据)</th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200 font-mono">Selisih Vol<span className="block text-[9px] text-gray-400 font-sans font-normal">误差立方</span></th>
            <th colSpan={4} className="p-2 text-center bg-amber-50/80 text-amber-950 font-bold border-r border-gray-200">Pembayaran Kayu (木材货款)</th>
            <th colSpan={4} className="p-2 text-center bg-cyan-50/80 text-cyan-950 font-bold border-r border-gray-200">Pembayaran Ongkos Kirim (运费支付)</th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">Broker<span className="block text-[9px] text-gray-400 font-normal">中介费</span></th>
            <th rowSpan={2} onClick={() => onSort('grandNetPayable')} className="p-2.5 whitespace-nowrap cursor-pointer hover:bg-gray-200/70 border-r border-gray-200 font-mono">
              <div className="flex items-center gap-1 font-sans font-bold">Total Bayar {renderSortIndicator('grandNetPayable')}</div>
              <span className="block text-[9px] text-gray-400 font-sans font-normal">总应付</span>
            </th>
            <th rowSpan={2} className="p-2.5 whitespace-nowrap border-r border-gray-200">Status Bayar<span className="block text-[9px] text-gray-400 font-normal">付款状态</span></th>
            {canWrite && (
              <th rowSpan={2} className="p-2.5 whitespace-nowrap text-center sticky right-0 z-20 bg-gray-100 border-l border-gray-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                Aksi<span className="block text-[9px] text-gray-400 font-normal">操作</span>
              </th>
            )}
          </tr>
          {/* Tier 2 Header */}
          <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[10px]">
            <th className="p-2 whitespace-nowrap font-mono text-center border-r border-gray-200">Batang<span className="block text-[9px] text-gray-400 font-sans">根数</span></th>
            <th className="p-2 whitespace-nowrap font-mono text-center border-r border-gray-200">Vol m³<span className="block text-[9px] text-gray-400 font-sans">立方</span></th>
            <th className="p-2 whitespace-nowrap font-mono text-center border-r border-gray-200">Batang<span className="block text-[9px] text-gray-400 font-sans">检尺根数</span></th>
            <th onClick={() => onSort('tallyVolumeM3')} className="p-2 whitespace-nowrap font-mono text-center border-r border-gray-200 cursor-pointer hover:bg-gray-100">
              <div className="flex items-center justify-center gap-1">Vol m³ {renderSortIndicator('tallyVolumeM3')}</div>
              <span className="block text-[9px] text-gray-400 font-sans">检尺立方</span>
            </th>
            <th className="p-2 whitespace-nowrap font-mono text-right border-r border-gray-200">Harga/m³<span className="block text-[9px] text-gray-400 font-sans">均价</span></th>
            <th className="p-2 whitespace-nowrap font-mono text-right border-r border-gray-200">Total Kotor<span className="block text-[9px] text-gray-400 font-sans">货价</span></th>
            <th className="p-2 whitespace-nowrap font-mono text-right border-r border-gray-200">PPh 税</th>
            <th className="p-2 whitespace-nowrap font-mono text-right border-r border-gray-200 font-bold">Net Kayu<span className="block text-[9px] text-gray-400 font-sans">应付</span></th>
            <th className="p-2 whitespace-nowrap font-mono text-right border-r border-gray-200">Tarif/m³<span className="block text-[9px] text-gray-400 font-sans">单价</span></th>
            <th className="p-2 whitespace-nowrap font-mono text-right border-r border-gray-200">Total Kotor<span className="block text-[9px] text-gray-400 font-sans">货价</span></th>
            <th className="p-2 whitespace-nowrap font-mono text-right border-r border-gray-200">PPh 税</th>
            <th className="p-2 whitespace-nowrap font-mono text-right border-r border-gray-200 font-bold">Net Ongkir<span className="block text-[9px] text-gray-400 font-sans">应付</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-[11px]">
          {records.map((r) => {
            const volDiff = Number((r.tallyVolumeM3 - r.deliveredVolumeM3).toFixed(2));
            const isMatch = Math.abs(volDiff) < 0.001;
            const isSurplus = volDiff > 0;
            const batchCount = r.manifest_id ? manifestItemCounts.get(r.manifest_id) || 0 : 0;

            return (
              <tr key={r.id} className="hover:bg-amber-50/20 transition-colors group">
                <td className="p-2 font-medium whitespace-nowrap border-r border-gray-100">{r.receiptDate}</td>
                <td className="p-2 text-gray-500 whitespace-nowrap border-r border-gray-100">{r.docDate || '-'}</td>
                <td className="p-2 font-semibold text-gray-800 whitespace-nowrap border-r border-gray-100">
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
                <td className="p-2 font-mono text-gray-600 whitespace-nowrap border-r border-gray-100">{r.forestryDocNumber}</td>
                <td className="p-2 font-mono text-gray-600 whitespace-nowrap border-r border-gray-100">{r.receiptNumber || '-'}</td>
                <td className="p-2 text-gray-600 whitespace-nowrap border-r border-gray-100">{r.contractNumber || '-'}</td>
                <td className="p-2 font-medium text-gray-900 whitespace-nowrap border-r border-gray-100">{r.supplierName}</td>
                <td className="p-2 font-semibold text-gray-900 whitespace-nowrap border-r border-gray-100">{r.woodSpecies}</td>
                <td className="p-2 font-mono tabular-nums text-gray-700 whitespace-nowrap border-r border-gray-100">{r.woodLengthM ? `${r.woodLengthM} m` : '-'}</td>
                <td className="p-2 font-semibold text-[#b38600] whitespace-nowrap border-r border-gray-100">{r.kavlingNumber}</td>
                <td className="p-2 text-gray-600 whitespace-nowrap border-r border-gray-100">{r.storageYard || '-'}</td>
                <td className="p-2 font-mono tabular-nums text-center text-gray-600 border-r border-gray-100">{r.deliveredPieces}</td>
                <td className="p-2 font-mono tabular-nums text-center text-gray-600 border-r border-gray-100">{r.deliveredVolumeM3.toFixed(2)}</td>
                <td className="p-2 font-mono tabular-nums text-center font-bold text-gray-900 border-r border-gray-100">{r.tallyPieces}</td>
                <td className="p-2 font-mono tabular-nums text-center font-bold text-gray-900 border-r border-gray-100">{r.tallyVolumeM3.toFixed(2)}</td>
                <td className="p-2 whitespace-nowrap border-r border-gray-100">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tabular-nums ${isMatch ? 'bg-gray-100 text-gray-600' : isSurplus ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-[#ed1c24]'}`}>
                    {isMatch ? '0.00' : isSurplus ? `+${volDiff.toFixed(2)}` : volDiff.toFixed(2)}
                  </span>
                </td>
                <td className="p-2 font-mono tabular-nums text-right text-gray-600 border-r border-gray-100">
                  {r.timberPricePerM3 == null ? (
                    <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded text-[10px] font-sans font-medium border border-amber-200/60">
                      Pending
                    </span>
                  ) : (
                    formatRupiah(r.timberPricePerM3)
                  )}
                </td>
                <td className="p-2 font-mono tabular-nums text-right text-gray-600 border-r border-gray-100">
                  {r.timberGrossTotal == null ? '—' : formatRupiah(r.timberGrossTotal)}
                </td>
                <td className="p-2 font-mono tabular-nums text-right text-gray-600 border-r border-gray-100">
                  {r.timberPphAmount == null ? '—' : formatRupiah(r.timberPphAmount)}
                </td>
                <td className="p-2 font-mono tabular-nums text-right font-semibold text-gray-900 border-r border-gray-100">
                  {r.timberNetPayable == null ? '—' : formatRupiah(r.timberNetPayable)}
                </td>
                <td className="p-2 font-mono tabular-nums text-right text-gray-600 border-r border-gray-100">{formatRupiah(r.freightRatePerM3)}</td>
                <td className="p-2 font-mono tabular-nums text-right text-gray-600 border-r border-gray-100">{formatRupiah(r.freightGrossTotal)}</td>
                <td className="p-2 font-mono tabular-nums text-right text-gray-600 border-r border-gray-100">{formatRupiah(r.freightPphAmount)}</td>
                <td className="p-2 font-mono tabular-nums text-right font-semibold text-gray-900 border-r border-gray-100">{formatRupiah(r.freightNetPayable)}</td>
                <td className="p-2 font-mono tabular-nums text-right text-gray-600 border-r border-gray-100">{formatRupiah(r.brokerFee || 0)}</td>
                <td className="p-2 font-mono tabular-nums text-right font-bold text-[#101828] border-r border-gray-100">
                  {r.grandNetPayable == null ? (
                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold border border-amber-200/60">
                      Pending
                    </span>
                  ) : (
                    formatRupiah(r.grandNetPayable)
                  )}
                </td>
                <td className="p-2 whitespace-nowrap border-r border-gray-100">{renderPaymentBadge(r.paymentStatus)}</td>
                {canWrite && (
                  <td className="p-2 whitespace-nowrap text-center sticky right-0 z-10 bg-white group-hover:bg-[#f9fafb] transition-colors border-l border-gray-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                    <div className="inline-flex items-center gap-1">
                      <button type="button" onClick={() => onPrint?.(r)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer" title="Cetak Tanda Terima (打印进厂单)">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onEdit(r)} className="p-1 text-gray-400 hover:text-[#b38600] hover:bg-[#ffc908]/15 rounded transition" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(r.id)} className="p-1 text-gray-400 hover:text-[#ed1c24] hover:bg-rose-50 rounded transition cursor-pointer" title="Hapus">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-100/95 font-bold border-t-2 border-gray-300 text-gray-900 text-[11px] select-none">
          <tr>
            <td colSpan={11} className="p-2.5 text-right uppercase tracking-wider text-gray-600 border-r border-gray-200">
              Grand Total (总计):
            </td>
            <td className="p-2 font-mono tabular-nums text-center border-r border-gray-200">{totals.delPieces}</td>
            <td className="p-2 font-mono tabular-nums text-center border-r border-gray-200">{totals.delVol.toFixed(2)}</td>
            <td className="p-2 font-mono tabular-nums text-center border-r border-gray-200">{totals.tallyPieces}</td>
            <td className="p-2 font-mono tabular-nums text-center border-r border-gray-200">{totals.tallyVol.toFixed(2)}</td>
            <td className="p-2 text-center text-gray-400 border-r border-gray-200">-</td>
            <td colSpan={3} className="p-2 text-right border-r border-gray-200 font-mono text-gray-500">Subtotal Net Kayu:</td>
            <td className="p-2 font-mono tabular-nums text-right border-r border-gray-200 text-gray-950">{formatRupiah(totals.timberNet)}</td>
            <td colSpan={3} className="p-2 text-right border-r border-gray-200 font-mono text-gray-500">Subtotal Net Ongkir:</td>
            <td className="p-2 font-mono tabular-nums text-right border-r border-gray-200 text-gray-950">{formatRupiah(totals.freightNet)}</td>
            <td className="p-2 font-mono tabular-nums text-right border-r border-gray-200">{formatRupiah(totals.broker)}</td>
            <td className="p-2 font-mono tabular-nums text-right font-black text-[#101828] border-r border-gray-200 bg-amber-100/60">{formatRupiah(totals.grandTotal)}</td>
            <td colSpan={canWrite ? 2 : 1} className="p-2 bg-gray-100"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
