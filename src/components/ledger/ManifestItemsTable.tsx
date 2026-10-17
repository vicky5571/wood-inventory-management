'use client';

import React from 'react';
import type { ManifestItemInput } from '@/src/types';
import { ManifestItemRow } from './ManifestItemRow';
import { Layers, Plus } from 'lucide-react';

export interface ManifestItemsTableProps {
  items: ManifestItemInput[];
  onChange?: (items: ManifestItemInput[]) => void;
  setItems?: React.Dispatch<React.SetStateAction<ManifestItemInput[]>>;
  availableSpecies?: string[];
}

export function ManifestItemsTable({
  items,
  onChange,
  setItems,
  availableSpecies,
}: ManifestItemsTableProps) {
  const updateItems = (nextItems: ManifestItemInput[]) => {
    if (onChange) {
      onChange(nextItems);
    } else if (setItems) {
      setItems(nextItems);
    }
  };

  const handleAddItem = () => {
    const lastItem = items.length > 0 ? items[items.length - 1] : undefined;
    const newItem: ManifestItemInput = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      woodSpecies: '',
      woodLengthM: lastItem ? lastItem.woodLengthM : 4.0,
      kavlingNumber: lastItem ? lastItem.kavlingNumber : 'KAV-01',
      storageYard: lastItem ? lastItem.storageYard : 'TPK-1',
      deliveredPieces: 0,
      deliveredVolumeM3: 0,
      tallyPieces: 0,
      tallyVolumeM3: 0,
      timberPricePerM3: lastItem ? lastItem.timberPricePerM3 : 0,
      timberPphRate: lastItem ? lastItem.timberPphRate : 0.5,
    };
    updateItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, updated: ManifestItemInput) => {
    const next = [...items];
    next[index] = updated;
    updateItems(next);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) return;
    const next = items.filter((_, i) => i !== index);
    updateItems(next);
  };

  return (
    <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4.5">
      {/* Header with Title, Count, and Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#ffc908] text-[#101828] text-xs font-bold flex items-center justify-center shadow-2xs">
            2
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#101828] uppercase tracking-wider">
            <Layers className="w-4 h-4 text-gray-500" />
            <span>Rincian Muatan Kayu (木材入库明细清单)</span>
          </div>
          <span className="text-[11px] font-semibold text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full font-mono">
            {items.length} Baris
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddItem}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#101828] bg-[#ffc908] hover:bg-[#f0bc00] active:scale-[0.98] rounded-xl shadow-2xs hover:shadow transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Tambah Baris Kayu (添加木材行)</span>
        </button>
      </div>

      {/* Items List */}
      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500 text-xs flex flex-col items-center justify-center gap-2">
            <p>Belum ada rincian muatan kayu (尚未添加木材明细).</p>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#101828] bg-[#ffc908] px-3 py-1.5 rounded-lg hover:bg-[#f0bc00] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Baris Kayu (添加木材行)</span>
            </button>
          </div>
        ) : (
          items.map((item, index) => (
            <ManifestItemRow
              key={item.id || `item-${index}`}
              item={item}
              index={index}
              totalItems={items.length}
              onChange={(updated) => handleUpdateItem(index, updated)}
              onDelete={() => handleDeleteItem(index)}
              availableSpecies={availableSpecies}
              disabledDelete={items.length <= 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
