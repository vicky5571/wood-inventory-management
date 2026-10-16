'use client';

import React, { useState, useMemo } from 'react';
import { useActivityLog } from '@/src/hooks/useActivityLog';
import { useAuth } from '@/src/hooks/useAuth';
import { ActivityTimeline } from '@/src/components/activity/ActivityTimeline';
import type { ActivityActionType } from '@/src/types';
import {
  History,
  Trash2,
  RotateCcw,
  PlusCircle,
  Edit3,
  Filter,
} from 'lucide-react';

export default function ActivityPage() {
  const { logs, clearLogs, resetLogs } = useActivityLog();
  const { canWrite } = useAuth();
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    if (selectedAction === 'ALL') return logs;
    return logs.filter((l) => l.action === selectedAction);
  }, [logs, selectedAction]);

  const stats = useMemo(() => {
    const total = logs.length;
    const created = logs.filter((l) => l.action === 'RECORD_CREATED').length;
    const updated = logs.filter((l) => l.action === 'RECORD_UPDATED').length;
    const deleted = logs.filter((l) => l.action === 'RECORD_DELETED').length;
    return { total, created, updated, deleted };
  }, [logs]);

  const handleClear = () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat log aktivitas? (确定清空审计日志？)')) {
      clearLogs();
    }
  };

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
            Log kronologis setiap penambahan data truk, koreksi hasil tally, dan perubahan pengaturan sistem.
          </p>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition shadow-2xs cursor-pointer"
              title="Reset ke log awal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Reset Log Awal</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition shadow-2xs cursor-pointer"
              title="Kosongkan riwayat log"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Semua Log</span>
            </button>
          </div>
        )}
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
            Penerimaan Baru
          </span>
          <span className="block text-xl font-bold font-mono text-emerald-700 mt-1">
            {stats.created} Event
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Pembaruan Data
          </span>
          <span className="block text-xl font-bold font-mono text-blue-700 mt-1">
            {stats.updated} Edit
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Penghapusan
          </span>
          <span className="block text-xl font-bold font-mono text-rose-700 mt-1">
            {stats.deleted} Hapus
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
          { id: 'RECORD_CREATED', label: 'Penerimaan Baru' },
          { id: 'RECORD_UPDATED', label: 'Pembaruan Data' },
          { id: 'RECORD_DELETED', label: 'Penghapusan' },
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
