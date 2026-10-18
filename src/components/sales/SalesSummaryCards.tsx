'use client';

import React from 'react';
import type { WoodSalesRecord } from '@/src/types/index';
import { TrendingUp, Layers, DollarSign, Clock } from 'lucide-react';

export interface SalesSummaryCardsProps {
  sales: WoodSalesRecord[];
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function SalesSummaryCards({ sales }: SalesSummaryCardsProps) {
  const totalVolume = sales.reduce((acc, s) => acc + (Number(s.volumeM3) || 0), 0);
  const totalPieces = sales.reduce((acc, s) => acc + (Number(s.pieces) || 0), 0);
  const totalOmzet = sales.reduce((acc, s) => acc + (Number(s.totalPrice) || 0), 0);
  const unpaidReceivables = sales
    .filter((s) => s.paymentStatus !== 'PAID')
    .reduce((acc, s) => acc + (Number(s.totalPrice) || 0), 0);

  const cards = [
    {
      title: 'Volume Terjual',
      sub: '出库总材积',
      value: `${totalVolume.toFixed(4)} m³`,
      icon: TrendingUp,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Batang Keluar',
      sub: '出库总根数',
      value: `${totalPieces.toLocaleString('id-ID')} btg`,
      icon: Layers,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      title: 'Total Omzet',
      sub: '销售总额',
      value: formatRupiah(totalOmzet),
      icon: DollarSign,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      title: 'Piutang Belum Lunas',
      sub: '未收账款',
      value: formatRupiah(unpaidReceivables),
      icon: Clock,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
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
            <p className="text-lg font-black font-mono text-gray-950 tracking-tight">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}

