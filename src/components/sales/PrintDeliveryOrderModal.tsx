'use client';

import React, { useEffect } from 'react';
import type { WoodSalesRecord, PrintDeliveryOrderModalProps } from '@/src/types/index';
import { Printer, X } from 'lucide-react';

export type { PrintDeliveryOrderModalProps };

function formatRupiah(num?: number): string {
  if (num == null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function PrintDeliveryOrderModal({ isOpen, record, onClose }: PrintDeliveryOrderModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-do-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-do, #printable-do * { visibility: visible !important; }
          #printable-do {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; margin: 0 !important; padding: 24px !important;
            background: white !important; color: black !important;
            box-shadow: none !important; border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-gray-100 rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        <div className="no-print flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Pratinjau Surat Jalan</span>
            <span className="text-xs text-gray-400">/ 送货单预览</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-lg shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang (打印)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              title="Tutup (关闭)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-100/60 flex justify-center">
          <div id="printable-do" className="w-full bg-white border border-gray-300 p-8 text-gray-900 font-sans shadow-md text-xs leading-normal">
            <div className="text-center pb-4 mb-4 border-b-2 border-gray-900">
              <h2 className="text-base font-black tracking-widest text-gray-950 uppercase">TIMBERGUARD / PT RIMBA MANDIRI</h2>
              <p id="print-do-title" className="text-sm font-bold text-gray-800 tracking-wide mt-1">
                SURAT JALAN / PENGELUARAN KAYU (木材出厂送货单 / 出库单)
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Dokumen Resmi Pengeluaran & Pengiriman Kayu Log • TPK Log Yard System</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5 text-[11px]">
              <div className="space-y-1.5 bg-gray-50 p-3 rounded border border-gray-200">
                <div><span className="text-gray-500">No. Surat Jalan (DO):</span> <strong className="font-mono text-gray-950">{record.deliveryOrderNumber}</strong></div>
                <div><span className="text-gray-500">Tanggal Pengeluaran:</span> <strong className="text-gray-900">{record.saleDate}</strong></div>
                <div><span className="text-gray-500">Customer (Pembeli):</span> <strong className="text-gray-900">{record.customerName}</strong></div>
                <div><span className="text-gray-500">No. Faktur/Invoice:</span> <span className="font-mono">{record.invoiceNumber || '-'}</span></div>
              </div>
              <div className="space-y-1.5 bg-gray-50 p-3 rounded border border-gray-200">
                <div><span className="text-gray-500">No. Polisi Truk:</span> <strong className="font-mono text-gray-950">{record.truckPlateNumber}</strong></div>
                <div><span className="text-gray-500">Nama Pengemudi:</span> <span>{record.driverName || '-'}</span></div>
                <div><span className="text-gray-500">Lokasi Asal Kayu:</span> <strong>{record.storageYard} / Kav. {record.kavlingNumber}</strong></div>
                <div><span className="text-gray-500">Status Pembayaran:</span> <span className="font-semibold text-emerald-700">{record.paymentStatus}</span></div>
              </div>
            </div>

            <table className="w-full text-left border-collapse border border-gray-300 text-[11px] mb-5">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
                  <th className="p-2 border-r border-gray-300">Jenis Kayu (品种)</th>
                  <th className="p-2 border-r border-gray-300 text-right">Batang (根数)</th>
                  <th className="p-2 border-r border-gray-300 text-right">Volume (m³)</th>
                  <th className="p-2 border-r border-gray-300 text-right">Harga / m³ (单价)</th>
                  <th className="p-2 text-right">Total Nilai (总价)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-200">{record.woodSpecies}</td>
                  <td className="p-2 font-mono text-right border-r border-gray-200">{record.pieces} btg</td>
                  <td className="p-2 font-mono text-right border-r border-gray-200">{record.volumeM3.toFixed(4)} m³</td>
                  <td className="p-2 font-mono text-right border-r border-gray-200">{formatRupiah(record.pricePerM3)}</td>
                  <td className="p-2 font-mono font-bold text-right">{formatRupiah(record.totalPrice)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={4} className="p-2 text-right border-r border-gray-300">Total Nilai Penjualan:</td>
                  <td className="p-2 text-right text-gray-950 font-mono">{formatRupiah(record.totalPrice)}</td>
                </tr>
              </tfoot>
            </table>

            {record.notes && (
              <p className="text-[10px] text-gray-500 mb-6 italic">Catatan: {record.notes}</p>
            )}

            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-[10px] border-t border-gray-300">
              <div>
                <p className="font-semibold text-gray-700">Penerima (Pembeli) / 签收</p>
                <div className="h-16" />
                <p className="border-t border-gray-400 pt-1 font-medium text-gray-800">( {record.customerName} )</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Pengemudi / 司机</p>
                <div className="h-16" />
                <p className="border-t border-gray-400 pt-1 font-medium text-gray-800">( {record.driverName || 'Supir'} )</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Petugas TPK / 发货人</p>
                <div className="h-16" />
                <p className="border-t border-gray-400 pt-1 font-medium text-gray-800">( Log Yard Officer )</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

