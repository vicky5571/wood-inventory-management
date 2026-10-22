'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { toast } from '@/src/utils/toast-store';
import type { ManagedUser } from '@/src/types';
import { Users, UserPlus, RefreshCw, ShieldAlert, Loader2 } from 'lucide-react';
import { UserListTable } from '@/src/components/users/UserListTable';
import { UserCreateModal } from '@/src/components/users/UserCreateModal';
import { UserEditModal } from '@/src/components/users/UserEditModal';
import { PasswordResetModal } from '@/src/components/users/PasswordResetModal';
import { DeactivateConfirmModal } from '@/src/components/users/DeactivateConfirmModal';
import { UserAuditDrawer } from '@/src/components/users/UserAuditDrawer';

export default function UsersPage() {
  const { user: currentActor, isLoading: isAuthLoading } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [pwResetUser, setPwResetUser] = useState<ManagedUser | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<ManagedUser | null>(null);
  const [auditUser, setAuditUser] = useState<ManagedUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users?includeInactive=1');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengambil data user');
      }
      setUsers(data.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentActor?.roleLevel === 1) {
      fetchUsers();
    }
  }, [currentActor, fetchUsers]);

  const handleReactivate = async (target: ManagedUser) => {
    try {
      const res = await fetch(`/api/users/${target.id}/reactivate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengaktifkan user');
      }
      toast.success('User Diaktifkan', `User ${target.name} berhasil diaktifkan kembali.`);
      fetchUsers();
    } catch (err: unknown) {
      toast.error('Gagal Mengaktifkan', err instanceof Error ? err.message : 'Kesalahan sistem');
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!currentActor || currentActor.roleLevel !== 1) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-center shadow-lg">
        <ShieldAlert className="w-12 h-12 text-rose-600 dark:text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Akses Ditolak</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Halaman Manajemen Pengguna hanya dapat diakses oleh akun dengan Role Level 1 (Direktur / Manager).
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-700 dark:text-emerald-300">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Manajemen Pengguna <span className="text-sm font-normal text-slate-400">(用户管理)</span>
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola akun pengguna, level akses operasional, dan riwayat audit trail sistem.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Pengguna
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      ) : loading && users.length === 0 ? (
        <div className="flex items-center justify-center p-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
          <span>Memuat data pengguna...</span>
        </div>
      ) : (
        <UserListTable
          users={users}
          currentActorId={currentActor.id}
          onEdit={(u) => setEditingUser(u)}
          onResetPassword={(u) => setPwResetUser(u)}
          onDeactivate={(u) => setDeactivateUser(u)}
          onReactivate={handleReactivate}
          onViewAudit={(u) => setAuditUser(u)}
        />
      )}

      <UserCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          toast.success('Pengguna Dibuat', 'Akun pengguna baru berhasil ditambahkan.');
          fetchUsers();
        }}
      />

      <UserEditModal
        isOpen={Boolean(editingUser)}
        user={editingUser}
        currentActorId={currentActor.id}
        onClose={() => setEditingUser(null)}
        onSuccess={() => {
          toast.success('Pengguna Diperbarui', 'Data pengguna berhasil disimpan.');
          fetchUsers();
        }}
      />

      <PasswordResetModal
        isOpen={Boolean(pwResetUser)}
        user={pwResetUser}
        onClose={() => setPwResetUser(null)}
        onSuccess={() => {
          toast.success('Password Direset', 'Password pengguna berhasil diubah.');
        }}
      />

      <DeactivateConfirmModal
        isOpen={Boolean(deactivateUser)}
        user={deactivateUser}
        onClose={() => setDeactivateUser(null)}
        onSuccess={() => {
          toast.warning('Pengguna Dinonaktifkan', 'User telah dinonaktifkan.');
          fetchUsers();
        }}
      />

      <UserAuditDrawer
        isOpen={Boolean(auditUser)}
        user={auditUser}
        onClose={() => setAuditUser(null)}
      />
    </div>
  );
}
