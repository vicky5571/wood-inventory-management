'use client';

/**
 * src/hooks/useSortingRecords.ts
 *
 * Client hook for Stock Sorting Redistribution Records with optimistic UI updates,
 * local storage caching, server synchronization, soft-delete undo toast,
 * and learned sorting reason suggestions.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  StockSortingRecord,
  StockSortingFormInput,
} from '../types/index.ts';
import { defaultStorage } from '../persistence/storage.ts';
import { toast } from '../utils/toast-store.ts';

const STORAGE_KEY = 'stock_sorting_records';

let memorySortingCache: StockSortingRecord[] | null = null;

export function areSortingsEqual(
  prev: StockSortingRecord[],
  next: StockSortingRecord[]
): boolean {
  if (prev.length !== next.length) return false;
  if (prev.length === 0) return true;
  return (
    prev[0]?.id === next[0]?.id &&
    prev[0]?.updatedAt === next[0]?.updatedAt &&
    prev[prev.length - 1]?.id === next[next.length - 1]?.id
  );
}

async function persistSorting(records: StockSortingRecord[]): Promise<void> {
  memorySortingCache = records;
  try {
    await defaultStorage.setItem(STORAGE_KEY, records);
  } catch (e) {
    console.error('Failed to persist sorting records:', e);
  }
}

export function useSortingRecords() {
  const [records, setRecords] = useState<StockSortingRecord[]>(() => memorySortingCache || []);
  const [isHydrated, setIsHydrated] = useState(() => memorySortingCache !== null);
  const [isSyncing, setIsSyncing] = useState(false);

  const recordsRef = useRef<StockSortingRecord[]>(records);
  recordsRef.current = records;

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

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (memorySortingCache === null) {
        try {
          const stored = await defaultStorage.getItem<StockSortingRecord[]>(STORAGE_KEY);
          if (isMounted && Array.isArray(stored)) {
            recordsRef.current = stored;
            memorySortingCache = stored;
            setRecords(stored);
            setIsHydrated(true);
          }
        } catch (e) {
          console.warn('Failed to load local sorting records:', e);
        } finally {
          if (isMounted) setIsHydrated(true);
        }
      }

      syncWithServer(async () => {
        const res = await fetch('/api/sorting');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (isMounted && !hasMutatedRef.current && json?.success && Array.isArray(json.data)) {
          if (!areSortingsEqual(recordsRef.current, json.data)) {
            recordsRef.current = json.data;
            memorySortingCache = json.data;
            setRecords(json.data);
            await persistSorting(json.data);
          }
        }
      }, false);
    })();

    return () => {
      isMounted = false;
    };
  }, [syncWithServer]);

  const saveRecord = useCallback(async (input: StockSortingFormInput): Promise<StockSortingRecord> => {
    hasMutatedRef.current = true;
    const now = new Date().toISOString();
    const prev = recordsRef.current;
    const index = input.id ? prev.findIndex((r) => r.id === input.id) : -1;

    const record: StockSortingRecord = {
      id: input.id || `SRT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId: 'default-tenant',
      sortingDate: input.sortingDate,
      species: input.species.trim(),
      sourceStorageYard: input.sourceStorageYard.trim(),
      sourceKavlingNumber: input.sourceKavlingNumber.trim(),
      targetStorageYard: input.targetStorageYard.trim(),
      targetKavlingNumber: input.targetKavlingNumber.trim(),
      volumeM3: Number(input.volumeM3),
      pieces: Number(input.pieces),
      reason: input.reason.trim(),
      operatorName: input.operatorName.trim(),
      notes: input.notes?.trim(),
      createdAt: index >= 0 ? prev[index].createdAt : now,
      updatedAt: now,
    };

    const nextRecords = index >= 0
      ? prev.map((r, i) => (i === index ? record : r))
      : [record, ...prev];

    recordsRef.current = nextRecords;
    setRecords(nextRecords);
    await persistSorting(nextRecords);

    syncWithServer(async () => {
      const isUpdate = index >= 0;
      const url = isUpdate ? `/api/sorting/${record.id}` : '/api/sorting';
      const method = isUpdate ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) throw new Error(`Server sync failed HTTP ${res.status}`);
    }, true);

    return record;
  }, [syncWithServer]);

  const restoreRecord = useCallback(async (record: StockSortingRecord): Promise<void> => {
    hasMutatedRef.current = true;
    const prev = recordsRef.current;
    const nextRecords = [record, ...prev.filter((r) => r.id !== record.id)];

    recordsRef.current = nextRecords;
    setRecords(nextRecords);
    await persistSorting(nextRecords);

    syncWithServer(async () => {
      const res = await fetch('/api/sorting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) throw new Error(`Restore sync failed HTTP ${res.status}`);
    }, true);
  }, [syncWithServer]);

  const deleteRecord = useCallback(async (id: string): Promise<void> => {
    hasMutatedRef.current = true;
    const prev = recordsRef.current;
    const target = prev.find((r) => r.id === id);
    if (!target) return;

    const nextRecords = prev.filter((r) => r.id !== id);
    recordsRef.current = nextRecords;
    setRecords(nextRecords);
    await persistSorting(nextRecords);

    toast.show({
      type: 'info',
      title: 'Catatan sortir dihapus',
      description: `Kayu: ${target.species} (${target.volumeM3} m3)`,
      action: {
        label: 'Urungkan',
        onClick: () => {
          void restoreRecord(target);
        },
      },
    });

    syncWithServer(async () => {
      const res = await fetch(`/api/sorting/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Delete sync failed HTTP ${res.status}`);
    }, true);
  }, [restoreRecord, syncWithServer]);

  const reasonSuggestions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) {
      const trimmed = (r.reason || '').trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!map.has(key)) {
        map.set(key, trimmed);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [records]);

  return {
    records,
    isSyncing,
    isHydrated,
    saveRecord,
    deleteRecord,
    restoreRecord,
    reasonSuggestions,
  };
}
