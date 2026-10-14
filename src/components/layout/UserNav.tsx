'use client';

import React from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { LogOut, UserCheck } from 'lucide-react';

const ROLE_BADGES = {
  1: { label: 'Level 1: Manager', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  2: { label: 'Level 2: Admin', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  3: { label: 'Level 3: Monitor', color: 'bg-amber-100 text-amber-800 border-amber-300' },
};

export function UserNav() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading || !user) {
    return <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg" />;
  }

  const roleMeta = ROLE_BADGES[user.roleLevel] || ROLE_BADGES[3];

  return (
    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
        <UserCheck className="w-4 h-4 text-amber-800" />
      </div>

      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-900 leading-tight">
            {user.name}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${roleMeta.color}`}>
            {roleMeta.label}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          {user.title}
        </span>
      </div>

      <button
        onClick={logout}
        title="Keluar dari akun (退出)"
        className="ml-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}

