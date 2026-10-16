'use client';

import React from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { LogOut, UserCheck } from 'lucide-react';

const ROLE_BADGES: Record<number, { label: string; short: string; color: string }> = {
  1: { label: 'Manager', short: 'L1', color: 'bg-emerald-50 text-emerald-600 border-emerald-200/80' },
  2: { label: 'Admin', short: 'L2', color: 'bg-blue-50 text-blue-600 border-blue-200/80' },
  3: { label: 'Monitor', short: 'L3', color: 'bg-amber-50 text-amber-600 border-amber-200/80' },
};

export function UserNav() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading || !user) {
    return <div className="h-9 w-28 bg-gray-100 animate-pulse rounded-xl" />;
  }

  const roleMeta = ROLE_BADGES[user.roleLevel] || ROLE_BADGES[3];

  return (
    <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-xl border border-gray-200/70 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] hover:shadow-[0_2px_4px_0_rgb(0_0_0/0.06)] transition-shadow duration-200">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200/60 flex items-center justify-center flex-shrink-0">
        <UserCheck className="w-3.5 h-3.5 text-amber-700" />
      </div>

      <div className="flex flex-col text-left min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-[#101828] leading-tight truncate max-w-[100px]">
            {user.name}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-[1px] rounded-md border whitespace-nowrap ${roleMeta.color}`}>
            {roleMeta.label}
          </span>
        </div>
        <span className="text-[10px] text-gray-400 font-medium truncate max-w-[140px]">
          {user.title}
        </span>
      </div>

      <button
        onClick={logout}
        title="Keluar dari akun (退出)"
        className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
