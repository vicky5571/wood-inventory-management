'use client';

import React from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { TallyDimensionCalculator } from './TallyDimensionCalculator';
import { Scale } from 'lucide-react';

export interface RecordMeasurementSectionProps {
  form: Partial<WoodReceivingRecord>;
  setForm: React.Dispatch<React.SetStateAction<Partial<WoodReceivingRecord>>>;
}

export function RecordMeasurementSection({
  form,
  setForm,
}: RecordMeasurementSectionProps) {
  return (
    <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4.5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-lg bg-[#ffc908] text-[#101828] text-xs font-bold flex items-center justify-center shadow-2xs">
          3
        </span>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#101828] uppercase tracking-wider">
          <Scale className="w-4 h-4 text-gray-500" />
          <span>Pengukuran Fisik & Volume (送货 vs 检尺)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Batang Surat Jalan (送货根数)
          </label>
          <input
            type="number"
            min="0"
            value={form.deliveredPieces ?? 0}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                deliveredPieces: parseInt(e.target.value, 10) || 0,
              }))
            }
            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Vol Surat Jalan m³ (送货立方)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.deliveredVolumeM3 ?? 0}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                deliveredVolumeM3: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
          />
        </div>
        <div className="bg-[#ffc908]/10 p-2.5 rounded-xl border border-[#ffc908]/30">
          <label className="block text-[11px] font-bold text-[#101828] mb-1">
            Batang Tally Fisik (检尺根数) <span className="text-[#ed1c24]">*</span>
          </label>
          <input
            type="number"
            required
            min="0"
            value={form.tallyPieces ?? 0}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                tallyPieces: parseInt(e.target.value, 10) || 0,
              }))
            }
            className="w-full text-xs px-3 py-2 bg-white border border-[#ffc908] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] font-mono tabular-nums font-bold"
          />
        </div>
        <div className="bg-[#ffc908]/10 p-2.5 rounded-xl border border-[#ffc908]/30">
          <label className="block text-[11px] font-bold text-[#101828] mb-1">
            Volume Tally m³ (检尺立方) <span className="text-[#ed1c24]">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            required
            min="0"
            value={form.tallyVolumeM3 ?? 0}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                tallyVolumeM3: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full text-xs px-3 py-2 bg-white border border-[#ffc908] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] font-mono tabular-nums font-bold"
          />
        </div>
      </div>

      {/* Dimensional Calculation Helper */}
      <TallyDimensionCalculator
        tallyPieces={form.tallyPieces}
        onApplyVolume={(vol) => setForm((prev) => ({ ...prev, tallyVolumeM3: vol }))}
      />
    </div>
  );
}
