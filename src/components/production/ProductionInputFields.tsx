'use client';

/**
 * src/components/production/ProductionInputFields.tsx
 *
 * Log input and sawn output form fields subcomponent for ProductionFormModal.
 */

import React from 'react';
import type { SawmillProductionFormInput } from '../../types/index.ts';
import { ProductSuggestionCombobox } from './ProductSuggestionCombobox.tsx';

export interface ProductionInputFieldsProps {
  form: SawmillProductionFormInput;
  onChange: (patch: Partial<SawmillProductionFormInput>) => void;
  productSuggestions?: string[];
}

export function ProductionInputFields({
  form,
  onChange,
  productSuggestions = [],
}: ProductionInputFieldsProps) {
  return (
    <>
      <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-3">
        <div className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">Log Mentah (Input)</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Volume Input (m³) *</label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              required
              value={form.inputVolumeM3}
              onChange={(e) => onChange({ inputVolumeM3: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Jumlah Batang Input *</label>
            <input
              type="number"
              min="1"
              required
              value={form.inputPieces}
              onChange={(e) => onChange({ inputPieces: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      <div className="p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-3">
        <div className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Hasil Olahan (Output)</div>
        <div>
          <label className="block text-gray-700 font-semibold mb-1">Produk Hasil Gergaji *</label>
          <ProductSuggestionCombobox
            value={form.outputProduct}
            onChange={(p) => onChange({ outputProduct: p })}
            suggestions={productSuggestions}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Volume Output (m³) *</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              required
              value={form.outputVolumeM3}
              onChange={(e) => onChange({ outputVolumeM3: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Jumlah Batang / Lembar *</label>
            <input
              type="number"
              min="0"
              required
              value={form.outputPieces}
              onChange={(e) => onChange({ outputPieces: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-xs font-mono"
            />
          </div>
        </div>
      </div>
    </>
  );
}
