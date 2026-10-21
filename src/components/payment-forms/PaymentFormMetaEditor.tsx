'use client';

/**
 * src/components/payment-forms/PaymentFormMetaEditor.tsx
 *
 * Subcomponent for editing preprinted serial number, issue date, terbilang,
 * and notes on DRAFT Lembar Tagihan documents.
 */

import React, { useState } from 'react';
import { FileText, Save, Loader2, Hash, Calendar } from 'lucide-react';

interface PaymentFormMetaEditorProps {
  preprintedNumber: string;
  setPreprintedNumber: (v: string) => void;
  issueDate: string;
  setIssueDate: (v: string) => void;
  terbilangVal: string;
  setTerbilangVal: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export function PaymentFormMetaEditor({
  preprintedNumber,
  setPreprintedNumber,
  issueDate,
  setIssueDate,
  terbilangVal,
  setTerbilangVal,
  notes,
  setNotes,
  onSave,
  isSaving,
}: PaymentFormMetaEditorProps) {
  const [isEditingTerbilang, setIsEditingTerbilang] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-xs p-5 mb-6">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600" />
          <span>Detail Lembar Kwitansi Fisik (请款单资料)</span>
        </h3>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Simpan Perubahan (保存)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-gray-400" />
            <span>No. Kwitansi Buku (收据编号)</span>
          </label>
          <input
            type="text"
            value={preprintedNumber}
            onChange={(e) => setPreprintedNumber(e.target.value)}
            placeholder="Contoh: 018532"
            className="w-full px-3 py-2 font-mono font-bold text-gray-900 border border-gray-300 rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
          />
          <span className="text-[10px] text-gray-400 mt-1 block">Wajib diisi sebelum diterbitkan</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Tanggal Terbit (开出日期)</span>
          </label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="w-full px-3 py-2 font-medium text-gray-900 border border-gray-300 rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-700">Terbilang (金额大写)</label>
            <button
              type="button"
              onClick={() => setIsEditingTerbilang(!isEditingTerbilang)}
              className="text-[10px] text-amber-700 hover:underline font-semibold"
            >
              {isEditingTerbilang ? 'Kunci Auto' : 'Edit Manual'}
            </button>
          </div>
          <input
            type="text"
            value={terbilangVal}
            readOnly={!isEditingTerbilang}
            onChange={(e) => setTerbilangVal(e.target.value.toUpperCase())}
            placeholder="RUPIAH..."
            className={`w-full px-3 py-2 font-mono text-[11px] font-bold border rounded-xl ${
              isEditingTerbilang ? 'border-amber-500 bg-amber-50/20 text-gray-900' : 'border-gray-200 bg-gray-50 text-gray-700'
            }`}
          />
        </div>
      </div>

      <div className="mt-3.5">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Catatan / Ket (备注)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Catatan tambahan yang akan dicetak di baris 'ket'..."
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
        />
      </div>
    </div>
  );
}
