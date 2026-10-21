'use client';

import React from 'react';
import type { ContractSortimentInput } from '@/src/types/index';
import { Trash2 } from 'lucide-react';

export interface SortimentItemRowProps {
  item: ContractSortimentInput;
  index: number;
  onChange: (updated: ContractSortimentInput) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const COMMON_SPECIES = ['Jati', 'Sonokeling', 'Mahoni', 'Meranti', 'Bengkirai', 'Kapur', 'Pinus', 'Sengon'];
const COMMON_GRADES = ['A1', 'A2', 'A3', 'AII', 'Standard', 'Campur'];

export function SortimentItemRow({
  item,
  index,
  onChange,
  onRemove,
  canRemove,
}: SortimentItemRowProps) {
  const subtotal = Math.round((Number(item.volumeM3) || 0) * (Number(item.pricePerM3) || 0));

  return (
    <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/80 flex flex-col md:flex-row gap-3 items-start md:items-center">
      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-xs font-bold shrink-0">
        {index + 1}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 flex-1 w-full">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Jenis Kayu</label>
          <input
            type="text"
            list="species-list"
            placeholder="Jati"
            value={item.woodSpecies}
            onChange={(e) => onChange({ ...item, woodSpecies: e.target.value })}
            className="w-full px-2.5 py-1 text-xs border rounded-lg bg-white"
            required
          />
          <datalist id="species-list">
            {COMMON_SPECIES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Grade / Sortimen</label>
          <input
            type="text"
            list="grade-list"
            placeholder="A1"
            value={item.grade}
            onChange={(e) => onChange({ ...item, grade: e.target.value })}
            className="w-full px-2.5 py-1 text-xs border rounded-lg bg-white"
            required
          />
          <datalist id="grade-list">
            {COMMON_GRADES.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Panjang (m)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="4.0"
            value={item.woodLengthM ?? ''}
            onChange={(e) =>
              onChange({
                ...item,
                woodLengthM: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full px-2.5 py-1 text-xs border rounded-lg bg-white"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Volume (m³)</label>
          <input
            type="number"
            step="0.0001"
            min="0"
            placeholder="10.0"
            value={item.volumeM3 || ''}
            onChange={(e) => onChange({ ...item, volumeM3: Number(e.target.value) })}
            className="w-full px-2.5 py-1 text-xs border rounded-lg bg-white font-mono font-bold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Jumlah (btg)</label>
          <input
            type="number"
            min="0"
            placeholder="25"
            value={item.pieces ?? ''}
            onChange={(e) =>
              onChange({
                ...item,
                pieces: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full px-2.5 py-1 text-xs border rounded-lg bg-white font-mono"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Harga / m³ (Rp)</label>
          <input
            type="number"
            min="0"
            placeholder="5000000"
            value={item.pricePerM3 || ''}
            onChange={(e) => onChange({ ...item, pricePerM3: Number(e.target.value) })}
            className="w-full px-2.5 py-1 text-xs border rounded-lg bg-white font-mono"
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end shrink-0 pt-1 md:pt-0">
        <div className="text-right">
          <span className="text-[10px] text-gray-400 block">Subtotal</span>
          <span className="text-xs font-mono font-bold text-gray-900">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(subtotal)}
          </span>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
            title="Hapus baris sortimen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
