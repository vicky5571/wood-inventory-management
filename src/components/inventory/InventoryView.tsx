'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useWoodSalesRecords } from '@/src/hooks/useWoodSalesRecords';
import { aggregateAllLotBalances } from '@/src/utils/stock-balance';
import { InventoryKpiStrip } from './InventoryKpiStrip';
import { InventoryToolbar } from './InventoryToolbar';
import { InventoryTable } from './InventoryTable';
import { InventoryEmptyState } from './InventoryEmptyState';
import { Warehouse, RefreshCw, ArrowLeft, ArrowUpRight } from 'lucide-react';

export function InventoryView() {
  const { allRecords, isSyncing: isRecordsSyncing } = useWoodRecords();
  const { sales, isSyncing: isSalesSyncing } = useWoodSalesRecords(allRecords);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYard, setSelectedYard] = useState('ALL');
  const [hideDepleted, setHideDepleted] = useState(true);

  const isSyncing = isRecordsSyncing || isSalesSyncing;

  // Compute live lot stock balances from inbound and outbound records
  const allLotBalances = useMemo(() => {
    return aggregateAllLotBalances(allRecords, sales);
  }, [allRecords, sales]);

  // Extract distinct yards for the toolbar dropdown
  const availableYards = useMemo(() => {
    const set = new Set<string>();
    for (const lot of allLotBalances) {
      if (lot.storageYard) set.add(lot.storageYard);
    }
    return Array.from(set).sort();
  }, [allLotBalances]);

  // Yard-scoped lots (for KPI strip so yard filtering updates metrics properly)
  const yardScopedLots = useMemo(() => {
    if (selectedYard === 'ALL') return allLotBalances;
    return allLotBalances.filter((l) => l.storageYard === selectedYard);
  }, [allLotBalances, selectedYard]);

  // Filter lots according to user search query and depleted toggle
  const displayLots = useMemo(() => {
    return yardScopedLots.filter((lot) => {
      if (hideDepleted && lot.remainingVolumeM3 <= 0) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        lot.storageYard.toLowerCase().includes(q) ||
        lot.kavlingNumber.toLowerCase().includes(q)
      );
    });
  }, [yardScopedLots, hideDepleted, searchQuery]);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/ledger"
              className="inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-950 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Buku Besar (入库总账)</span>
            </Link>
          </div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-amber-700 shrink-0" />
            <span>Inventaris Stok Kayu (木材库存管理)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Sisa stok per kavling berdasarkan tally penerimaan dan penjualan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSyncing && (
            <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Sinkronisasi...</span>
            </span>
          )}
          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition"
          >
            <span>Buku Penjualan</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
          </Link>
        </div>
      </div>

      {allRecords.length === 0 ? (
        <InventoryEmptyState />
      ) : (
        <>
          <InventoryKpiStrip lots={yardScopedLots} />

          <InventoryToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedYard={selectedYard}
            onYardChange={setSelectedYard}
            availableYards={availableYards}
            hideDepleted={hideDepleted}
            onHideDepletedChange={setHideDepleted}
          />

          <InventoryTable lots={displayLots} />
        </>
      )}
    </div>
  );
}
