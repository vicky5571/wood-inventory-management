'use client';

import React from 'react';
import Link from 'next/link';
import { Warehouse, ArrowRight } from 'lucide-react';

export function InventoryEmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs">
      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
        <Warehouse className="w-6 h-6 text-amber-700" />
      </div>
      <h3 className="text-base font-bold text-gray-900">
        Belum Ada Data Inventaris (暂无库存数据)
      </h3>
      <p className="text-xs text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">
        Inventaris stok kayu dihitung otomatis secara live dari akumulasi tally penerimaan di Buku Besar dikurangi surat jalan penjualan kayu.
      </p>
      <div className="mt-5">
        <Link
          href="/ledger"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition"
        >
          <span>Buka Buku Besar (前往入库总账)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
