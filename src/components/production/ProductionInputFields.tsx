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
      <div className="p-3 bg-surface-raised/50 border border-border-subtle rounded-lg space-y-3">
        <div className="font-semibold text-foreground">Log Mentah (Input)</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-muted font-medium mb-1">Volume Input (m3) *</label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              required
              value={form.inputVolumeM3}
              onChange={(e) => onChange({ inputVolumeM3: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-surface-raised border border-border-default rounded-md text-foreground focus:outline-none focus:border-primary text-xs"
            />
          </div>
          <div>
            <label className="block text-muted font-medium mb-1">Jumlah Batang Input *</label>
            <input
              type="number"
              min="1"
              required
              value={form.inputPieces}
              onChange={(e) => onChange({ inputPieces: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-surface-raised border border-border-default rounded-md text-foreground focus:outline-none focus:border-primary text-xs"
            />
          </div>
        </div>
      </div>

      <div className="p-3 bg-surface-raised/50 border border-border-subtle rounded-lg space-y-3">
        <div className="font-semibold text-foreground">Hasil Olahan (Output)</div>
        <div>
          <label className="block text-muted font-medium mb-1">Produk Hasil Gergaji *</label>
          <ProductSuggestionCombobox
            value={form.outputProduct}
            onChange={(p) => onChange({ outputProduct: p })}
            suggestions={productSuggestions}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-muted font-medium mb-1">Volume Output (m3) *</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              required
              value={form.outputVolumeM3}
              onChange={(e) => onChange({ outputVolumeM3: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-surface-raised border border-border-default rounded-md text-foreground focus:outline-none focus:border-primary text-xs"
            />
          </div>
          <div>
            <label className="block text-muted font-medium mb-1">Jumlah Batang / Lembar *</label>
            <input
              type="number"
              min="0"
              required
              value={form.outputPieces}
              onChange={(e) => onChange({ outputPieces: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-surface-raised border border-border-default rounded-md text-foreground focus:outline-none focus:border-primary text-xs"
            />
          </div>
        </div>
      </div>
    </>
  );
}
