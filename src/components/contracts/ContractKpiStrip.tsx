'use client';

import React from 'react';
import type { ContractWithDetails } from '@/src/types/index';
import { FileText, Trees, DollarSign, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface ContractKpiStripProps {
  contracts: ContractWithDetails[];
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function ContractKpiStrip({ contracts }: ContractKpiStripProps) {
  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');
  const criticalContracts = contracts.filter(
    (c) => (c.summary.isNearExpiry || c.summary.isOverdue) && c.summary.remainingVolumeM3 > 0
  );

  const totalRemainingVolumeM3 = contracts.reduce(
    (acc, c) => acc + (c.summary.remainingVolumeM3 || 0),
    0
  );

  const totalContractValue = contracts.reduce(
    (acc, c) => acc + (c.totalContractValueIDR || 0),
    0
  );

  const totalPaid = contracts.reduce(
    (acc, c) => acc + (c.summary.totalPaidIDR || 0),
    0
  );

  const cards = [
    {
      title: 'Kontrak Aktif',
      sub: '有效合同',
      value: `${activeContracts.length} Kontrak`,
      icon: FileText,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      title: 'Sisa Stok Kontrak',
      sub: '未入库材积',
      value: `${totalRemainingVolumeM3.toFixed(4)} m³`,
      icon: Trees,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Total Nilai Kontrak',
      sub: '合同总金额',
      value: formatRupiah(totalContractValue),
      icon: DollarSign,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      title: 'Total Pembayaran',
      sub: '已付金额',
      value: formatRupiah(totalPaid),
      icon: CheckCircle2,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      title: 'Kontrak Kritis',
      sub: '临期/逾期',
      value: `${criticalContracts.length} Kontrak`,
      icon: AlertTriangle,
      color: criticalContracts.length > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-gray-600 bg-gray-50 border-gray-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
