'use client';

/**
 * src/components/payment-forms/PrintPaymentFormModal.tsx
 *
 * Printable A4 portrait Lembar Tagihan (请款单) bilingual document matching the
 * physical carbon copy form book. Kept strictly under 250 LOC.
 */

import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings.ts';
import { terbilang } from '../../utils/terbilang.ts';
import type { PaymentFormWithLines } from '../../types/index.ts';

interface PrintPaymentFormModalProps {
  isOpen: boolean;
  form: PaymentFormWithLines | null;
  onClose: () => void;
}

const SIGNATURE_SLOTS = [
  { zh: '总经理', id: 'Manager Umum' },
  { zh: '资金', id: 'Finance' },
  { zh: '财务负责人', id: 'Kepala Akuntan' },
  { zh: '部门负责人', id: 'Kepala Dep.' },
  { zh: '经办人', id: 'Pembuat' },
];

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function parseDateParts(dateStr?: string) {
  if (!dateStr) {
    const now = new Date();
    return {
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: String(now.getDate()).padStart(2, '0'),
    };
  }
  const parts = dateStr.slice(0, 10).split('-');
  return { year: parts[0] || '____', month: parts[1] || '__', day: parts[2] || '__' };
}

export function PrintPaymentFormModal({ isOpen, form, onClose }: PrintPaymentFormModalProps) {
  const { settings } = useSettings();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !form) return null;

  const companyName = settings.companyName || 'PT. BRILLIANT JAYA WOOD INDUSTRY';
  const { year, month, day } = parseDateParts(form.issueDate);
  const totalAmount = form.totalAmountIDR ?? form.totalTimberNetIDR ?? 0;
  const amountInWords = form.terbilang || terbilang(totalAmount);
  const displayLines = form.lines && form.lines.length > 0 ? form.lines : [];
  const emptyRowsCount = Math.max(0, 5 - displayLines.length);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <style>{`
        @page { size: A4 portrait; margin: 12mm 15mm; }
        @media print {
          body * { visibility: hidden !important; }
          #printable-lembar-tagihan, #printable-lembar-tagihan * { visibility: visible !important; }
          #printable-lembar-tagihan {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; margin: 0 !important; padding: 0 !important;
            background: white !important; color: black !important;
            box-shadow: none !important; border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-gray-100 rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        <div className="no-print flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Pratinjau Lembar Tagihan</span>
            <span className="text-xs text-gray-400">/ 请款单打印预览</span>
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
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-100/60 flex justify-center">
          <div
            id="printable-lembar-tagihan"
            className="w-full bg-white border border-gray-300 p-8 text-gray-900 font-sans shadow-md text-xs leading-normal"
          >
            {/* Header */}
            <div className="relative pb-2 mb-2 text-center">
              <h2 className="text-base font-black tracking-widest text-gray-950">
                请 款 单 <span className="text-sm font-bold">/ LEMBAR TAGIHAN</span>
              </h2>
              <p className="text-xs font-bold text-gray-700 tracking-wide mt-0.5 uppercase">{companyName}</p>
              <div className="absolute right-0 top-0 text-right">
                <span className="text-xs font-semibold text-gray-500">N° </span>
                <span className="text-sm font-mono font-bold text-rose-700 underline decoration-rose-300">
                  {form.preprintedNumber || '___________'}
                </span>
              </div>
            </div>

            {/* Date line */}
            <div className="flex justify-end items-center gap-2 mb-3 text-[11px] font-medium text-gray-700">
              <span>年</span>
              <span className="font-mono font-bold px-1.5 border-b border-gray-400 min-w-[40px] text-center">{year}</span>
              <span>Tahun</span>
              <span>月</span>
              <span className="font-mono font-bold px-1.5 border-b border-gray-400 min-w-[24px] text-center">{month}</span>
              <span>Bulan</span>
              <span>日</span>
              <span className="font-mono font-bold px-1.5 border-b border-gray-400 min-w-[24px] text-center">{day}</span>
              <span>Tanggal</span>
            </div>

            {/* Main Table */}
            <table className="w-full border-collapse border border-gray-800 text-left mb-2 text-[11px]">
              <thead>
                <tr className="bg-gray-100 text-gray-900 font-bold text-center border-b border-gray-800">
                  <th className="border border-gray-800 p-1.5 w-[18%]">
                    <div>项目</div>
                    <div className="text-[10px] font-normal text-gray-600">Kategori</div>
                  </th>
                  <th className="border border-gray-800 p-1.5 w-[38%]">
                    <div>内容 / 劲贷理由</div>
                    <div className="text-[10px] font-normal text-gray-600">Konten / Tujuan</div>
                  </th>
                  <th className="border border-gray-800 p-1.5 w-[16%] text-right">
                    <div>单价 (印尼盾)</div>
                    <div className="text-[10px] font-normal text-gray-600">Harga Satuan (Rp)</div>
                  </th>
                  <th className="border border-gray-800 p-1.5 w-[12%] text-center">
                    <div>数量</div>
                    <div className="text-[10px] font-normal text-gray-600">Jumlah</div>
                  </th>
                  <th className="border border-gray-800 p-1.5 w-[16%] text-right">
                    <div>金额 (印尼盾)</div>
                    <div className="text-[10px] font-normal text-gray-600">Total (Rp)</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayLines.map((line, idx) => (
                  <tr key={line.id || idx} className="border-b border-gray-400">
                    <td className="border-r border-gray-800 p-1.5 font-medium align-top">{line.kategori}</td>
                    <td className="border-r border-gray-800 p-1.5 align-top">
                      <div className="font-semibold text-gray-900">{line.konten}</div>
                      {line.tujuan && <div className="text-[10px] text-gray-600 italic mt-0.5">Tujuan: {line.tujuan}</div>}
                    </td>
                    <td className="border-r border-gray-800 p-1.5 font-mono text-right align-top">
                      {formatRupiah(line.hargaSatuanIDR)}
                    </td>
                    <td className="border-r border-gray-800 p-1.5 font-mono text-center align-top whitespace-nowrap">
                      {line.jumlah} <span className="text-[10px] text-gray-600">{line.unit}</span>
                    </td>
                    <td className="p-1.5 font-mono font-bold text-right align-top">{formatRupiah(line.totalIDR)}</td>
                  </tr>
                ))}
                {Array.from({ length: emptyRowsCount }).map((_, i) => (
                  <tr key={`empty-${i}`} className="border-b border-gray-300 h-8">
                    <td className="border-r border-gray-800 p-1.5">&nbsp;</td>
                    <td className="border-r border-gray-800 p-1.5">&nbsp;</td>
                    <td className="border-r border-gray-800 p-1.5">&nbsp;</td>
                    <td className="border-r border-gray-800 p-1.5">&nbsp;</td>
                    <td className="p-1.5">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-800 font-bold bg-gray-50">
                  <td colSpan={4} className="border-r border-gray-800 p-2 text-right uppercase tracking-wider text-xs">
                    合计 Total:
                  </td>
                  <td className="p-2 font-mono font-black text-right text-xs text-gray-950">
                    {formatRupiah(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Terbilang & Ket */}
            <div className="border border-gray-800 p-2 mb-4 text-[11px] space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-gray-900 whitespace-nowrap">金额大写 / Terbilang:</span>
                <span className="font-mono font-bold uppercase tracking-wide text-gray-900">{amountInWords}</span>
              </div>
              <div className="flex items-baseline gap-1 pt-1 border-t border-dashed border-gray-300">
                <span className="font-bold text-gray-900 whitespace-nowrap">备注 / Ket:</span>
                <span className="text-gray-700">{form.notes || '—'}</span>
              </div>
            </div>

            {/* 5 Signature Slots */}
            <div className="pt-2">
              <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                {SIGNATURE_SLOTS.map((slot) => (
                  <div key={slot.id} className="flex flex-col items-center justify-between h-20">
                    <div>
                      <p className="font-bold text-gray-900">{slot.zh}</p>
                      <p className="text-gray-600">{slot.id}</p>
                    </div>
                    <div className="w-24 border-b border-gray-800" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
