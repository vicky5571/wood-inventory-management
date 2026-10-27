'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TimberPriceEntry } from '../types/index.ts';

export function useTimberPrices() {
  const [entries, setEntries] = useState<TimberPriceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/prices');
      const json = await res.json();
      if (json.success) {
        setEntries(json.data);
      } else {
        throw new Error(json.error || 'Gagal memuat tabel harga');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat tabel harga');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveEntry = useCallback(
    async (
      entry: Partial<TimberPriceEntry> & {
        speciesId: string;
        woodSpecies: string;
        pricePerM3: number;
        effectiveFrom: string;
      }
    ) => {
      const method = entry.id ? 'PATCH' : 'POST';
      const url = entry.id ? `/api/prices/${entry.id}` : '/api/prices';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Gagal menyimpan harga');
      }
      await refresh();
      return json.data as TimberPriceEntry;
    },
    [refresh]
  );

  const deleteEntry = useCallback(async (id: string) => {
    const res = await fetch(`/api/prices/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? 'Gagal menghapus harga');
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const activeEntries = entries.filter((e) => !e.effectiveTo || e.effectiveTo >= today);
  const expiredEntries = entries.filter((e) => e.effectiveTo && e.effectiveTo < today);

  return {
    entries,
    activeEntries,
    expiredEntries,
    isLoading,
    error,
    refresh,
    saveEntry,
    deleteEntry,
  };
}
