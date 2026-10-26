'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StorageYard, StorageLotStatus, StorageLotWithYard } from '../types/index.ts';

export interface StorageLocationsState {
  yards: StorageYard[];
  lots: StorageLotWithYard[];
  isLoading: boolean;
  error: string | null;
}

export interface UseStorageLocationsResult extends StorageLocationsState {
  refresh: () => Promise<void>;
  addYard: (yard: { yardCode?: string; name: string; description?: string }) => Promise<void>;
  addLot: (lot: { yardId: string; lotCode: string; status: StorageLotStatus }) => Promise<void>;
  updateLotStatus: (id: string, status: StorageLotStatus) => Promise<void>;
  deleteLot: (id: string) => Promise<void>;
  deleteYard: (id: string) => Promise<void>;
}

export function useStorageLocations(): UseStorageLocationsResult {
  const [yards, setYards] = useState<StorageYard[]>([]);
  const [lots, setLots] = useState<StorageLotWithYard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/storage-locations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setYards(json.data.yards ?? []);
        setLots(json.data.lots ?? []);
      } else {
        throw new Error(json.error ?? 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data lokasi penyimpanan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addYard = useCallback(async (data: { yardCode?: string; name: string; description?: string }) => {
    const res = await fetch('/api/storage-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'yard', ...data }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal menambah yard');
    await refresh();
  }, [refresh]);

  const addLot = useCallback(async (data: { yardId: string; lotCode: string; status: StorageLotStatus }) => {
    const res = await fetch('/api/storage-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'lot', ...data }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal menambah kavling');
    await refresh();
  }, [refresh]);

  const updateLotStatus = useCallback(async (id: string, status: StorageLotStatus) => {
    setLots((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      const res = await fetch('/api/storage-locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lot', id, status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal mengubah status');
    } catch (err) {
      await refresh();
      throw err;
    }
  }, [refresh]);

  const deleteLot = useCallback(async (id: string) => {
    const res = await fetch('/api/storage-locations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'lot', id }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal menghapus kavling');
    setLots((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const deleteYard = useCallback(async (id: string) => {
    const res = await fetch('/api/storage-locations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'yard', id }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal menghapus yard');
    setYards((prev) => prev.filter((y) => y.id !== id));
  }, []);

  return {
    yards,
    lots,
    isLoading,
    error,
    refresh,
    addYard,
    addLot,
    updateLotStatus,
    deleteLot,
    deleteYard,
  };
}
