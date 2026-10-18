'use client';

import React, { useState, useMemo } from 'react';
import { Ruler, CircleDot, Plus, Minus, Check, Sparkles } from 'lucide-react';
import { calculateCubicFromCentimeters, calculateRoundLogVolumeM3 } from '../../utils/timber-calc.ts';

export interface TallyMeasurementResult {
  volumeM3: number;
  pieces: number;
  measurementType: 'SAWN' | 'ROUND';
  dimensionSummary: string;
}

export interface TallyMeasurementPadProps {
  onApplyMeasurement: (result: TallyMeasurementResult) => void;
  initialPieces?: number;
}

export function TallyMeasurementPad({ onApplyMeasurement, initialPieces = 1 }: TallyMeasurementPadProps) {
  const [mode, setMode] = useState<'SAWN' | 'ROUND'>('SAWN');
  const [thicknessCm, setThicknessCm] = useState<number>(20);
  const [widthCm, setWidthCm] = useState<number>(25);
  const [lengthCm, setLengthCm] = useState<number>(400);
  const [diameterCm, setDiameterCm] = useState<number>(40);
  const [lengthM, setLengthM] = useState<number>(4);
  const [pieces, setPieces] = useState<number>(Math.max(1, initialPieces));
  const [applied, setApplied] = useState(false);

  const calculatedVolumeM3 = useMemo(() => {
    try {
      return mode === 'SAWN'
        ? calculateCubicFromCentimeters(thicknessCm, widthCm, lengthCm, pieces)
        : calculateRoundLogVolumeM3(diameterCm, lengthM, pieces);
    } catch {
      return 0;
    }
  }, [mode, thicknessCm, widthCm, lengthCm, diameterCm, lengthM, pieces]);

  const dimensionSummary = useMemo(() => {
    return mode === 'SAWN' ? `${thicknessCm}×${widthCm}×${lengthCm} cm` : `Ø${diameterCm}cm × ${lengthM}m`;
  }, [mode, thicknessCm, widthCm, lengthCm, diameterCm, lengthM]);

  const handleApply = () => {
    onApplyMeasurement({ volumeM3: calculatedVolumeM3, pieces, measurementType: mode, dimensionSummary });
    setApplied(true);
    setTimeout(() => setApplied(false), 1800);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-400 p-4 shadow-xs space-y-3">
      {/* Mode Switcher */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
          <Ruler className="w-4 h-4 text-amber-600" />
          <span>Ukur Batang (检尺)</span>
        </span>
        <div className="inline-flex p-0.5 bg-gray-100 rounded-xl text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setMode('SAWN')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              mode === 'SAWN' ? 'bg-[#ffc908] text-[#101828] shadow-2xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Balok / Sawn (成材)
          </button>
          <button
            type="button"
            onClick={() => setMode('ROUND')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              mode === 'ROUND' ? 'bg-[#ffc908] text-[#101828] shadow-2xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <CircleDot className="w-3 h-3 inline mr-1" />
            Log Bulat (原木)
          </button>
        </div>
      </div>

      {/* Sawn Timber Dimension Inputs */}
      {mode === 'SAWN' ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Tebal (cm)', val: thicknessCm, set: setThicknessCm },
              { label: 'Lebar (cm)', val: widthCm, set: setWidthCm },
              { label: 'Panjang (cm)', val: lengthCm, set: setLengthCm },
            ].map((f, i) => (
              <div key={i}>
                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">{f.label}</label>
                <input
                  type="number"
                  value={f.val || ''}
                  onChange={(e) => f.set(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-xs focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto text-[9px] font-semibold text-gray-600">
            <span className="text-gray-400 py-1">Preset:</span>
            {[{ t: 20, w: 25, l: 400 }, { t: 15, w: 20, l: 400 }, { t: 12, w: 15, l: 300 }].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => { setThicknessCm(p.t); setWidthCm(p.w); setLengthCm(p.l); }}
                className="px-2 py-0.5 bg-gray-100 hover:bg-amber-100 rounded-md border border-gray-200 transition cursor-pointer"
              >
                {p.t}×{p.w}×{p.l}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Round Log Dimension Inputs */
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Diameter Rata-rata (cm)</label>
              <input
                type="number"
                value={diameterCm || ''}
                onChange={(e) => setDiameterCm(Math.max(0, Number(e.target.value) || 0))}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-xs focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Panjang Batang (m)</label>
              <input
                type="number"
                step="0.1"
                value={lengthM || ''}
                onChange={(e) => setLengthM(Math.max(0, Number(e.target.value) || 0))}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-xs focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto text-[9px] font-semibold text-gray-600">
            <span className="text-gray-400 py-1">Preset:</span>
            {[{ d: 30, l: 4 }, { d: 40, l: 4 }, { d: 50, l: 4 }].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => { setDiameterCm(p.d); setLengthM(p.l); }}
                className="px-2 py-0.5 bg-gray-100 hover:bg-amber-100 rounded-md border border-gray-200 transition cursor-pointer"
              >
                Ø{p.d}cm × {p.l}m
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Piece Counter & Steppers */}
      <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-gray-700">Jumlah Batang Fisik:</span>
          <span className="font-mono font-black text-amber-950 text-sm">{pieces} btg</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '+1', delta: 1, cls: 'bg-white text-gray-800' },
            { label: '+5', delta: 5, cls: 'bg-white text-gray-800' },
            { label: '+10', delta: 10, cls: 'bg-[#ffc908] text-[#101828] font-black' },
            { label: '-1', delta: -1, cls: 'bg-rose-50 text-rose-700 border-rose-200', disabled: pieces <= 1 },
          ].map((btn, i) => (
            <button
              key={i}
              type="button"
              disabled={btn.disabled}
              onClick={() => setPieces((prev) => Math.max(1, prev + btn.delta))}
              className={`py-2 border border-gray-300 rounded-xl font-bold text-xs active:scale-95 transition cursor-pointer shadow-2xs flex items-center justify-center gap-1 disabled:opacity-40 ${btn.cls}`}
            >
              {btn.delta > 0 ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />} {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Calculated Volume Preview & Apply Button */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <span className="text-[10px] text-gray-500 block">Total Kubikasi Hasil Ukur:</span>
          <span className="text-base font-mono font-black text-gray-900">{calculatedVolumeM3.toFixed(4)} m³</span>
        </div>
        <button
          type="button"
          onClick={handleApply}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
            applied ? 'bg-emerald-600 text-white' : 'bg-[#101828] text-white hover:bg-gray-800'
          }`}
        >
          {applied ? <Check className="w-4 h-4 text-emerald-200" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
          <span>{applied ? 'Diterapkan!' : 'Terapkan (应用)'}</span>
        </button>
      </div>
    </div>
  );
}
