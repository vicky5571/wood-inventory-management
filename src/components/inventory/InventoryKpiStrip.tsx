'use client';

import React from 'react';
import type { LotStockBalance } from '@/src/types/index';
import { Layers, Warehouse, Trees, Archive } from 'lucide-react';

export interface InventoryKpiStripProps {
  lots: LotStockBalance[];
}

export function InventoryKpiStrip({ lots }: InventoryKpiStripProps) {
  const activeLots = lots.filter((l) => l.remainingVolumeM3 > 0);
  const depletedLots = lots.filter((l) => l.remainingVolumeM3 <= 0);

  const totalRemainingVolumeM3 = Number(
    activeLots.reduce((acc, l) => acc + (Number(l.remainingVolumeM3) || 0), 0).toFixed(4)
  );

  const totalRemainingPieces = activeLots.reduce(
    (acc, l) => acc + (Number(l.remainingPieces) || 0),
    0
  );

  const cards = [
    {
      title: 'Kavling Aktif',
      sub: '在库库位',
      value: `${activeLots.length} Lot`,
      icon: Warehouse,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      title: 'Total Sisa Volume',
      sub: '剩余总材积',
      value: `${totalRemainingVolumeM3.toFixed(4)} m³`,
      icon: Trees,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Total Sisa Batang',
      sub: '剩余总根数',
      value: `${totalRemainingPieces.toLocaleString('id-ID')} btg`,
      icon: Layers,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      title: 'Kavling Habis',
      sub: '已清空库位',
      value: `${depletedLots.length} Lot`,
      icon: Archive,
      color: 'text-gray-600 bg-gray-50 border-gray-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">
                {card.title} <span className="text-[10px] text-gray-400">({card.sub})</span>
              </span>
              <div className={`p-1.5 rounded-lg border ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg font-black font-mono text-gray-950 tracking-tight">
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
