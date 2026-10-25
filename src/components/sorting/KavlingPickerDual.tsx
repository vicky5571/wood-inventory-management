'use client';

/**
 * src/components/sorting/KavlingPickerDual.tsx
 *
 * Side-by-side dual kavling picker for stock redistribution between source and target lots.
 */

import React from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { YardSelect } from '../ledger/YardSelect.tsx';
import { KavlingSelect } from '../ledger/KavlingSelect.tsx';

export interface KavlingPickerDualProps {
  sourceYard: string;
  onSourceYardChange: (yard: string) => void;
  sourceKavling: string;
  onSourceKavlingChange: (kavling: string) => void;
  targetYard: string;
  onTargetYardChange: (yard: string) => void;
  targetKavling: string;
  onTargetKavlingChange: (kavling: string) => void;
}

export function KavlingPickerDual({
  sourceYard,
  onSourceYardChange,
  sourceKavling,
  onSourceKavlingChange,
  targetYard,
  onTargetYardChange,
  targetKavling,
  onTargetKavlingChange,
}: KavlingPickerDualProps) {
  const isSelfTransfer =
    sourceYard.trim().toLowerCase() === targetYard.trim().toLowerCase() &&
    sourceKavling.trim().toLowerCase() === targetKavling.trim().toLowerCase() &&
    sourceYard.trim() !== '' &&
    sourceKavling.trim() !== '';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-center">
        {/* Source Lot */}
        <div className="p-3.5 bg-amber-50/50 border border-amber-200/70 rounded-xl space-y-2.5">
          <div className="text-xs font-bold text-amber-950 flex items-center justify-between">
            <span>Kavling Asal (Sumber)</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Stok Berkurang
            </span>
          </div>
          <div>
            <label className="block text-[11px] text-gray-700 font-semibold mb-1">TPK Asal *</label>
            <YardSelect value={sourceYard} onChange={onSourceYardChange} />
          </div>
          <div>
            <label className="block text-[11px] text-gray-700 font-semibold mb-1">Nomor Kavling Asal *</label>
            <KavlingSelect selectedYard={sourceYard} value={sourceKavling} onChange={onSourceKavlingChange} />
          </div>
        </div>

        {/* Divider / Arrow */}
        <div className="flex justify-center md:py-0 py-1">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4 md:rotate-0 rotate-90" />
          </div>
        </div>

        {/* Target Lot */}
        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/70 rounded-xl space-y-2.5">
          <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
            <span>Kavling Tujuan (Penerima)</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Stok Bertambah
            </span>
          </div>
          <div>
            <label className="block text-[11px] text-gray-700 font-semibold mb-1">TPK Tujuan *</label>
            <YardSelect value={targetYard} onChange={onTargetYardChange} />
          </div>
          <div>
            <label className="block text-[11px] text-gray-700 font-semibold mb-1">Nomor Kavling Tujuan *</label>
            <KavlingSelect selectedYard={targetYard} value={targetKavling} onChange={onTargetKavlingChange} />
          </div>
        </div>
      </div>

      {isSelfTransfer && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>Kavling tujuan tidak boleh sama persis dengan kavling asal.</span>
        </div>
      )}
    </div>
  );
}
