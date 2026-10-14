'use client';

import React, { useState } from 'react';
import { Calculator, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateCubicFromCentimeters } from '@/src/utils/timber-calc.ts';

export function TallyDimensionCalculator({
  tallyPieces = 1,
  onApplyVolume,
}: {
  tallyPieces?: number;
  onApplyVolume: (volumeM3: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [thicknessCm, setThicknessCm] = useState<number>(20);
  const [widthCm, setWidthCm] = useState<number>(20);
  const [lengthCm, setLengthCm] = useState<number>(400);
  const [pieces, setPieces] = useState<number>(tallyPieces || 1);
  const [applied, setApplied] = useState(false);

  // Sync pieces when tallyPieces changes
  React.useEffect(() => {
    if (tallyPieces > 0) {
      setPieces(tallyPieces);
    }
  }, [tallyPieces]);

  const calculatedVolume = React.useMemo(() => {
    try {
      return calculateCubicFromCentimeters(
        Math.max(0, thicknessCm || 0),
        Math.max(0, widthCm || 0),
        Math.max(0, lengthCm || 0),
        Math.max(0, pieces || 0)
      );
    } catch {
      return 0;
    }
  }, [thicknessCm, widthCm, lengthCm, pieces]);

  const handleApply = () => {
    onApplyVolume(calculatedVolume);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <div className="mt-3 border border-amber-200/70 bg-amber-50/40 rounded-xl overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-semibold text-[#101828] hover:bg-amber-100/50 transition cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#ffc908] text-[#101828] flex items-center justify-center shrink-0">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <span>Kalkulator Kubikasi Fisik (检尺换算器: T × L × P ÷ 1,000,000)</span>
        </div>
        <div className="flex items-center gap-2">
          {calculatedVolume > 0 && (
            <span className="font-mono tabular-nums font-bold text-[#b38600]">
              {calculatedVolume.toFixed(4)} m³
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-3.5 border-t border-amber-200/50 bg-white flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">
                Tebal T (cm) 厚度
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={thicknessCm}
                onChange={(e) => setThicknessCm(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-[#ffc908]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">
                Lebar L (cm) 宽度
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={widthCm}
                onChange={(e) => setWidthCm(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-[#ffc908]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">
                Panjang P (cm) 长度
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={lengthCm}
                onChange={(e) => setLengthCm(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-[#ffc908]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">
                Batang (pcs) 根数
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={pieces}
                onChange={(e) => setPieces(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-[#ffc908]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-gray-500 text-[11px]">Hasil Kalkulasi:</span>
              <strong className="text-sm font-bold text-[#101828] tabular-nums">
                {calculatedVolume.toFixed(4)}
              </strong>
              <span className="text-gray-400 text-xs">m³</span>
            </div>

            <button
              type="button"
              onClick={handleApply}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                applied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#ffc908] hover:bg-[#f0bc00] text-[#101828] shadow-2xs'
              }`}
            >
              {applied ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{applied ? 'Diterapkan!' : 'Terapkan ke Volume Tally (应用)'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
