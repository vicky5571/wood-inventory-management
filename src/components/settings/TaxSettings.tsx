'use client';

import React, { useState } from 'react';
import type { AppSettings } from '@/src/types';
import { toast } from '@/src/utils/toast-store';
import { Percent, Wallet, AlertCircle, Save, ShieldCheck } from 'lucide-react';

export function TaxSettings({
  settings,
  canWrite = true,
  onSave,
}: {
  settings: AppSettings;
  canWrite?: boolean;
  onSave: (updated: Partial<AppSettings>) => void;
}) {
  const [timberTax, setTimberTax] = useState(settings.defaultTimberPphRate);
  const [freightTax, setFreightTax] = useState(settings.defaultFreightPphRate);
  const [brokerFee, setBrokerFee] = useState(settings.defaultBrokerFee);
  const [tolerancePct, setTolerancePct] = useState(settings.acceptableDiscrepancyThresholdPct);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;

    onSave({
      defaultTimberPphRate: Number(timberTax),
      defaultFreightPphRate: Number(freightTax),
      defaultBrokerFee: Number(brokerFee),
      acceptableDiscrepancyThresholdPct: Number(tolerancePct),
    });

    toast.success(
      'Pengaturan Pajak Disimpan (税务配置已更新)',
      `PPh 22: ${timberTax}% • PPh 23: ${freightTax}% • Toleransi: ${tolerancePct}%`
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-6 max-w-3xl">
      <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-600" />
            <span>Ketentuan Pajak & Toleransi Biaya (税务预设与公差标准)</span>
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Konfigurasi tarif pemotongan pajak penghasilan komoditas kehutanan dan batasan wajar penyusutan fisik kayu.
          </p>
        </div>

        {!canWrite && (
          <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
            Mode Hanya Baca (Read-Only)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Timber PPh Rate */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <span>Tarif Default PPh 22 Bahan Kayu (%)</span>
            <span className="text-[10px] text-gray-400 font-normal">(木材预扣税率)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              disabled={!canWrite}
              value={timberTax}
              onChange={(e) => setTimberTax(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold border border-gray-200 rounded-xl px-3 py-2 text-gray-900 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition disabled:opacity-60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">%</span>
          </div>
          <span className="text-[10px] text-gray-500">
            Standar PPh 22 komoditas hasil hutan Indonesia: 0.5% (NPWP aktif).
          </span>
        </div>

        {/* Freight PPh Rate */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <span>Tarif Default PPh 23 Ongkir Angkutan (%)</span>
            <span className="text-[10px] text-gray-400 font-normal">(运费预扣税率)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              disabled={!canWrite}
              value={freightTax}
              onChange={(e) => setFreightTax(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold border border-gray-200 rounded-xl px-3 py-2 text-gray-900 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition disabled:opacity-60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">%</span>
          </div>
          <span className="text-[10px] text-gray-500">
            Standar PPh 23 jasa sewa ekspedisi/truk: 2.0%.
          </span>
        </div>

        {/* Broker Default Fee */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <span>Preset Komisi Broker Standar (Rp)</span>
            <span className="text-[10px] text-gray-400 font-normal">(居间服务费预设)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="50000"
              min="0"
              disabled={!canWrite}
              value={brokerFee}
              onChange={(e) => setBrokerFee(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold border border-gray-200 rounded-xl px-3 py-2 text-gray-900 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition disabled:opacity-60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-400">IDR</span>
          </div>
          <span className="text-[10px] text-gray-500">
            Nilai awal otomatis saat membuat entri baru penerimaan kayu.
          </span>
        </div>

        {/* Discrepancy Tolerance Pct */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <span>Ambang Toleransi Selisih Fisik (%)</span>
            <span className="text-[10px] text-gray-400 font-normal">(合理检尺收缩公差)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="10"
              disabled={!canWrite}
              value={tolerancePct}
              onChange={(e) => setTolerancePct(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold border border-gray-200 rounded-xl px-3 py-2 text-gray-900 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition disabled:opacity-60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">%</span>
          </div>
          <span className="text-[10px] text-gray-500">
            Persentase deviasi fisik di bawah nilai ini dikategorikan wajar (natural shrinkage).
          </span>
        </div>
      </div>

      {canWrite && (
        <div className="flex justify-end pt-3 border-t border-gray-100">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white text-xs font-bold shadow-xs hover:shadow transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan (保存设置)</span>
          </button>
        </div>
      )}
    </form>
  );
}
