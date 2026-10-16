'use client';

import React from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { LogOut, UserCheck } from 'lucide-react';

const ROLE_BADGES = {
  1: { label: 'Level 1: Manager', color: 'bg-emerald-50 text-[#00bb7f] border-emerald-200' },
  2: { label: 'Level 2: Admin', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  3: { label: 'Level 3: Monitor', color: 'bg-[#ffc908]/20 text-[#997300] border-[#ffc908]/40' },
};

export function UserNav() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading || !user) {
    return <div className="h-8 w-24 bg-gray-200 animate-pulse rounded-xl" />;
  }

  const roleMeta = ROLE_BADGES[user.roleLevel] || ROLE_BADGES[3];

  return (
    <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-2xl border border-gray-200/80 shadow-2xs">
      <div className="w-8 h-8 rounded-xl bg-[#ffc908]/20 flex items-center justify-center text-[#101828]">
        <UserCheck className="w-4 h-4 text-[#b38600]" />
      </div>

      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-[#101828] leading-tight">
            {user.name}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleMeta.color}`}>
            {roleMeta.label}
          </span>
        </div>
        <span className="text-[11px] text-gray-500 font-medium">
          {user.title}
        </span>
      </div>

      <button
        onClick={logout}
        title="Keluar dari akun (退出)"
        className="p-2 text-gray-400 hover:text-[#ed1c24] hover:bg-rose-50 rounded-xl transition cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}

