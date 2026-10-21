'use client';

/**
 * src/hooks/useProductionRecords.ts
 *
 * Client hook for Sawmill Production Records with optimistic UI updates,
 * local storage caching, server synchronization, soft-delete undo toast,
 * and learned product autocomplete suggestions.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  SawmillProductionRecord,
  SawmillProductionFormInput,
} from '../types/index.ts';
import { computeProductionYield } from '../utils/production-calc.ts';
import { defaultStorage } from '../persistence/storage.ts';
import { toast } from '../utils/toast-store.ts';

const STORAGE_KEY = 'sawmill_production_records';

let memoryProductionCache: SawmillProductionRecord[] | null = null;

export function areProductionsEqual(
  prev: SawmillProductionRecord[],
  next: SawmillProductionRecord[]
): boolean {
  if (prev.length !== next.length) return false;
  if (prev.length === 0) return true;
  return (
    prev[0]?.id === next[0]?.id &&
    prev[0]?.updatedAt === next[0]?.updatedAt &&
    prev[prev.length - 1]?.id === next[next.length - 1]?.id
  );
}

async function persistProduction(records: SawmillProductionRecord[]): Promise<void> {
  memoryProductionCache = records;
  try {
    await defaultStorage.setItem(STORAGE_KEY, records);
  } catch (e) {
    console.error('Failed to persist production records:', e);
  }
}

export function useProductionRecords() {
  const [records, setRecords] = useState<SawmillProductionRecord[]>(() => memoryProductionCache || []);
  const [isHydrated, setIsHydrated] = useState(() => memoryProductionCache !== null);
  const [isSyncing, setIsSyncing] = useState(false);

  const recordsRef = useRef<SawmillProductionRecord[]>(records);
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
      if (memoryProductionCache === null) {
        try {
          const stored = await defaultStorage.getItem<SawmillProductionRecord[]>(STORAGE_KEY);
          if (isMounted && Array.isArray(stored)) {
            recordsRef.current = stored;
            memoryProductionCache = stored;
            setRecords(stored);
            setIsHydrated(true);
          }
        } catch (e) {
          console.warn('Failed to load local production records:', e);
        } finally {
          if (isMounted) setIsHydrated(true);
        }
      }

      syncWithServer(async () => {
        const res = await fetch('/api/production');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (isMounted && !hasMutatedRef.current && json?.success && Array.isArray(json.data)) {
          if (!areProductionsEqual(recordsRef.current, json.data)) {
            recordsRef.current = json.data;
            memoryProductionCache = json.data;
            setRecords(json.data);
            await persistProduction(json.data);
          }
        }
      }, false);
    })();

    return () => {
      isMounted = false;
    };
  }, [syncWithServer]);

  const saveRecord = useCallback(async (input: SawmillProductionFormInput): Promise<SawmillProductionRecord> => {
    hasMutatedRef.current = true;
    const now = new Date().toISOString();
    const prev = recordsRef.current;
    const index = input.id ? prev.findIndex((r) => r.id === input.id) : -1;
    const { yieldPercent, wasteVolumeM3 } = computeProductionYield({
      inputVolumeM3: Number(input.inputVolumeM3),
      outputVolumeM3: Number(input.outputVolumeM3),
    });

    const record: SawmillProductionRecord = {
      id: input.id || `PRD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId: 'default-tenant',
      productionDate: input.productionDate,
      shift: input.shift,
      sourceStorageYard: input.sourceStorageYard.trim(),
      sourceKavlingNumber: input.sourceKavlingNumber.trim(),
      inputSpecies: input.inputSpecies.trim(),
      inputVolumeM3: Number(input.inputVolumeM3),
      inputPieces: Number(input.inputPieces),
      outputProduct: input.outputProduct.trim(),
      outputVolumeM3: Number(input.outputVolumeM3),
      outputPieces: Number(input.outputPieces),
      yieldPercent,
      wasteVolumeM3,
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
    await persistProduction(nextRecords);

    syncWithServer(async () => {
      const isUpdate = index >= 0;
      const url = isUpdate ? `/api/production/${record.id}` : '/api/production';
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

  const restoreRecord = useCallback(async (record: SawmillProductionRecord): Promise<void> => {
    hasMutatedRef.current = true;
    const prev = recordsRef.current;
    const nextRecords = [record, ...prev.filter((r) => r.id !== record.id)];

    recordsRef.current = nextRecords;
    setRecords(nextRecords);
    await persistProduction(nextRecords);

    syncWithServer(async () => {
      const res = await fetch('/api/production', {
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
    await persistProduction(nextRecords);

    toast.show({
      type: 'info',
      title: 'Catatan produksi dihapus',
      description: `Produk: ${target.outputProduct}`,
      action: {
        label: 'Urungkan',
        onClick: () => {
          void restoreRecord(target);
        },
      },
    });

    syncWithServer(async () => {
      const res = await fetch(`/api/production/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Delete sync failed HTTP ${res.status}`);
    }, true);
  }, [restoreRecord, syncWithServer]);

  const productSuggestions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) {
      const trimmed = (r.outputProduct || '').trim();
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
    productSuggestions,
  };
}
