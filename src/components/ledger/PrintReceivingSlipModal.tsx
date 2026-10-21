'use client';

import React, { useEffect } from 'react';
import type { WoodReceivingRecord, PrintReceivingSlipModalProps } from '@/src/types';
import { Printer, X } from 'lucide-react';

export type { PrintReceivingSlipModalProps };

function formatRupiah(num?: number | null): string {
  if (num == null) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function PrintReceivingSlipModal({ isOpen, record, onClose }: PrintReceivingSlipModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const volDiff = Number((record.tallyVolumeM3 - record.deliveredVolumeM3).toFixed(2));
  const pieceDiff = record.tallyPieces - record.deliveredPieces;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-slip-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-slip, #printable-slip * { visibility: visible !important; }
          #printable-slip {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; margin: 0 !important; padding: 24px !important;
            background: white !important; color: black !important;
            box-shadow: none !important; border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-gray-100 rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Top Control Bar (no-print) */}
        <div className="no-print flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Pratinjau Cetak</span>
            <span className="text-xs text-gray-400">/ 打印预览</span>
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

        {/* Scrollable Receipt Body */}
        <div className="p-6 overflow-y-auto bg-gray-100/60 flex justify-center">
          <div
            id="printable-slip"
            className="w-full bg-white border border-gray-300 p-8 text-gray-900 font-sans shadow-md text-xs leading-normal"
          >
            {/* Header */}
            <div className="text-center pb-4 mb-4 border-b-2 border-gray-900">
              <h2 className="text-base font-black tracking-widest text-gray-950 uppercase">
                TIMBERGUARD / PT RIMBA MANDIRI
              </h2>
              <p id="print-slip-title" className="text-sm font-bold text-gray-800 tracking-wide mt-1">
                SURAT TANDA TERIMA KAYU MASUK (木材进厂检尺验收单)
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Dokumen Resmi Penerimaan Log & Kayu Bulat • Pabrik Pengolahan Kayu Terpadu
              </p>
            </div>

            {/* Document Metadata Table */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">Tanggal Penerimaan (到货日期):</span>
                <span className="font-semibold text-gray-900">{record.receiptDate}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">No. Kwitansi (订货单号):</span>
                <span className="font-mono font-semibold text-gray-900">{record.receiptNumber || '-'}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">No. Polisi Truk (车牌号):</span>
                <span className="font-mono font-bold text-gray-900">{record.truckPlateNumber}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">No. Dokumen SKSHHK / DKP:</span>
                <span className="font-mono text-gray-900">{record.forestryDocNumber}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">No. Kontrak (合同编号):</span>
                <span className="font-mono text-gray-900">{record.contractNumber}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">Supplier / Pemilik (供应商):</span>
                <span className="font-bold text-gray-900">{record.supplierName}</span>
              </div>
            </div>

            {/* Wood Specs & Yard Location */}
            <div className="mb-4">
              <div className="bg-gray-100 font-bold px-3 py-1 text-gray-800 border-l-4 border-gray-900 mb-2">
                Spesifikasi Kayu & Lokasi Penumpukan (材种及堆场规格)
              </div>
              <div className="grid grid-cols-3 gap-2 p-2.5 border border-gray-200 rounded-md">
                <div>
                  <span className="text-gray-500 block text-[10px]">Jenis Kayu (树种)</span>
                  <span className="font-bold text-gray-900">{record.woodSpecies}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">No. Kavling / TPK (批号/场地)</span>
                  <span className="font-bold text-[#b38600]">{record.kavlingNumber} / {record.storageYard}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Panjang Rata-rata (长度)</span>
                  <span className="font-semibold text-gray-900">{record.woodLengthM} m</span>
                </div>
              </div>
            </div>

            {/* Quantities & Verification Table */}
            <div className="mb-4">
              <div className="bg-gray-100 font-bold px-3 py-1 text-gray-800 border-l-4 border-gray-900 mb-2">
                Verifikasi Pengukuran & Kubikasi (检尺数量核对)
              </div>
              <table className="w-full border-collapse border border-gray-300 text-center">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="border border-gray-300 p-2">Item Parameter</th>
                    <th className="border border-gray-300 p-2">Surat Jalan (Delivery)</th>
                    <th className="border border-gray-300 p-2 font-bold">Hasil Ukur Pabrik (Tally)</th>
                    <th className="border border-gray-300 p-2">Selisih (Discrepancy)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2 text-left font-medium">Jumlah Batang (根数)</td>
                    <td className="border border-gray-300 p-2 font-mono">{record.deliveredPieces} btg</td>
                    <td className="border border-gray-300 p-2 font-mono font-bold">{record.tallyPieces} btg</td>
                    <td className="border border-gray-300 p-2 font-mono">{pieceDiff === 0 ? '0' : pieceDiff > 0 ? `+${pieceDiff}` : `${pieceDiff}`} btg</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 text-left font-medium">Volume Kubikasi (m³)</td>
                    <td className="border border-gray-300 p-2 font-mono">{record.deliveredVolumeM3.toFixed(2)} m³</td>
                    <td className="border border-gray-300 p-2 font-mono font-bold">{record.tallyVolumeM3.toFixed(2)} m³</td>
                    <td className="border border-gray-300 p-2 font-mono font-bold">{volDiff === 0 ? '0.00' : volDiff > 0 ? `+${volDiff.toFixed(2)}` : `${volDiff.toFixed(2)}`} m³</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="mb-6">
              <div className="bg-gray-100 font-bold px-3 py-1 text-gray-800 border-l-4 border-gray-900 mb-2">
                Ringkasan Nilai Finansial & Pembayaran (财务结算汇总)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div>
                  <span className="text-gray-500 block text-[10px]">Net Pembayaran Kayu (木材)</span>
                  <span className="font-mono font-bold text-gray-900">{formatRupiah(record.timberNetPayable)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Net Ongkir (运费)</span>
                  <span className="font-mono font-bold text-gray-900">{formatRupiah(record.freightNetPayable)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Grand Total Bayar (应付总额)</span>
                  <span className="font-mono font-bold text-gray-950 text-sm">{formatRupiah(record.grandNetPayable)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Status Bayar (状态)</span>
                  <span className="font-semibold text-gray-800">{record.paymentStatus || 'UNPAID'}</span>
                </div>
              </div>
            </div>

            {/* 3-Column Signature Blocks */}
            <div className="pt-2 border-t border-gray-300">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="flex flex-col items-center">
                  <p className="font-bold text-gray-800">Sopir / Pengangkut (司机)</p>
                  <p className="text-[10px] text-gray-500">Pemberi Muatan / Driver</p>
                  <div className="h-14 w-28 border-b border-dashed border-gray-400 mt-2" />
                  <p className="text-[10px] text-gray-400 mt-1">(Nama & Tanda Tangan)</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="font-bold text-gray-800">Petugas Tally (检尺员)</p>
                  <p className="text-[10px] text-gray-500">Pemeriksa Fisik / Grader</p>
                  <div className="h-14 w-28 border-b border-dashed border-gray-400 mt-2" />
                  <p className="text-[10px] text-gray-400 mt-1">(Nama & Tanda Tangan)</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="font-bold text-gray-800">Kepala Pabrik / Lapangan (主管/厂长)</p>
                  <p className="text-[10px] text-gray-500">Persetujuan Masuk / Mill Mgr</p>
                  <div className="h-14 w-28 border-b border-dashed border-gray-400 mt-2" />
                  <p className="text-[10px] text-gray-400 mt-1">(Nama & Tanda Tangan)</p>
                </div>
              </div>
            </div>

            {/* Footer watermark note */}
            <div className="mt-5 pt-2 border-t border-gray-200 flex justify-between text-[9px] text-gray-400">
              <span>Dicetak otomatis oleh Sistem Inventaris Kayu TimberGuard</span>
              <span>Halaman 1 / 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
