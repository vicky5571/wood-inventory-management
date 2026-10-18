'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { WoodReceivingRecord, WoodSalesRecord, SalesFormInput, LotStockBalance } from '../types/index.ts';
import { calculateLotStockBalance, calculateSalesFinancials } from '../utils/stock-balance.ts';
import { defaultStorage } from '../persistence/storage.ts';
import { toast } from '../utils/toast-store.ts';

const STORAGE_KEY = 'wood_sales_records';

async function persistSales(sales: WoodSalesRecord[]): Promise<void> {
  try {
    await defaultStorage.setItem(STORAGE_KEY, sales);
  } catch (e) {
    console.error('Failed to persist sales records:', e);
  }
}

export function useWoodSalesRecords(inboundRecords: WoodReceivingRecord[] = []) {
  const [sales, setSales] = useState<WoodSalesRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const salesRef = useRef<WoodSalesRecord[]>(sales);
  salesRef.current = sales;

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
      try {
        const stored = await defaultStorage.getItem<WoodSalesRecord[]>(STORAGE_KEY);
        if (isMounted && Array.isArray(stored)) {
          salesRef.current = stored;
          setSales(stored);
          setIsHydrated(true);
        }
      } catch (e) {
        console.warn('Failed to load local sales:', e);
      } finally {
        if (isMounted) setIsHydrated(true);
      }

      syncWithServer(async () => {
        const res = await fetch('/api/sales');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (isMounted && !hasMutatedRef.current && json?.success && Array.isArray(json.data)) {
          salesRef.current = json.data;
          setSales(json.data);
          await persistSales(json.data);
        }
      }, false);
    })();

    return () => {
      isMounted = false;
    };
  }, [syncWithServer]);

  const saveSale = useCallback(async (input: SalesFormInput): Promise<WoodSalesRecord> => {
    hasMutatedRef.current = true;
    const now = new Date().toISOString();
    const prev = salesRef.current;
    const index = input.id ? prev.findIndex((s) => s.id === input.id) : -1;
    const { totalPrice } = calculateSalesFinancials(input.volumeM3, input.pricePerM3);

    const record: WoodSalesRecord = {
      id: input.id || `SALE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      saleDate: input.saleDate,
      deliveryOrderNumber: input.deliveryOrderNumber.trim(),
      truckPlateNumber: input.truckPlateNumber.trim().toUpperCase(),
      driverName: input.driverName?.trim(),
      customerName: input.customerName.trim(),
      storageYard: input.storageYard.trim(),
      kavlingNumber: input.kavlingNumber.trim(),
      woodSpecies: input.woodSpecies.trim(),
      pieces: Number(input.pieces),
      volumeM3: Number(input.volumeM3),
      pricePerM3: Number(input.pricePerM3),
      totalPrice,
      paymentStatus: input.paymentStatus || 'UNPAID',
      invoiceNumber: input.invoiceNumber?.trim(),
      notes: input.notes?.trim(),
      createdAt: index >= 0 ? prev[index].createdAt : now,
      updatedAt: now,
    };

    const nextSales = index >= 0
      ? prev.map((s, i) => (i === index ? record : s))
      : [record, ...prev];

    salesRef.current = nextSales;
    setSales(nextSales);
    await persistSales(nextSales);

    syncWithServer(async () => {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) throw new Error(`Server sync failed HTTP ${res.status}`);
    }, true);

    return record;
  }, [syncWithServer]);

  const deleteSale = useCallback(async (id: string): Promise<void> => {
    hasMutatedRef.current = true;
    const prev = salesRef.current;
    const nextSales = prev.filter((s) => s.id !== id);

    salesRef.current = nextSales;
    setSales(nextSales);
    await persistSales(nextSales);

    syncWithServer(async () => {
      const res = await fetch(`/api/sales?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Delete sync failed HTTP ${res.status}`);
    }, true);
  }, [syncWithServer]);

  const getLotBalance = useCallback((yard: string, kavling: string): LotStockBalance => {
    return calculateLotStockBalance(inboundRecords, salesRef.current, yard, kavling);
  }, [inboundRecords]);

  const customerHistory = useMemo(() => {
    const names = sales.map((s) => s.customerName.trim()).filter(Boolean);
    return Array.from(new Set(names));
  }, [sales]);

  return {
    sales,
    isSyncing,
    isHydrated,
    saveSale,
    deleteSale,
    getLotBalance,
    customerHistory,
  };
}

