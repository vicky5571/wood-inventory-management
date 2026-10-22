'use client';

import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import type { ManagedUser } from '../../types/index.ts';

export interface PromoteToLevel1ConfirmModalProps {
  isOpen: boolean;
  targetUser: ManagedUser | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PromoteToLevel1ConfirmModal({
  isOpen,
  targetUser,
  onConfirm,
  onCancel,
}: PromoteToLevel1ConfirmModalProps) {
  if (!isOpen || !targetUser) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-purple-200 dark:border-purple-800/50 p-6 overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Konfirmasi Promosi ke Level 1
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Level 1 memiliki akses penuh termasuk reset database. Yakin promote{' '}
              <strong className="text-purple-600 dark:text-purple-400 font-semibold">{targetUser.email}</strong> ke Level 1?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition-all"
              >
                Yakin Promote
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
