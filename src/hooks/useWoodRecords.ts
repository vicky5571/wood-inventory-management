'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  WoodReceivingRecord, RecordFilterCriteria, DashboardMetrics, ManifestFormInput, PaginationMeta,
} from '../types/index.ts';
import { aggregateDashboardMetrics, computeRecordCalculations } from '../utils/timber-calc.ts';
import { applyManifestToRecords } from '../utils/manifest-flattener.ts';
import { exportRecordsToCsv } from '../utils/records-csv.ts';
import { filterWoodRecords } from '../utils/record-search.ts';
import { buildRecordsApiUrl } from '../utils/record-query-url.ts';
import {
  getMemoryRecordsCache,
  DEFAULT_PAGINATION_META,
  areRecordsEqual,
  persistRecords,
  createSeedRecords,
  loadInitialRecords,
  notifySyncFailure,
  showDeleteRecordToast,
  computeEffectivePagination,
} from '../utils/record-storage-cache.ts';

let memoryRecordsCache: WoodReceivingRecord[] | null = null;
export { areRecordsEqual, memoryRecordsCache };

export function useWoodRecords() {
  const [allRecords, setAllRecords] = useState<WoodReceivingRecord[]>(() => getMemoryRecordsCache() || []);
  const [filters, setFilters] = useState<RecordFilterCriteria>({});
  const [isHydrated, setIsHydrated] = useState(() => getMemoryRecordsCache() !== null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION_META);

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
      if (showErrorToast) notifySyncFailure();
    } finally {
      activeSyncsRef.current = Math.max(0, activeSyncsRef.current - 1);
      setIsSyncing(activeSyncsRef.current > 0);
    }
  }, []);

  const updateRecords = useCallback((next: WoodReceivingRecord[]) => {
    recordsRef.current = next;
    setAllRecords(next);
    persistRecords(next);
  }, []);

  useEffect(() => {
    if (getMemoryRecordsCache() === null) {
      const initial = loadInitialRecords();
      recordsRef.current = initial;
      setAllRecords(initial);
      setIsHydrated(true);
    }

    syncWithServer(async () => {
      const url = buildRecordsApiUrl({
        page, pageSize, searchQuery: filters.searchQuery,
        species: filters.species, kavling: filters.kavling,
        startDate: filters.startDate, endDate: filters.endDate,
        paymentStatus: filters.paymentStatus,
      });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!hasMutatedRef.current && json?.success && Array.isArray(json.data)) {
        if (json.pagination) setPagination(json.pagination);
        if (!areRecordsEqual(recordsRef.current, json.data)) updateRecords(json.data);
      }
    }, false);
  }, [page, pageSize, filters, syncWithServer, updateRecords]);

  const saveRecord = useCallback((record: WoodReceivingRecord) => {
    hasMutatedRef.current = true;
    const now = new Date().toISOString();
    const prev = recordsRef.current;
    const index = prev.findIndex((r) => r.id === record.id);
    const savedRecord: WoodReceivingRecord = index >= 0
      ? { ...prev[index], ...record, updatedAt: now }
      : { ...record, createdAt: record.createdAt || now, updatedAt: now };

    const next = index >= 0 ? prev.map((r, i) => (i === index ? savedRecord : r)) : [savedRecord, ...prev];
    updateRecords(next);

    syncWithServer(async () => {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedRecord),
      });
      if (!res.ok) notifySyncFailure();
    }, true);
  }, [syncWithServer, updateRecords]);

  const updateRecordPrice = useCallback(async (id: string, price: number | null) => {
    hasMutatedRef.current = true;
    const prev = recordsRef.current;
    const index = prev.findIndex((r) => r.id === id);
    if (index < 0) return;

    const currentRecord = prev[index];
    const calcs = computeRecordCalculations({
      tallyVolumeM3: currentRecord.tallyVolumeM3,
      deliveredVolumeM3: currentRecord.deliveredVolumeM3,
      tallyPieces: currentRecord.tallyPieces,
      deliveredPieces: currentRecord.deliveredPieces,
      timberPricePerM3: price,
      timberPphRate: currentRecord.timberPphRate,
      freightRatePerM3: currentRecord.freightRatePerM3,
      freightPphAmount: currentRecord.freightPphAmount,
      brokerFee: currentRecord.brokerFee,
    });

    const updatedRecord: WoodReceivingRecord = {
      ...currentRecord,
      timberPricePerM3: price,
      ...calcs,
      updatedAt: new Date().toISOString(),
    };

    const next = prev.map((r, i) => (i === index ? updatedRecord : r));
    updateRecords(next);

    await syncWithServer(async () => {
      const res = await fetch(`/api/records/${encodeURIComponent(id)}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timberPricePerM3: price }),
      });
      if (!res.ok) {
        updateRecords(prev);
        notifySyncFailure();
      }
    }, true);
  }, [syncWithServer, updateRecords]);

  const saveManifest = useCallback(async (
    manifest: ManifestFormInput,
    options: { source: 'tally' | 'ledger' }
  ): Promise<WoodReceivingRecord[]> => {
    hasMutatedRef.current = true;
    const { next, flattened } = applyManifestToRecords(recordsRef.current, manifest);
    updateRecords(next);

    const url = options.source === 'tally' ? '/api/records/tally' : '/api/records';
    syncWithServer(async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest }),
      });
      if (!res.ok) notifySyncFailure();
    }, true);

    return flattened;
  }, [syncWithServer, updateRecords]);

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
    updateRecords(next);
    syncWithServer(async () => {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) notifySyncFailure();
    }, true);
  }, [syncWithServer, updateRecords]);

  const deleteRecord = useCallback((id: string, options?: { showUndoToast?: boolean }) => {
    hasMutatedRef.current = true;
    const prev = recordsRef.current;
    const targetIndex = prev.findIndex((r) => r.id === id);
    const targetRecord = targetIndex >= 0 ? prev[targetIndex] : undefined;
    const next = prev.filter((r) => r.id !== id);
    updateRecords(next);

    if (targetRecord && options?.showUndoToast !== false) {
      showDeleteRecordToast(targetRecord, () => restoreRecord(targetRecord, targetIndex));
    }
    syncWithServer(async () => {
      const res = await fetch('/api/records?id=' + encodeURIComponent(id), { method: 'DELETE' });
      if (!res.ok && res.status !== 404) notifySyncFailure();
    }, true);
  }, [restoreRecord, syncWithServer, updateRecords]);

  const resetDemo = useCallback(() => {
    hasMutatedRef.current = true;
    const seed = createSeedRecords();
    recordsRef.current = seed;
    setAllRecords(seed);
    setFilters({});
    setPage(1);

    syncWithServer(async () => {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (!res.ok) {
        notifySyncFailure();
      } else {
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          recordsRef.current = json.data;
          setAllRecords(json.data);
          persistRecords(json.data);
        }
      }
    }, true);
  }, [syncWithServer]);

  const records = useMemo(() => filterWoodRecords(allRecords, filters), [allRecords, filters]);
  const metrics: DashboardMetrics = useMemo(() => aggregateDashboardMetrics(records), [records]);
  const speciesList = useMemo(() => Array.from(new Set(allRecords.map((r) => r.woodSpecies))).filter(Boolean), [allRecords]);
  const exportCsv = useCallback(() => exportRecordsToCsv(records), [records]);
  const effectivePagination = useMemo(() => computeEffectivePagination(pagination, records.length, page, pageSize), [pagination, records.length, page, pageSize]);

  return {
    records, allRecords, metrics, filters, speciesList, isHydrated, isSyncing,
    pagination: effectivePagination, page, pageSize, setPage, setPageSize,
    setFilters, saveRecord, updateRecordPrice, saveManifest, deleteRecord,
    restoreRecord, resetDemo, exportCsv,
  };
}
