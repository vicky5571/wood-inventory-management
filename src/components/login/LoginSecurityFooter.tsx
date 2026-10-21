import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function LoginSecurityFooter() {
  return (
    <div className="mt-6 pt-4 border-t border-slate-100 w-full text-center">
      <p className="text-[10px] text-slate-400 font-medium inline-flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={2} />
        Dilindungi Autentikasi Sesi &amp; Otorisasi Peran
      </p>
    </div>
  );
}
