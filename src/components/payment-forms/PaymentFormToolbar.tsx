'use client';

/**
 * src/components/payment-forms/PaymentFormToolbar.tsx
 *
 * Filter toolbar for Payment Forms: week picker dropdown (Saturday),
 * status pills, supplier query, and generation trigger button.
 */

import React from 'react';
import { Calendar, Search, X, Sparkles, Filter } from 'lucide-react';
import { listRecentWeeks } from '../../utils/week-window.ts';
import type { PaymentFormStatus, PaymentFormFilterCriteria } from '../../types/index.ts';

interface PaymentFormToolbarProps {
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  filterCriteria: PaymentFormFilterCriteria;
  onFilterChange: (criteria: PaymentFormFilterCriteria) => void;
  onOpenGenerateModal: () => void;
  canWrite?: boolean;
}

const STATUS_PILLS: Array<{ value: PaymentFormStatus | 'ALL'; label: string; cn: string }> = [
  { value: 'ALL', label: 'Semua (全部)', cn: 'hover:bg-gray-100' },
  { value: 'DRAFT', label: 'Draft (草稿)', cn: 'hover:bg-gray-100' },
  { value: 'ISSUED', label: 'Issued (已开出)', cn: 'hover:bg-amber-50 hover:text-amber-800' },
  { value: 'PAID', label: 'Paid (已结清)', cn: 'hover:bg-emerald-50 hover:text-emerald-800' },
  { value: 'VOID', label: 'Void (已作废)', cn: 'hover:bg-rose-50 hover:text-rose-800' },
];

export function PaymentFormToolbar({
  selectedWeek,
  onWeekChange,
  filterCriteria,
  onFilterChange,
  onOpenGenerateModal,
  canWrite = true,
}: PaymentFormToolbarProps) {
  const recentWeeks = React.useMemo(() => listRecentWeeks(10), []);

  return (
    <div className="bg-white border border-gray-200/80 rounded-xl p-4 mb-5 shadow-xs flex flex-col gap-3.5">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Week Selector & Supplier Search */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Week Selector Dropdown */}
          <div className="relative min-w-[220px]">
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedWeek}
              onChange={(e) => onWeekChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#ffc908] cursor-pointer"
            >
              {recentWeeks.map((w) => (
                <option key={w.startDate} value={w.startDate}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterCriteria.searchQuery || ''}
              onChange={(e) => onFilterChange({ ...filterCriteria, searchQuery: e.target.value })}
              placeholder="Cari form, supplier, spesies..."
              className="w-full pl-8 pr-7 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#ffc908]"
            />
            {filterCriteria.searchQuery && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filterCriteria, searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Generate Forms Button */}
        {canWrite && (
          <button
            type="button"
            onClick={onOpenGenerateModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-lg shadow-xs transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Form Minggu Ini (生成付款单)</span>
          </button>
        )}
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-gray-100">
        <Filter className="w-3 h-3 text-gray-400 mr-1" />
        {STATUS_PILLS.map((pill) => {
          const isActive = (filterCriteria.status || 'ALL') === pill.value;
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => onFilterChange({ ...filterCriteria, status: pill.value })}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-gray-900 text-white font-semibold'
                  : `bg-gray-100/70 text-gray-600 ${pill.cn}`
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
