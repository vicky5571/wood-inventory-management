'use client';

import React from 'react';
import type { ActivityLogEntry } from '@/src/types';
import { formatActivityDescription } from '@/src/utils/activity-logger';
import {
  PlusCircle,
  Edit3,
  Trash2,
  RotateCcw,
  RefreshCw,
  Settings,
  Clock,
  User,
  Inbox,
} from 'lucide-react';

export function ActivityTimeline({ logs }: { logs: ActivityLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-gray-200/80 text-center flex flex-col items-center justify-center gap-3 text-gray-500">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
          <Inbox className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-800">Tidak Ada Aktivitas Ditemukan</h4>
          <p className="text-xs text-gray-500 mt-1">
            Belum ada catatan aktivitas yang sesuai dengan kriteria filter yang dipilih.
          </p>
        </div>
      </div>
    );
  }

  const getActionBadge = (action: ActivityLogEntry['action']) => {
    switch (action) {
      case 'RECORD_CREATED':
        return {
          icon: PlusCircle,
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
          label: 'Penerimaan Baru',
        };
      case 'RECORD_UPDATED':
        return {
          icon: Edit3,
          color: 'text-blue-700 bg-blue-50 border-blue-200/80',
          label: 'Pembaruan Data',
        };
      case 'RECORD_DELETED':
        return {
          icon: Trash2,
          color: 'text-rose-700 bg-rose-50 border-rose-200/80',
          label: 'Penghapusan',
        };
      case 'RECORD_RESTORED':
        return {
          icon: RotateCcw,
          color: 'text-amber-700 bg-amber-50 border-amber-200/80',
          label: 'Pemulihan (Undo)',
        };
      case 'DEMO_RESET':
        return {
          icon: RefreshCw,
          color: 'text-purple-700 bg-purple-50 border-purple-200/80',
          label: 'Reset Demonstrasi',
        };
      case 'SETTINGS_UPDATED':
        return {
          icon: Settings,
          color: 'text-slate-700 bg-slate-100 border-slate-200/80',
          label: 'Pengaturan Sistem',
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-700 bg-gray-50 border-gray-200',
          label: 'Aktivitas',
        };
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return iso;
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
      <div className="relative pl-6 border-l-2 border-gray-100 space-y-8">
        {logs.map((log) => {
          const badge = getActionBadge(log.action);
          const Icon = badge.icon;

          return (
            <div key={log.id} className="relative group">
              {/* Timeline Pin Dot */}
              <div className="absolute -left-[33px] top-1 w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center group-hover:scale-110 group-hover:border-amber-500 transition-all shadow-2xs">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
              </div>

              {/* Event Card Content */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </span>

                  <span className="text-xs font-semibold text-gray-900">
                    {formatActivityDescription(log.action, log.entitySummary)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono shrink-0">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{formatTimestamp(log.timestamp)}</span>
                </div>
              </div>

              {/* Operator Attribution */}
              <div className="flex items-center gap-2 mt-2 pt-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className="font-medium text-gray-700">{log.operatorName}</span>
                </div>
                <span className="text-[11px] text-gray-400">({log.operatorRole})</span>
                {log.entityId && (
                  <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                    ID: {log.entityId}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
