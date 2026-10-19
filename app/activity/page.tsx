'use client';

import React, { useState, useMemo } from 'react';
import { useActivityLog } from '@/src/hooks/useActivityLog';
import { ActivityTimeline } from '@/src/components/activity/ActivityTimeline';
import {
  History,
  ShieldCheck,
  Filter,
} from 'lucide-react';

export default function ActivityPage() {
  const { logs } = useActivityLog();
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    if (selectedAction === 'ALL') return logs;
    return logs.filter((l) => l.action === selectedAction);
  }, [logs, selectedAction]);

  const stats = useMemo(() => {
    const total = logs.length;
    const inbound = logs.filter((l) => l.action === 'RECORD_CREATED').length;
    const outbound = logs.filter((l) => l.action === 'SALE_CREATED').length;
    const changes = logs.filter((l) =>
      l.action === 'RECORD_UPDATED' ||
      l.action === 'SETTINGS_UPDATED' ||
      l.action === 'STORAGE_UPDATED' ||
      l.action === 'SUPPLIER_UPDATED'
    ).length;
    return { total, inbound, outbound, changes };
  }, [logs]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-purple-700 shrink-0" />
            <span>Jejak Audit Aktivitas & Transaksi (审计与操作日志)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Log kronologis immutable server untuk setiap penambahan data truk, penjualan, lokasi, dan konfigurasi sistem.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-xl shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Immutable Server Ledger (不可篡改)</span>
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Total Peristiwa
          </span>
          <span className="block text-xl font-bold font-mono text-gray-900 mt-1">
            {stats.total} Log
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Penerimaan Masuk
          </span>
          <span className="block text-xl font-bold font-mono text-emerald-700 mt-1">
            {stats.inbound} Event
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Penjualan Keluar
          </span>
          <span className="block text-xl font-bold font-mono text-indigo-700 mt-1">
            {stats.outbound} DO
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Pembaruan & Konfigurasi
          </span>
          <span className="block text-xl font-bold font-mono text-blue-700 mt-1">
            {stats.changes} Edit
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200/80 shadow-xs text-xs">
        <div className="flex items-center gap-1.5 px-2 text-gray-400 font-semibold text-[11px]">
          <Filter className="w-3.5 h-3.5" />
          <span>Kategori:</span>
        </div>

        {[
          { id: 'ALL', label: 'Semua (全部)' },
          { id: 'RECORD_CREATED', label: 'Penerimaan' },
          { id: 'SALE_CREATED', label: 'Penjualan' },
          { id: 'SETTINGS_UPDATED', label: 'Pengaturan' },
          { id: 'RECORD_UPDATED', label: 'Edit Penerimaan' },
          { id: 'RECORD_DELETED', label: 'Hapus Penerimaan' },
          { id: 'DEMO_RESET', label: 'Reset Data' },
        ].map((tab) => {
          const isSelected = selectedAction === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedAction(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                isSelected
                  ? 'bg-purple-50 text-purple-800 font-bold border border-purple-200/80 shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Timeline Stream */}
      <ActivityTimeline logs={filteredLogs} />
    </div>
  );
}
