import React from 'react';
import { classifyDiscrepancy } from '@/src/utils/timber-calc';
import { TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

export function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function renderDiscrepancyBadge(diff: number, unit: string, isInteger: boolean = false) {
  const status = classifyDiscrepancy(diff);
  const absVal = isInteger ? Math.abs(diff).toString() : Math.abs(diff).toFixed(2);

  if (status === 'match') {
    return (
      <span className="inline-flex items-center gap-1 font-bold font-mono tabular-nums text-xs mt-0.5 text-slate-600">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        {isInteger ? '0' : '0.00'} {unit}
      </span>
    );
  }

  const isSurplus = diff > 0;
  return (
    <span className={`inline-flex items-center gap-1 font-bold font-mono tabular-nums text-xs mt-0.5 ${isSurplus ? 'text-blue-600' : 'text-[#ed1c24]'}`}>
      {isSurplus ? <TrendingUp className="w-3.5 h-3.5 shrink-0 text-blue-600" /> : <TrendingDown className="w-3.5 h-3.5 shrink-0 text-[#ed1c24]" />}
      {isSurplus ? '+' : '-'}{absVal} {unit}
    </span>
  );
}

export function StatusPill({
  text,
  variant,
  icon: Icon,
  pulse = false,
}: {
  text: string;
  variant: 'emerald' | 'rose' | 'amber' | 'blue' | 'purple';
  icon?: React.ComponentType<{ className?: string }>;
  pulse?: boolean;
}) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/80',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${styles}`}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 animate-pulse" />}
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {text}
    </span>
  );
}

export function SubMetricBox({
  title,
  children,
  isRose = false,
}: {
  title: string;
  children: React.ReactNode;
  isRose?: boolean;
}) {
  return (
    <div className={`rounded-xl px-3 py-1.5 border flex flex-col justify-center ${
      isRose ? 'bg-rose-50/60 border-rose-100/80 text-rose-700' : 'bg-gray-50/80 border-gray-100 text-slate-600'
    }`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 leading-tight">{title}</span>
      <div className="mt-0.5 leading-tight">{children}</div>
    </div>
  );
}
