import React from 'react';

export function LoginBrandHeader() {
  return (
    <>
      <div className="flex items-center justify-center mb-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      </div>
      <h1 className="text-lg font-black text-slate-900 tracking-tight text-center">
        Penerimaan Kayu &amp; Stok Gudang
      </h1>
      <p className="text-[11px] font-semibold text-slate-400 text-center mt-0.5 mb-5">
        木材入库与库存管理 &bull; Otorisasi Multi-Level
      </p>
    </>
  );
}
