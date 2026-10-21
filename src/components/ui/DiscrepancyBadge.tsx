'use client';

import React from 'react';
import type { DiscrepancyEvaluation } from '@/src/types';
import { evaluateDiscrepancy } from '@/src/utils/discrepancy';
import { Check, Info, Minus, AlertTriangle } from 'lucide-react';

export interface DiscrepancyBadgeProps {
  evaluation?: DiscrepancyEvaluation;
  tallyVolumeM3?: number;
  deliveredVolumeM3?: number;
  tallyPieces?: number;
  deliveredPieces?: number;
  volumeThresholdM3?: number;
  percentThreshold?: number;
  unit?: 'm³' | 'batang';
  size?: 'sm' | 'md';
  className?: string;
}

export function DiscrepancyBadge({
  evaluation: providedEvaluation,
  tallyVolumeM3 = 0,
  deliveredVolumeM3 = 0,
  tallyPieces = 0,
  deliveredPieces = 0,
  volumeThresholdM3 = 1.5,
  percentThreshold = 2.0,
  unit = 'm³',
  size = 'sm',
  className = '',
}: DiscrepancyBadgeProps) {
  const evalResult = providedEvaluation ?? evaluateDiscrepancy({
    tallyVolumeM3,
    deliveredVolumeM3,
    tallyPieces,
    deliveredPieces,
    volumeThresholdM3,
    percentThreshold,
  });

  const { severity, volumeDiscrepancyM3, volumeDiscrepancyPct, pieceDiscrepancy, isAlarm, reason } = evalResult;

  const isPieceUnit = unit === 'batang';
  const diffVal = isPieceUnit ? pieceDiscrepancy : volumeDiscrepancyM3;
  const formattedVal = isPieceUnit
    ? `${diffVal > 0 ? `+${diffVal}` : diffVal} btg`
    : `${diffVal > 0 ? `+${diffVal.toFixed(2)}` : diffVal.toFixed(2)} m³`;

  const sizeClasses = size === 'md'
    ? 'text-xs px-2.5 py-1 gap-1.5'
    : 'text-[10px] px-2 py-0.5 gap-1';

  if (severity === 'MATCH') {
    return (
      <span
        title={reason || 'Sesuai dengan dokumen (完全匹配)'}
        className={`inline-flex items-center font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200 select-none ${sizeClasses} ${className}`}
      >
        <Check className={size === 'md' ? 'w-3.5 h-3.5 text-gray-500' : 'w-3 h-3 text-gray-500'} />
        <span>Cocok</span>
      </span>
    );
  }

  if (severity === 'SURPLUS') {
    return (
      <span
        title={reason || `Surplus fisik ${formattedVal}`}
        className={`inline-flex items-center font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 select-none ${sizeClasses} ${className}`}
      >
        <Info className={size === 'md' ? 'w-3.5 h-3.5 text-blue-600' : 'w-3 h-3 text-blue-600'} />
        <span>{formattedVal} (surplus)</span>
      </span>
    );
  }

  if (severity === 'WITHIN_TOLERANCE') {
    return (
      <span
        title={reason || `Penyusutan ${formattedVal} dalam batas wajar`}
        className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-300 select-none ${sizeClasses} ${className}`}
      >
        <Minus className={size === 'md' ? 'w-3.5 h-3.5 text-amber-700' : 'w-3 h-3 text-amber-700'} />
        <span>{formattedVal} (toleransi)</span>
      </span>
    );
  }

  // ALARM
  return (
    <span
      title={reason || `Alarm penyusutan: ${formattedVal} (${volumeDiscrepancyPct}%)`}
      className={`inline-flex items-center font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-300 select-none ${sizeClasses} ${className}`}
    >
      <AlertTriangle className={size === 'md' ? 'w-3.5 h-3.5 text-rose-600 shrink-0' : 'w-3 h-3 text-rose-600 shrink-0'} />
      <span>{formattedVal} ({volumeDiscrepancyPct}%) ALARM</span>
    </span>
  );
}
