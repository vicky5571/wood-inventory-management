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
  const [alarmVolumeM3, setAlarmVolumeM3] = useState(settings.discrepancyAlarmVolumeM3 ?? 1.5);
  const [alarmPercent, setAlarmPercent] = useState(settings.discrepancyAlarmPercent ?? settings.acceptableDiscrepancyThresholdPct ?? 2.0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;

    onSave({
      defaultTimberPphRate: Number(timberTax),
      defaultFreightPphRate: Number(freightTax),
      defaultBrokerFee: Number(brokerFee),
      discrepancyAlarmVolumeM3: Number(alarmVolumeM3),
      discrepancyAlarmPercent: Number(alarmPercent),
      acceptableDiscrepancyThresholdPct: Number(alarmPercent),
    });

    toast.success(
      'Pengaturan Pajak & Alarm Disimpan (税务与告警配置已更新)',
      `PPh 22: ${timberTax}% • PPh 23: ${freightTax}% • Alarm: >${alarmVolumeM3} m³ atau >${alarmPercent}%`
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

        {/* Ambang Alarm Volume m³ */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <span>Ambang Alarm Volume (m³)</span>
            <span className="text-[10px] text-gray-400 font-normal">(亏损体积告警阈值)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="50"
              disabled={!canWrite}
              value={alarmVolumeM3}
              onChange={(e) => setAlarmVolumeM3(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold border border-gray-200 rounded-xl px-3 py-2 text-gray-900 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition disabled:opacity-60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">m³</span>
          </div>
          <span className="text-[10px] text-gray-500">
            Alarm aktif jika selisih minus dan defisit fisik melebihi nilai ini (default: 1.5 m³).
          </span>
        </div>

        {/* Ambang Alarm Persentase % */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <span>Ambang Alarm Persentase (%)</span>
            <span className="text-[10px] text-gray-400 font-normal">(亏损比例告警阈值)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="50"
              disabled={!canWrite}
              value={alarmPercent}
              onChange={(e) => setAlarmPercent(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold border border-gray-200 rounded-xl px-3 py-2 text-gray-900 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition disabled:opacity-60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">%</span>
          </div>
          <span className="text-[10px] text-gray-500">
            Alarm aktif jika selisih minus dan defisit persentase melebihi nilai ini (default: 2.0%).
          </span>
        </div>
      </div>

      {/* Explanatory OR threshold note */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[11px]">
          <p className="font-semibold text-amber-950">
            Aturan Alarm Diskrepansi (OR Gate / 告警触发逻辑):
          </p>
          <p className="text-amber-800">
            Alarm merah menyala <strong>hanya jika</strong> selisih bernilai <strong>negatif</strong> (penyusutan fisik) <strong>DAN</strong> melebihi salah satu batas: <code>|Δ vol| &gt; {alarmVolumeM3} m³</code> <em>atau</em> <code>|% susut| &gt; {alarmPercent}%</code>.
          </p>
          <p className="text-amber-700/90 text-[10px]">
            Surplus fisik (tally &gt; surat jalan) ditampilkan dengan warna biru netral dan tidak pernah memicu alarm.
          </p>
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
