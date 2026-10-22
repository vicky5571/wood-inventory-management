'use client';

import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle, AlertTriangle } from 'lucide-react';
import type { ManagedUser, UserRoleLevel } from '../../types/index.ts';
import { PromoteToLevel1ConfirmModal } from './PromoteToLevel1ConfirmModal.tsx';

export interface UserEditModalProps {
  isOpen: boolean;
  user: ManagedUser | null;
  currentActorId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserEditModal({ isOpen, user, currentActorId, onClose, onSuccess }: UserEditModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [roleLevel, setRoleLevel] = useState<UserRoleLevel>(2);
  const [tallyCreate, setTallyCreate] = useState(false);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [pendingRoleLevel, setPendingRoleLevel] = useState<UserRoleLevel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setTitle(user.title);
      setRoleLevel(user.roleLevel);
      setTallyCreate(Boolean(user.permissions?.tallyCreate));
      setError(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isSelf = user.id === currentActorId;
  const isRoleChanged = roleLevel !== user.roleLevel;

  const handleRoleChange = (newLevel: UserRoleLevel) => {
    if (newLevel === 1 && user.roleLevel !== 1) {
      setPendingRoleLevel(newLevel);
      setShowPromoteConfirm(true);
    } else {
      setRoleLevel(newLevel);
    }
  };

  const executeUpdate = async () => {
    setError(null);
    if (!name.trim() || !title.trim() || !email.includes('@')) {
      return setError('Mohon lengkapi seluruh field dengan benar');
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        title: title.trim(),
      };
      if (!isSelf && isRoleChanged) payload.roleLevel = roleLevel;
      if (roleLevel === 2) payload.permissions = { tallyCreate };

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal memperbarui user');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-lg">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Edit Profil & Role User
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); executeUpdate(); }} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jabatan / Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role Level</label>
                <select value={roleLevel} disabled={isSelf} onChange={(e) => handleRoleChange(Number(e.target.value) as UserRoleLevel)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  <option value={1}>Level 1 — Direktur / Manager</option>
                  <option value={2}>Level 2 — Staff Operasional</option>
                  <option value={3}>Level 3 — Viewer / Auditor</option>
                </select>
                {isSelf && <p className="text-[11px] text-amber-600 mt-1">Tidak dapat mengubah role sendiri</p>}
              </div>
            </div>

            {isRoleChanged && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Mengubah role akan me-reset seluruh izin khusus user ke default.</span>
              </div>
            )}

            {roleLevel === 2 && (
              <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={tallyCreate} onChange={(e) => setTallyCreate(e.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="font-medium">Izin Buat Tally Lapangan (`tallyCreate`)</span>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                Batal
              </button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <PromoteToLevel1ConfirmModal
        isOpen={showPromoteConfirm}
        targetUser={user}
        onConfirm={() => {
          if (pendingRoleLevel !== null) setRoleLevel(pendingRoleLevel);
          setShowPromoteConfirm(false);
          setPendingRoleLevel(null);
        }}
        onCancel={() => {
          setShowPromoteConfirm(false);
          setPendingRoleLevel(null);
        }}
      />
    </>
  );
}
