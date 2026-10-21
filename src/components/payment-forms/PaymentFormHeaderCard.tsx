'use client';

/**
 * src/components/payment-forms/PaymentFormHeaderCard.tsx
 *
 * Header card for PaymentForm detail view.
 * Displays form metadata, status badge, and primary action buttons.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, CheckCircle, DollarSign, AlertOctagon, Calendar, Building2, Trees, FileText } from 'lucide-react';
import type { PaymentFormWithLines, PaymentFormStatus } from '../../types/index.ts';

interface PaymentFormHeaderCardProps {
  form: PaymentFormWithLines;
  onOpenPrint: () => void;
  onOpenIssue: () => void;
  onOpenMarkPaid: () => void;
  onOpenVoid: () => void;
}

const STATUS_BADGES: Record<PaymentFormStatus, { label: string; sub: string; bg: string; text: string; border: string }> = {
  DRAFT: {
    label: 'DRAFT',
    sub: '草稿',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
  ISSUED: {
    label: 'TERBIT',
    sub: '已开出',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
  },
  PAID: {
    label: 'LUNAS',
    sub: '已付',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  VOID: {
    label: 'BATAL',
    sub: '已作废',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-300',
  },
};

export function PaymentFormHeaderCard({
  form,
  onOpenPrint,
  onOpenIssue,
  onOpenMarkPaid,
  onOpenVoid,
}: PaymentFormHeaderCardProps) {
  const badge = STATUS_BADGES[form.status] || STATUS_BADGES.DRAFT;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Link
            href="/payment-forms"
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
            title="Kembali ke Daftar (返回列表)"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold font-mono text-gray-950 tracking-tight">
                {form.formNumber}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                <span>{badge.label}</span>
                <span className="text-[10px] opacity-75 font-normal">({badge.sub})</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>Periode Operasional: {form.weekStartDate} s/d {form.weekEndDate}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenPrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Cetak Slip (打印)</span>
          </button>

          {form.status === 'DRAFT' && (
            <button
              type="button"
              onClick={onOpenIssue}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Terbitkan Form (开出)</span>
            </button>
          )}

          {form.status === 'ISSUED' && (
            <button
              type="button"
              onClick={onOpenMarkPaid}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Tandai Lunas (标记已付)</span>
            </button>
          )}

          {form.status !== 'VOID' && (
            <button
              type="button"
              onClick={onOpenVoid}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Batalkan (作废)</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
        <div>
          <span className="text-gray-400 flex items-center gap-1 mb-1 font-medium">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            Supplier (供应商)
          </span>
          <p className="font-semibold text-gray-900">{form.supplierName}</p>
        </div>
        <div>
          <span className="text-gray-400 flex items-center gap-1 mb-1 font-medium">
            <Trees className="w-3.5 h-3.5 text-gray-400" />
            Jenis Kayu (树种)
          </span>
          <p className="font-semibold text-gray-900">{form.woodSpecies}</p>
        </div>
        <div>
          <span className="text-gray-400 flex items-center gap-1 mb-1 font-medium">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            No. Kontrak (合同号)
          </span>
          <p className="font-semibold text-gray-900 font-mono">
            {form.contractNumber || '—'}
          </p>
        </div>
        <div>
          <span className="text-gray-400 block mb-1 font-medium">Status Pembayaran</span>
          {form.status === 'PAID' ? (
            <div>
              <p className="font-semibold text-emerald-700">LUNAS - {form.paymentDate || '—'}</p>
              <p className="text-[11px] text-gray-500 font-mono">Inv: {form.invoiceNumber || '—'} ({form.paymentMethod || 'BANK'})</p>
            </div>
          ) : (
            <p className="font-semibold text-gray-700">Belum Terbayar</p>
          )}
        </div>
      </div>

      {form.status === 'VOID' && form.notes && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
          <span className="font-bold">Alasan Pembatalan:</span> {form.notes}
        </div>
      )}
    </div>
  );
}
