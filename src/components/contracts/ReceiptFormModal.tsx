'use client';

import React, { useState } from 'react';
import type { ContractReceiptFormInput } from '@/src/types/index';
import { X, Save, Receipt } from 'lucide-react';

export interface ReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: ContractReceiptFormInput) => Promise<void>;
  contractId: string;
  contractNumber: string;
}

export function ReceiptFormModal({
  isOpen,
  onClose,
  onSave,
  contractId,
  contractNumber,
}: ReceiptFormModalProps) {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountIDR, setAmountIDR] = useState(0);
  const [coveredVolumeM3, setCoveredVolumeM3] = useState(0);
  const [coveredPieces, setCoveredPieces] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNumber.trim() || amountIDR <= 0) return;

    setIsSubmitting(true);
    try {
      await onSave({
        contractId,
        receiptNumber: receiptNumber.trim(),
        receiptDate,
        amountIDR,
        coveredVolumeM3,
        coveredPieces,
        notes: notes.trim() || undefined,
      });
      setReceiptNumber('');
      setAmountIDR(0);
      setCoveredVolumeM3(0);
      setCoveredPieces(undefined);
      setNotes('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xl w-full max-w-lg my-auto overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-200">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Catat Kwitansi Pembayaran (录入收款收据)</h2>
              <p className="text-[10px] text-gray-500 font-mono">Kontrak: {contractNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nomor Kwitansi (收据编号) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. KW/RND/2026/089"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white font-mono font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tanggal Kwitansi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nominal Pembayaran (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                placeholder="50000000"
                value={amountIDR || ''}
                onChange={(e) => setAmountIDR(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Volume Dicakup (m³)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                placeholder="10.0"
                value={coveredVolumeM3 || ''}
                onChange={(e) => setCoveredVolumeM3(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Jumlah Batang (btg)
              </label>
              <input
                type="number"
                min="0"
                placeholder="20"
                value={coveredPieces ?? ''}
                onChange={(e) => setCoveredPieces(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Catatan / Bukti Bayar
            </label>
            <input
              type="text"
              placeholder="e.g. Transfer BNI Rek Giro, DP 50%"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50">
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kwitansi (保存)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
