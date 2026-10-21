'use client';

import React from 'react';
import type { ContractFormInput, ContractStatus } from '@/src/types/index';

export interface ContractHeaderFieldsProps {
  form: ContractFormInput;
  onChange: (updated: ContractFormInput) => void;
}

const COMMON_KPH = [
  'KPH Randublatung',
  'KPH Gundih',
  'KPH Cepu',
  'KPH Kendal',
  'KPH Mantingan',
  'KPH Blora',
  'KPH Saradan',
  'KPH Madiun',
  'KPH Bojonegoro',
  'KPH Banyuwangi Utara',
];

export function ContractHeaderFields({ form, onChange }: ContractHeaderFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Nomor Kontrak (合同编号) <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. PHT/RND/2026/014"
          value={form.contractNumber}
          onChange={(e) => onChange({ ...form, contractNumber: e.target.value })}
          className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white font-mono font-bold"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Asal KPH Perhutani (所属林业局) <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          list="kph-list"
          placeholder="KPH Randublatung"
          value={form.kphOrigin}
          onChange={(e) => onChange({ ...form, kphOrigin: e.target.value })}
          className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white"
          required
        />
        <datalist id="kph-list">
          {COMMON_KPH.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Nomor PO / SPK (采购订单号)
        </label>
        <input
          type="text"
          placeholder="e.g. PO-2026-001"
          value={form.poNumber || ''}
          onChange={(e) => onChange({ ...form, poNumber: e.target.value })}
          className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Status Kontrak (合同状态)
        </label>
        <select
          value={form.status}
          onChange={(e) => onChange({ ...form, status: e.target.value as ContractStatus })}
          className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white"
        >
          <option value="ACTIVE">Aktif (生效中)</option>
          <option value="DRAFT">Draf (草稿)</option>
          <option value="FULFILLED">Selesai (已履约)</option>
          <option value="EXPIRED">Kadaluarsa (已过期)</option>
          <option value="CANCELLED">Dibatalkan (已取消)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Tanggal Kontrak (合同签署日期) <span className="text-rose-500">*</span>
        </label>
        <input
          type="date"
          value={form.contractDate}
          onChange={(e) => onChange({ ...form, contractDate: e.target.value })}
          className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white font-mono"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Mulai Berlaku (起算日期) <span className="text-rose-500">*</span>
        </label>
        <input
          type="date"
          value={form.effectiveStartDate}
          onChange={(e) => onChange({ ...form, effectiveStartDate: e.target.value })}
          className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white font-mono"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Berakhir Berlaku (截止到期) <span className="text-rose-500">*</span>
        </label>
        <input
          type="date"
          value={form.effectiveEndDate}
          onChange={(e) => onChange({ ...form, effectiveEndDate: e.target.value })}
          className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white font-mono"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Catatan Khusus (备注)
        </label>
        <input
          type="text"
          placeholder="Ketentuan pengiriman / pelunasan..."
          value={form.notes || ''}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          className="w-full px-3 py-1.5 text-xs border rounded-xl bg-white"
        />
      </div>
    </div>
  );
}
