'use client';

import React from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { CreditCard, AlertTriangle } from 'lucide-react';

export interface RecordFinancialSectionProps {
  form: Partial<WoodReceivingRecord>;
  setForm: React.Dispatch<React.SetStateAction<Partial<WoodReceivingRecord>>>;
  hideTimberPricing?: boolean;
}

export const RecordFinancialSection = React.memo(function RecordFinancialSection({
  form,
  setForm,
  hideTimberPricing = false,
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
        {!hideTimberPricing && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-gray-700">
                  Harga Kayu / m³ (均价 IDR)
                </label>
                <span className="text-[10px] text-gray-400 font-normal">
                  (opsional / isi nanti)
                </span>
              </div>
              <input
                type="number"
                min="0"
                placeholder="Kosongkan jika belum ada harga"
                value={form.timberPricePerM3 ?? ''}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setForm((prev) => ({
                    ...prev,
                    timberPricePerM3: val === '' ? null : (parseFloat(val) || 0),
                  }));
                }}
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
          </>
        )}
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
          {((form.brokerFee ?? 0) > 0 && !form.brokerId) && (
            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-lg p-1.5 mt-1 font-medium leading-tight flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Komisi diisi tanpa broker terpilih. Pilih broker atau kosongkan komisi.</span>
            </p>
          )}
        </div>
      </div>

      {/* Payment Lifecycle & Accounts Payable Section */}
      <div className="mt-4 pt-3 border-t border-gray-200/80">
        <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <span>Status Pembayaran & Hutang (付款状态与应付账款)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Status Bayar (付款状态)
            </label>
            <select
              value={form.paymentStatus || 'UNPAID'}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  paymentStatus: e.target.value as 'UNPAID' | 'PARTIAL' | 'PAID',
                }))
              }
              className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-medium cursor-pointer"
            >
              <option value="UNPAID">Belum Bayar (未付)</option>
              <option value="PARTIAL">Sebagian (部分)</option>
              <option value="PAID">Lunas (已结清)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              No. Faktur / Invoice (发票号)
            </label>
            <input
              type="text"
              placeholder="e.g. INV-2026-001"
              value={form.invoiceNumber ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  invoiceNumber: e.target.value,
                }))
              }
              className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Tanggal Bayar (付款日期)
            </label>
            <input
              type="date"
              value={form.paymentDate ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  paymentDate: e.target.value,
                }))
              }
              className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Catatan Pembayaran (付款备注)
            </label>
            <input
              type="text"
              placeholder="e.g. Lunas Transfer Bank"
              value={form.paymentNotes ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  paymentNotes: e.target.value,
                }))
              }
              className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
