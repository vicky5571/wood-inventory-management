'use client';

import React from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { CreditCard } from 'lucide-react';

export interface RecordFinancialSectionProps {
  form: Partial<WoodReceivingRecord>;
  setForm: React.Dispatch<React.SetStateAction<Partial<WoodReceivingRecord>>>;
}

export function RecordFinancialSection({
  form,
  setForm,
}: RecordFinancialSectionProps) {
  return (
    <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4.5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-lg bg-[#ffc908] text-[#101828] text-xs font-bold flex items-center justify-center shadow-2xs">
          4
        </span>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#101828] uppercase tracking-wider">
          <CreditCard className="w-4 h-4 text-gray-500" />
          <span>Harga Kayu, Ongkir & Potongan Pajak (货款、运费与税金)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        <div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
            Harga Kayu / m³ (均价 IDR)
          </label>
          <input
            type="number"
            min="0"
            value={form.timberPricePerM3 ?? 0}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                timberPricePerM3: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
            Tarif PPh Kayu % (税率 0.5% / 1.5%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.timberPphRate ?? 0.5}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                timberPphRate: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
            Tarif Ongkir / m³ (运费单价 IDR)
          </label>
          <input
            type="number"
            min="0"
            value={form.freightRatePerM3 ?? 0}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                freightRatePerM3: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
            Potongan PPh Ongkir (运费税 IDR)
          </label>
          <input
            type="number"
            min="0"
            value={form.freightPphAmount ?? 0}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                freightPphAmount: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
            Broker / Komisi (中介费 IDR)
          </label>
          <input
            type="number"
            min="0"
            value={form.brokerFee ?? 0}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                brokerFee: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
          />
        </div>
      </div>
    </div>
  );
}
