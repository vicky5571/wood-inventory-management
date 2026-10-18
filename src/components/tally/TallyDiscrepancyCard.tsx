'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export interface TallyDiscrepancyCardProps {
  deliveredVolumeM3: number;
  deliveredPieces: number;
  tallyVolumeM3: number;
  tallyPieces: number;
}

export function TallyDiscrepancyCard({
  deliveredVolumeM3,
  deliveredPieces,
  tallyVolumeM3,
  tallyPieces,
}: TallyDiscrepancyCardProps) {
  const { volumeDiff, pieceDiff, status, percentMatch } = useMemo(() => {
    const vDiff = Number((tallyVolumeM3 - deliveredVolumeM3).toFixed(4));
    const pDiff = tallyPieces - deliveredPieces;

    let stat: 'match' | 'surplus' | 'shortage' = 'match';
    if (vDiff > 0.05) stat = 'surplus';
    else if (vDiff < -0.05) stat = 'shortage';

    const pct = deliveredVolumeM3 > 0
      ? Math.min(100, Math.max(0, Math.round((tallyVolumeM3 / deliveredVolumeM3) * 100)))
      : 100;

    return { volumeDiff: vDiff, pieceDiff: pDiff, status: stat, percentMatch: pct };
  }, [deliveredVolumeM3, deliveredPieces, tallyVolumeM3, tallyPieces]);

  const config = {
    match: {
      border: 'border-emerald-300 bg-emerald-50/80 text-emerald-950',
      badge: 'bg-emerald-600 text-white',
      badgeLabel: 'Cocok (匹配)',
      barColor: 'bg-emerald-600',
      icon: CheckCircle2,
    },
    surplus: {
      border: 'border-blue-300 bg-blue-50/80 text-blue-950',
      badge: 'bg-blue-600 text-white',
      badgeLabel: 'Surplus (超出)',
      barColor: 'bg-blue-600',
      icon: TrendingUp,
    },
    shortage: {
      border: 'border-rose-300 bg-rose-50/80 text-rose-950',
      badge: 'bg-rose-600 text-white',
      badgeLabel: 'Penyusutan (亏损)',
      barColor: 'bg-rose-600',
      icon: TrendingDown,
    },
  }[status];

  const StatusIcon = config.icon;

  return (
    <div className={`p-3.5 rounded-2xl border-2 transition-all shadow-xs space-y-2.5 ${config.border}`}>
      {/* Header Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <StatusIcon className="w-4 h-4 shrink-0" />
          <span>Hasil Ukur Tally vs Surat Jalan</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${config.badge}`}>
          {config.badgeLabel}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-semibold text-gray-600">
          <span>Kesesuaian Volume Fisik:</span>
          <span className="font-mono font-bold text-gray-900">{percentMatch}%</span>
        </div>
        <div className="w-full bg-gray-200/80 h-2 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-300 ${config.barColor}`} style={{ width: `${percentMatch}%` }} />
        </div>
      </div>

      {/* Numerical Metrics Comparison */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/5 text-[11px]">
        <div className="p-2 rounded-xl bg-white/70 border border-black/5">
          <span className="text-[9px] text-gray-500 block">Surat Jalan (送货单):</span>
          <p className="font-mono font-bold text-gray-900">{deliveredPieces} btg • {deliveredVolumeM3.toFixed(2)} m³</p>
        </div>
        <div className="p-2 rounded-xl bg-white/70 border border-black/5">
          <span className="text-[9px] text-gray-500 block">Tally Fisik (检尺结果):</span>
          <p className="font-mono font-bold text-gray-900">{tallyPieces} btg • {tallyVolumeM3.toFixed(2)} m³</p>
        </div>
      </div>

      {/* Discrepancy Differential */}
      <div className="flex justify-between items-center text-[10px] px-1 font-mono">
        <span>Selisih Batang: <strong className={pieceDiff < 0 ? 'text-rose-700' : 'text-gray-900'}>{pieceDiff > 0 ? `+${pieceDiff}` : pieceDiff} btg</strong></span>
        <span>Selisih Volume: <strong className={volumeDiff < 0 ? 'text-rose-700' : 'text-gray-900'}>{volumeDiff > 0 ? `+${volumeDiff.toFixed(4)}` : volumeDiff.toFixed(4)} m³</strong></span>
      </div>
    </div>
  );
}
