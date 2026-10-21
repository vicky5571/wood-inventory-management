'use client';

/**
 * src/components/payment-forms/LineItemEditor.tsx
 *
 * Interactive 6-column line items editor for Lembar Tagihan in DRAFT status.
 * Supports add/remove rows, inline arithmetic, and unit dropdowns.
 */

import React from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import type { PaymentFormLineItem, LineItemUnit } from '../../types/index.ts';

interface LineItemEditorProps {
  lines: PaymentFormLineItem[];
  onChange: (lines: PaymentFormLineItem[]) => void;
  defaultTujuan?: string;
}

const UNIT_OPTIONS: LineItemUnit[] = ['m³', 'batang', 'rit', 'lain-lain'];

export function LineItemEditor({ lines, onChange, defaultTujuan = '' }: LineItemEditorProps) {
  const handleFieldChange = (index: number, field: keyof PaymentFormLineItem, value: string | number) => {
    const updated = [...lines];
    const item = { ...updated[index], [field]: value };

    if (field === 'hargaSatuanIDR' || field === 'jumlah') {
      const harga = field === 'hargaSatuanIDR' ? Number(value) || 0 : item.hargaSatuanIDR || 0;
      const qty = field === 'jumlah' ? Number(value) || 0 : item.jumlah || 0;
      item.totalIDR = Math.round(harga * qty);
    }

    updated[index] = item;
    onChange(updated);
  };

  const handleAddRow = () => {
    const newItem: PaymentFormLineItem = {
      id: `line-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      paymentFormId: lines[0]?.paymentFormId || '',
      itemSequence: lines.length + 1,
      kategori: 'Pembelian Kayu',
      konten: '',
      tujuan: defaultTujuan,
      hargaSatuanIDR: 0,
      jumlah: 0,
      unit: 'm³',
      totalIDR: 0,
    };
    onChange([...lines, newItem]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = lines.filter((_, i) => i !== index).map((item, idx) => ({
      ...item,
      itemSequence: idx + 1,
    }));
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-950 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Rincian Tagihan 6 Kolom (请款明细编辑)</span>
          </h2>
          <p className="text-xs text-gray-500">
            Dapat diedit bebas saat status DRAFT sesuai format fisik buku kwitansi
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Baris (添加行)</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">No</th>
              <th className="py-2.5 px-3 w-40">Kategori (项目)</th>
              <th className="py-2.5 px-3 min-w-[200px]">Konten (内容)</th>
              <th className="py-2.5 px-3 w-44">Tujuan (理由)</th>
              <th className="py-2.5 px-3 w-32 text-right">Harga Sat (单价)</th>
              <th className="py-2.5 px-3 w-24 text-right">Jumlah (数量)</th>
              <th className="py-2.5 px-3 w-28 text-center">Unit (单位)</th>
              <th className="py-2.5 px-3 w-36 text-right">Total (金额)</th>
              <th className="py-2.5 px-3 w-12 text-center">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-xs text-gray-400">
                  Belum ada baris tagihan. Klik &quot;Tambah Baris&quot; untuk menambahkan item rincian.
                </td>
              </tr>
            ) : (
              lines.map((line, idx) => (
                <tr key={line.id || idx} className="hover:bg-amber-50/20 transition-colors">
                  <td className="py-2 px-3 text-center font-mono text-gray-400 text-xs">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={line.kategori}
                      onChange={(e) => handleFieldChange(idx, 'kategori', e.target.value)}
                      placeholder="Pembelian Kayu"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={line.konten}
                      onChange={(e) => handleFieldChange(idx, 'konten', e.target.value)}
                      placeholder="No SKSHHK / Uraian"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={line.tujuan}
                      onChange={(e) => handleFieldChange(idx, 'tujuan', e.target.value)}
                      placeholder="Nama Supplier"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={line.hargaSatuanIDR || ''}
                      onChange={(e) => handleFieldChange(idx, 'hargaSatuanIDR', Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 text-right font-mono border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="any"
                      value={line.jumlah || ''}
                      onChange={(e) => handleFieldChange(idx, 'jumlah', Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 text-right font-mono border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <select
                      value={line.unit}
                      onChange={(e) => handleFieldChange(idx, 'unit', e.target.value as LineItemUnit)}
                      className="w-full px-2 py-1.5 text-center font-medium border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                    Rp {Math.round(line.totalIDR).toLocaleString('id-ID')}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Hapus Baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
