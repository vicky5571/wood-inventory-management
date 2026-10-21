'use client';

/**
 * src/components/payment-forms/PrintPaymentFormModal.tsx
 *
 * Printable A4 portrait weekly payment form document with `@media print` CSS.
 * Displays consolidated delivery line items, tax breakdowns, and 3-column signature block.
 */

import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import type { PaymentFormWithLines } from '../../types/index.ts';

interface PrintPaymentFormModalProps {
  isOpen: boolean;
  form: PaymentFormWithLines | null;
  onClose: () => void;
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function PrintPaymentFormModal({ isOpen, form, onClose }: PrintPaymentFormModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !form) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-payment-form, #printable-payment-form * { visibility: visible !important; }
          #printable-payment-form {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; margin: 0 !important; padding: 24px !important;
            background: white !important; color: black !important;
            box-shadow: none !important; border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-gray-100 rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Top Control Bar (no-print) */}
        <div className="no-print flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Pratinjau Cetak Form</span>
            <span className="text-xs text-gray-400">/ 打印预览</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-lg shadow-xs transition cursor-pointer"
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

        {/* Scrollable Document Body */}
        <div className="p-6 overflow-y-auto bg-gray-100/60 flex justify-center">
          <div
            id="printable-payment-form"
            className="w-full bg-white border border-gray-300 p-8 text-gray-900 font-sans shadow-md text-xs leading-normal"
          >
            {/* Header */}
            <div className="text-center pb-4 mb-4 border-b-2 border-gray-900">
              <h2 className="text-base font-black tracking-widest text-gray-950 uppercase">
                TIMBERGUARD / PT RIMBA MANDIRI
              </h2>
              <p className="text-sm font-bold text-gray-800 tracking-wide mt-1">
                FORM PEMBAYARAN KAYU MINGGUAN (木材周付款结算单)
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Dokumen Resmi Konsolidasi & Rekapitulasi Pembayaran Penerimaan Log Pabrik
              </p>
            </div>

            {/* Document Metadata Table */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">No. Form Pembayaran (付款单号):</span>
                <span className="font-mono font-bold text-gray-950">{form.formNumber}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">Periode Mingguan (结算周期):</span>
                <span className="font-semibold text-gray-900">{form.weekStartDate} s/d {form.weekEndDate}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">Supplier / Vendor (供应商):</span>
                <span className="font-bold text-gray-900">{form.supplierName}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">Jenis Kayu (树种):</span>
                <span className="font-bold text-gray-900">{form.woodSpecies}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">No. Kontrak (合同编号):</span>
                <span className="font-mono text-gray-900">{form.contractNumber || 'Non-Kontrak (Spot)'}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-200">
                <span className="text-gray-500">Status Pembayaran (状态):</span>
                <span className="font-bold text-gray-900">{form.status}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full border-collapse border border-gray-300 text-center mb-4 text-[11px]">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-bold">
                  <th className="border border-gray-300 p-1.5">No</th>
                  <th className="border border-gray-300 p-1.5">Tgl Masuk</th>
                  <th className="border border-gray-300 p-1.5">No. Polisi</th>
                  <th className="border border-gray-300 p-1.5">SKSHHK</th>
                  <th className="border border-gray-300 p-1.5">No. Kwitansi</th>
                  <th className="border border-gray-300 p-1.5">Kav</th>
                  <th className="border border-gray-300 p-1.5 font-mono">Btg</th>
                  <th className="border border-gray-300 p-1.5 font-mono">Vol m³</th>
                  <th className="border border-gray-300 p-1.5 font-mono text-right">Harga / m³</th>
                  <th className="border border-gray-300 p-1.5 font-mono text-right">Gross (Rp)</th>
                  <th className="border border-gray-300 p-1.5 font-mono text-right">PPh (Rp)</th>
                  <th className="border border-gray-300 p-1.5 font-mono text-right">Net (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, idx) => (
                  <tr key={`${line.recordId}-${idx}`} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-1">{idx + 1}</td>
                    <td className="border border-gray-300 p-1 whitespace-nowrap">{line.receiptDate}</td>
                    <td className="border border-gray-300 p-1 font-mono font-medium">{line.truckPlateNumber}</td>
                    <td className="border border-gray-300 p-1 font-mono">{line.forestryDocNumber}</td>
                    <td className="border border-gray-300 p-1 font-mono">{line.receiptNumber}</td>
                    <td className="border border-gray-300 p-1">{line.kavlingNumber}</td>
                    <td className="border border-gray-300 p-1 font-mono">{line.tallyPieces}</td>
                    <td className="border border-gray-300 p-1 font-mono font-bold">{line.tallyVolumeM3.toFixed(2)}</td>
                    <td className="border border-gray-300 p-1 font-mono text-right">{formatRupiah(line.timberPricePerM3)}</td>
                    <td className="border border-gray-300 p-1 font-mono text-right">{formatRupiah(line.timberGrossIDR)}</td>
                    <td className="border border-gray-300 p-1 font-mono text-right text-gray-600">({formatRupiah(line.timberPphIDR)})</td>
                    <td className="border border-gray-300 p-1 font-mono font-bold text-right text-gray-950">{formatRupiah(line.timberNetIDR)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                  <td colSpan={6} className="border border-gray-300 p-2 text-right uppercase">
                    Total Rekapitulasi:
                  </td>
                  <td className="border border-gray-300 p-2 font-mono">{form.totalTallyPieces}</td>
                  <td className="border border-gray-300 p-2 font-mono font-black">{form.totalTallyVolumeM3.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2"></td>
                  <td className="border border-gray-300 p-2 font-mono text-right">{formatRupiah(form.totalTimberGrossIDR)}</td>
                  <td className="border border-gray-300 p-2 font-mono text-right text-gray-700">({formatRupiah(form.totalTimberPphIDR)})</td>
                  <td className="border border-gray-300 p-2 font-mono font-black text-right text-gray-950 text-sm bg-amber-100/60">
                    {formatRupiah(form.totalTimberNetIDR)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* 3-Column Signature Blocks */}
            <div className="pt-6 mt-6 border-t border-gray-300">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="flex flex-col items-center">
                  <p className="font-bold text-gray-800">Penerima / Supplier (领款人)</p>
                  <p className="text-[10px] text-gray-500">Penyedia Bahan Baku Kayu</p>
                  <div className="h-16 w-36 border-b border-dashed border-gray-400 mt-2" />
                  <p className="text-[10px] text-gray-400 mt-1">(Nama Terang & Tanda Tangan)</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="font-bold text-gray-800">Bendahara / Keuangan (财务审核)</p>
                  <p className="text-[10px] text-gray-500">Bagian Verifikasi Pembayaran</p>
                  <div className="h-16 w-36 border-b border-dashed border-gray-400 mt-2" />
                  <p className="text-[10px] text-gray-400 mt-1">(Kasir / Finance)</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="font-bold text-gray-800">Mengetahui / Pimpinan (总经理)</p>
                  <p className="text-[10px] text-gray-500">Manajemen / Factory Manager</p>
                  <div className="h-16 w-36 border-b border-dashed border-gray-400 mt-2" />
                  <p className="text-[10px] text-gray-400 mt-1">(Direktur Operasional)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
