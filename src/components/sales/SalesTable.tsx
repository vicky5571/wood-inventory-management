'use client';

import React from 'react';
import type { WoodSalesRecord, PaymentStatus } from '@/src/types/index';
import { Printer, Edit3, Trash2, PackageOpen, Truck } from 'lucide-react';

export interface SalesTableProps {
  sales: WoodSalesRecord[];
  onPrint: (record: WoodSalesRecord) => void;
  onEdit: (record: WoodSalesRecord) => void;
  onDelete: (id: string) => void;
  canWrite: boolean;
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function renderStatusBadge(status: PaymentStatus) {
  if (status === 'PAID') {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Lunas (已付)</span>;
  }
  if (status === 'PARTIAL') {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Sebagian (部分)</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Belum (未付)</span>;
}

export function SalesTable({ sales, onPrint, onEdit, onDelete, canWrite }: SalesTableProps) {
  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs">
        <PackageOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-gray-800">Belum Ada Transaksi Penjualan Kayu (暂无出库记录)</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Catat pengeluaran kayu log atau kayu gergajian dari kavling TPK untuk mengurangi stok dan mencetak Surat Jalan (DO).
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
              <th className="py-3 px-4">DO & Tanggal</th>
              <th className="py-3 px-4">Customer (Pembeli)</th>
              <th className="py-3 px-4">Truk & Supir</th>
              <th className="py-3 px-4">Lokasi Asal</th>
              <th className="py-3 px-4">Kayu & Batang</th>
              <th className="py-3 px-4 text-right">Volume (m³)</th>
              <th className="py-3 px-4 text-right">Total Nilai</th>
              <th className="py-3 px-4 text-center">Status Bayar</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-amber-50/20 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-mono font-bold text-gray-900">{sale.deliveryOrderNumber}</div>
                  <div className="text-[10px] text-gray-400">{sale.saleDate}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-gray-900">{sale.customerName}</div>
                  {sale.invoiceNumber && <div className="text-[10px] font-mono text-gray-400">Inv: {sale.invoiceNumber}</div>}
                </td>
                <td className="py-3 px-4">
                  <div className="font-mono font-semibold text-gray-800 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-gray-400" />
                    <span>{sale.truckPlateNumber}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">{sale.driverName || '-'}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-800">{sale.storageYard}</div>
                  <div className="text-[10px] font-mono text-amber-700">Kav. {sale.kavlingNumber}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-gray-800">{sale.woodSpecies}</div>
                  <div className="text-[10px] font-mono text-gray-500">{sale.pieces} btg</div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                  {sale.volumeM3.toFixed(4)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-gray-950">
                  {formatRupiah(sale.totalPrice)}
                </td>
                <td className="py-3 px-4 text-center">
                  {renderStatusBadge(sale.paymentStatus)}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onPrint(sale)}
                      className="p-1.5 text-gray-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                      title="Cetak Surat Jalan DO (打印送货单)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(sale)}
                          className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Penjualan (编辑)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(sale.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Penjualan (删除)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

