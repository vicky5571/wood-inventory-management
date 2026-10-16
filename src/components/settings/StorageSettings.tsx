'use client';

import React from 'react';
import type { AppSettings } from '@/src/types';
import { Warehouse, Box, MapPin, CheckCircle2 } from 'lucide-react';

export function StorageSettings({ settings }: { settings: AppSettings }) {
  const KAVLINGS = [
    { code: 'KAV-01', location: 'TPK-Timur', capacityM3: 50, currentM3: 14.65, status: 'Aktif' },
    { code: 'KAV-02', location: 'TPK-Utara', capacityM3: 60, currentM3: 17.85, status: 'Aktif' },
    { code: 'KAV-03', location: 'TPK-Barat', capacityM3: 40, currentM3: 12.80, status: 'Aktif' },
    { code: 'KAV-04', location: 'TPK-Selatan', capacityM3: 45, currentM3: 9.80, status: 'Aktif' },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      {/* Facility Metadata Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>{settings.yardName}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                {settings.yardCode}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Tempat Penimbunan Kayu (TPK) Operasional Pengeringan & Logistik Bahan Baku
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <span>Zona Industri Pabrik Kayu Utama</span>
        </div>
      </div>

      {/* Kavling Stacking Lots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {KAVLINGS.map((k) => {
          const occupancyPct = ((k.currentM3 / k.capacityM3) * 100).toFixed(1);

          return (
            <div
              key={k.code}
              className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    {k.code}
                  </span>
                  <span className="text-xs font-medium text-gray-600">{k.location}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {k.status}
                </span>
              </div>

              {/* Occupancy bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-gray-600">
                  <span>Terisi: {k.currentM3} m³</span>
                  <span>Kapasitas: {k.capacityM3} m³</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    style={{ width: `${occupancyPct}%` }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
                <div className="text-right text-[10px] font-mono text-gray-400">
                  Okupansi: {occupancyPct}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
