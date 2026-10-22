'use client';

import React, { useState } from 'react';
import type { ManagedUser } from '../../types/index.ts';
import { Search, ShieldAlert, KeyRound, UserX, UserCheck, History, Edit2, ShieldCheck } from 'lucide-react';

export interface UserListTableProps {
  users: ManagedUser[];
  currentActorId: string;
  onEdit: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
  onDeactivate: (user: ManagedUser) => void;
  onReactivate: (user: ManagedUser) => void;
  onViewAudit: (user: ManagedUser) => void;
}

export function UserListTable({
  users,
  currentActorId,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
  onViewAudit,
}: UserListTableProps) {
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const filtered = users.filter((u) => {
    if (!showInactive && !u.isActive) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.title.toLowerCase().includes(q);
  });

  const getRoleBadge = (level: number) => {
    switch (level) {
      case 1:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50"><ShieldAlert className="w-3 h-3" /> Level 1 — Manager</span>;
      case 2:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50"><ShieldCheck className="w-3 h-3" /> Level 2 — Staff</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">Level 3 — Viewer</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari user (nama, email, jabatan)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Tampilkan user nonaktif
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">Nama & Jabatan</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Izin Khusus</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Tidak ada user ditemukan</td>
              </tr>
            ) : (
              filtered.map((user) => {
                const isSelf = user.id === currentActorId;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {user.name}
                        {isSelf && (
                          <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded">Anda</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{user.email} • {user.title}</div>
                    </td>
                    <td className="px-4 py-3">{getRoleBadge(user.roleLevel)}</td>
                    <td className="px-4 py-3">
                      {user.permissions?.tallyCreate ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          tallyCreate
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Aktif</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Nonaktif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onEdit(user)}
                          title="Edit User"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onResetPassword(user)}
                          title="Reset Password"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onViewAudit(user)}
                          title="Lihat Log Audit"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {user.isActive ? (
                          <button
                            onClick={() => onDeactivate(user)}
                            disabled={isSelf}
                            title={isSelf ? 'Tidak dapat menonaktifkan akun sendiri' : 'Nonaktifkan User'}
                            className={`p-1.5 rounded-lg ${
                              isSelf
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onReactivate(user)}
                            title="Aktifkan Kembali"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
