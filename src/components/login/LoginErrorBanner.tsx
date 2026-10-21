import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface LoginErrorBannerProps {
  message: string;
}

export function LoginErrorBanner({ message }: LoginErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-700 text-xs font-semibold">
      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" strokeWidth={2} />
      <span className="flex-1 text-left">{message}</span>
    </div>
  );
}
