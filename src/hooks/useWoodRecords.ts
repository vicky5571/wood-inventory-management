'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { WoodReceivingRecord, RecordFilterCriteria, DashboardMetrics } from '../types/index.ts';
import { aggregateDashboardMetrics } from '../utils/timber-calc.ts';
import { SEED_WOOD_RECORDS } from '../persistence/seed-data.ts';

const STORAGE_KEY = 'wood_receiving_records_next_v1';

export function useWoodRecords() {
  const [allRecords, setAllRecords] = useState<WoodReceivingRecord[]>([]);
  const [filters, setFilters] = useState<RecordFilterCriteria>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize from LocalStorage or Seed Data
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setAllRecords(parsed);
          setIsHydrated(true);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse localStorage records:', e);
    }
    const seed = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    setAllRecords(seed);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    } catch {}
    setIsHydrated(true);
  }, []);

  // Save to LocalStorage on mutations
  const persist = useCallback((updated: WoodReceivingRecord[]) => {
    setAllRecords(updated);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist to localStorage:', e);
    }
  }, []);

  const saveRecord = useCallback((record: WoodReceivingRecord) => {
    setAllRecords((prev) => {
      const index = prev.findIndex((r) => r.id === record.id);
      let next: WoodReceivingRecord[];
      if (index >= 0) {
        next = [...prev];
        next[index] = { ...record, updatedAt: new Date().toISOString() };
      } else {
        next = [{
          ...record,
          createdAt: record.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, ...prev];
      }
      persist(next);
      return next;
    });
  }, [persist]);

  const deleteRecord = useCallback((id: string) => {
    setAllRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  const resetDemo = useCallback(() => {
    const seed = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    persist(seed);
    setFilters({});
  }, [persist]);

  // Filtered Records
  const records = useMemo(() => {
    return allRecords.filter((r) => {
      if (filters.species && r.woodSpecies !== filters.species) return false;
      if (filters.kavling && r.kavlingNumber !== filters.kavling) return false;
      if (filters.startDate && r.receiptDate < filters.startDate) return false;
      if (filters.endDate && r.receiptDate > filters.endDate) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.trim().toLowerCase();
        const hay = [
          r.truckPlateNumber,
          r.forestryDocNumber,
          r.receiptNumber,
          r.contractNumber,
          r.supplierName,
          r.woodSpecies,
          r.kavlingNumber,
          r.storageYard,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRecords, filters]);

  // Aggregated Metrics
  const metrics: DashboardMetrics = useMemo(() => {
    return aggregateDashboardMetrics(records);
  }, [records]);

  // Species list for dropdowns
  const speciesList = useMemo(() => {
    return Array.from(new Set(allRecords.map((r) => r.woodSpecies))).filter(Boolean);
  }, [allRecords]);

  // CSV Export (RFC 4180-compliant)
  const exportCsv = useCallback(() => {
    const headers = [
      'Penerimaan (到货日期)',
      'No. Polisi (车牌号)',
      'SKSHHK / DKP (送货单号)',
      'No. Kontrak (合同编号)',
      'Supplier (供应商)',
      'Jenis Kayu (树种)',
      'No. Kav (进厂批号)',
      'Batang Del (送货根数)',
      'Vol Del m³ (送货立方)',
      'Batang Tally (检尺根数)',
      'Vol Tally m³ (检尺立方)',
      'Net Kayu (木材应付)',
      'Net Ongkir (运费应付)',
      'Total Bayar (应付金额)',
    ];

    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    const rows = records.map((r) => [
      r.receiptDate,
      escapeCsv(r.truckPlateNumber),
      escapeCsv(r.forestryDocNumber),
      escapeCsv(r.contractNumber),
      escapeCsv(r.supplierName),
      escapeCsv(r.woodSpecies),
      escapeCsv(r.kavlingNumber),
      r.deliveredPieces,
      r.deliveredVolumeM3,
      r.tallyPieces,
      r.tallyVolumeM3,
      r.timberNetPayable,
      r.freightNetPayable,
      r.grandNetPayable,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `penerimaan_kayu_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [records]);

  return {
    records,
    allRecords,
    metrics,
    filters,
    speciesList,
    isHydrated,
    setFilters,
    saveRecord,
    deleteRecord,
    resetDemo,
    exportCsv,
  };
}

