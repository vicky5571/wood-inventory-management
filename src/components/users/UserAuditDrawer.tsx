'use client';

import React, { useState, useEffect } from 'react';
import { X, History, Loader2 } from 'lucide-react';
import type { ManagedUser, ActivityLogEntry } from '../../types/index.ts';

export interface UserAuditDrawerProps {
  isOpen: boolean;
  user: ManagedUser | null;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  USER_CREATED: { label: 'User Dibuat', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' },
  USER_UPDATED: { label: 'Profil Diperbarui', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300' },
  USER_ROLE_CHANGED: { label: 'Role Diubah', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300' },
  USER_PERMISSION_CHANGED: { label: 'Izin Diubah', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300' },
  USER_DEACTIVATED: { label: 'Dinonaktifkan', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300' },
  USER_REACTIVATED: { label: 'Diaktifkan Kembali', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300' },
  USER_PASSWORD_CHANGED: { label: 'Password Direset', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
};

export function UserAuditDrawer({ isOpen, user, onClose }: UserAuditDrawerProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setLoading(true);
      fetch(`/api/users/${user.id}/activity?limit=50`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setLogs(res.data);
          } else {
            setLogs([]);
          }
        })
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
    } else {
      setLogs([]);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Log Audit User</h3>
                <p className="text-xs text-slate-500">{user.name} ({user.email})</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-sm">Memuat log aktivitas...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Belum ada riwayat log audit untuk user ini
              </div>
            ) : (
              logs.map((log) => {
                const badge = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-800' };
                return (
                  <div key={log.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{log.entitySummary}</p>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Oleh: <span className="font-medium">{log.operatorName}</span> ({log.operatorRole})
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 text-[11px] bg-white dark:bg-slate-900/80 p-2 rounded border border-slate-100 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
