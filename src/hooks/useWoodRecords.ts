'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { WoodReceivingRecord, RecordFilterCriteria, DashboardMetrics } from '../types/index.ts';
import { aggregateDashboardMetrics } from '../utils/timber-calc.ts';
import { SEED_WOOD_RECORDS } from '../persistence/seed-data.ts';
import { toast } from '../utils/toast-store.ts';
import { exportRecordsToCsv } from '../utils/records-csv.ts';

const STORAGE_KEY = 'wood_receiving_records_next_v1';

function persistRecords(records: WoodReceivingRecord[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  } catch (e) {
    console.error('Failed to persist to localStorage:', e);
  }
}

export function useWoodRecords() {
  const [allRecords, setAllRecords] = useState<WoodReceivingRecord[]>([]);
  const [filters, setFilters] = useState<RecordFilterCriteria>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const recordsRef = useRef<WoodReceivingRecord[]>(allRecords);
  recordsRef.current = allRecords;

  const hasMutatedRef = useRef(false);
  const activeSyncsRef = useRef(0);

  const syncWithServer = useCallback(async (action: () => Promise<void>, showErrorToast = false) => {
    if (typeof fetch === 'undefined') return;

    activeSyncsRef.current += 1;
    setIsSyncing(true);

    try {
      await action();
    } catch {
      if (showErrorToast) {
        toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
      }
    } finally {
      activeSyncsRef.current = Math.max(0, activeSyncsRef.current - 1);
      setIsSyncing(activeSyncsRef.current > 0);
    }
  }, []);

  // Initialize from LocalStorage or Seed Data, then non-blocking background sync
  useEffect(() => {
    let localDataLoaded = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            recordsRef.current = parsed;
            setAllRecords(parsed);
            setIsHydrated(true);
            localDataLoaded = true;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse localStorage records:', e);
    }

    if (!localDataLoaded) {
      const seed: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
      recordsRef.current = seed;
      setAllRecords(seed);
      persistRecords(seed);
      setIsHydrated(true);
    }

    syncWithServer(async () => {
      const res = await fetch('/api/records');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!hasMutatedRef.current && json?.success && Array.isArray(json.data)) {
        recordsRef.current = json.data;
        setAllRecords(json.data);
        persistRecords(json.data);
      }
    }, false);
  }, [syncWithServer]);

  const saveRecord = useCallback((record: WoodReceivingRecord) => {
    hasMutatedRef.current = true;
    const now = new Date().toISOString();
    const prev = recordsRef.current;
    const index = prev.findIndex((r) => r.id === record.id);

    const savedRecord: WoodReceivingRecord = index >= 0
      ? { ...prev[index], ...record, updatedAt: now }
      : { ...record, createdAt: record.createdAt || now, updatedAt: now };

    const next = index >= 0
      ? prev.map((r, i) => (i === index ? savedRecord : r))
      : [savedRecord, ...prev];

    recordsRef.current = next;
    setAllRecords(next);
    persistRecords(next);

    syncWithServer(async () => {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedRecord),
      });
      if (!res.ok) {
        toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
      }
    }, true);
  }, [syncWithServer]);

  const restoreRecord = useCallback((record: WoodReceivingRecord, index?: number) => {
    hasMutatedRef.current = true;
    const prev = recordsRef.current;
    if (prev.some((r) => r.id === record.id)) return;

    const next = [...prev];
    if (typeof index === 'number' && index >= 0 && index <= next.length) {
      next.splice(index, 0, record);
    } else {
      next.unshift(record);
    }

    recordsRef.current = next;
    setAllRecords(next);
    persistRecords(next);

    syncWithServer(async () => {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) {
        toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
      }
    }, true);
  }, [syncWithServer]);

  const deleteRecord = useCallback((id: string, options?: { showUndoToast?: boolean }) => {
    hasMutatedRef.current = true;
    const prev = recordsRef.current;
    const targetIndex = prev.findIndex((r) => r.id === id);
    const targetRecord = targetIndex >= 0 ? prev[targetIndex] : undefined;

    const next = prev.filter((r) => r.id !== id);
    recordsRef.current = next;
    setAllRecords(next);
    persistRecords(next);

    if (targetRecord && options?.showUndoToast !== false) {
      const plate = targetRecord.truckPlateNumber ? `Truk ${targetRecord.truckPlateNumber}` : 'Penerimaan';
      const vol = targetRecord.tallyVolumeM3 ? `${targetRecord.tallyVolumeM3} m³` : '0 m³';

      toast.warning(
        'Data Penerimaan Dihapus (入库记录已删除)',
        `${plate} • ${vol} (${targetRecord.woodSpecies || 'Kayu'})`,
        5000,
        {
          label: 'Urungkan (撤销)',
          onClick: () => {
            restoreRecord(targetRecord, targetIndex);
            toast.success('Data Penerimaan Dipulihkan (已恢复)', `${plate} berhasil dikembalikan ke buku besar.`);
          },
        }
      );
    }

    syncWithServer(async () => {
      const res = await fetch('/api/records?id=' + encodeURIComponent(id), { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
      }
    }, true);
  }, [restoreRecord, syncWithServer]);

  const resetDemo = useCallback(() => {
    hasMutatedRef.current = true;
    const seed: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    recordsRef.current = seed;
    setAllRecords(seed);
    persistRecords(seed);
    setFilters({});
  }, []);

  const records = useMemo(() => {
    return allRecords.filter((r) => {
      if (filters.species && r.woodSpecies !== filters.species) return false;
      if (filters.kavling && r.kavlingNumber !== filters.kavling) return false;
      if (filters.startDate && r.receiptDate < filters.startDate) return false;
      if (filters.endDate && r.receiptDate > filters.endDate) return false;
      if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
        const status = r.paymentStatus || 'UNPAID';
        if (filters.paymentStatus === 'UNPAID' && status === 'PAID') return false;
        if (filters.paymentStatus === 'PAID' && r.paymentStatus !== 'PAID') return false;
        if (filters.paymentStatus === 'PARTIAL' && r.paymentStatus !== 'PARTIAL') return false;
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.trim().toLowerCase();
        const hay = [
          r.truckPlateNumber, r.forestryDocNumber, r.receiptNumber,
          r.contractNumber, r.supplierName, r.woodSpecies, r.kavlingNumber, r.storageYard,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRecords, filters]);

  const metrics: DashboardMetrics = useMemo(() => aggregateDashboardMetrics(records), [records]);
  const speciesList = useMemo(() => Array.from(new Set(allRecords.map((r) => r.woodSpecies))).filter(Boolean), [allRecords]);
  const exportCsv = useCallback(() => exportRecordsToCsv(records), [records]);

  return {
    records,
    allRecords,
    metrics,
    filters,
    speciesList,
    isHydrated,
    isSyncing,
    setFilters,
    saveRecord,
    deleteRecord,
    restoreRecord,
    resetDemo,
    exportCsv,
  };
}
