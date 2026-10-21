import React from 'react';

export function LoginCheckingSession() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-amber-600 animate-ping" />
        <span className="text-xs font-bold text-slate-500">Memeriksa sesi login...</span>
      </div>
    </div>
  );
}
