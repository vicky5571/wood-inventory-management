'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { WoodReceivingRecord, RecordFilterCriteria, DashboardMetrics } from '../types/index.ts';
import { aggregateDashboardMetrics } from '../utils/timber-calc.ts';
import { SEED_WOOD_RECORDS } from '../persistence/seed-data.ts';
import { toast } from '../utils/toast-store.ts';

const STORAGE_KEY = 'wood_receiving_records_next_v1';

export function useWoodRecords() {
  const [allRecords, setAllRecords] = useState<WoodReceivingRecord[]>([]);
  const [filters, setFilters] = useState<RecordFilterCriteria>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize from LocalStorage or Seed Data, then sync in background
  useEffect(() => {
    let localDataLoaded = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
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
      setAllRecords(seed);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        }
      } catch {}
      setIsHydrated(true);
    }

    // Non-blocking background server synchronization
    if (typeof fetch !== 'undefined') {
      setIsSyncing(true);
      fetch('/api/records')
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((json) => {
          if (json && json.success && Array.isArray(json.data)) {
            setAllRecords(json.data);
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
              }
            } catch (e) {
              console.error('Failed to update localStorage from server sync:', e);
            }
          }
        })
        .catch((err) => {
          // Gracefully retain local data on offline or network error
          console.debug('Background record sync skipped/offline:', err?.message || err);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, []);

  const saveRecord = useCallback((record: WoodReceivingRecord) => {
    let savedRecord: WoodReceivingRecord = record;
    setAllRecords((prev) => {
      const index = prev.findIndex((r) => r.id === record.id);
      let next: WoodReceivingRecord[];
      const now = new Date().toISOString();
      if (index >= 0) {
        savedRecord = {
          ...prev[index],
          ...record,
          updatedAt: now,
        };
        next = [...prev];
        next[index] = savedRecord;
      } else {
        savedRecord = {
          ...record,
          createdAt: record.createdAt || now,
          updatedAt: now,
        };
        next = [savedRecord, ...prev];
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch (e) {
        console.error('Failed to persist to localStorage:', e);
      }
      return next;
    });

    if (typeof fetch !== 'undefined') {
      setIsSyncing(true);
      fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedRecord),
      })
        .then((res) => {
          if (!res.ok) {
            toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
          }
        })
        .catch(() => {
          toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, []);

  const restoreRecord = useCallback((record: WoodReceivingRecord, index?: number) => {
    setAllRecords((prev) => {
      if (prev.some((r) => r.id === record.id)) return prev;
      const next = [...prev];
      if (typeof index === 'number' && index >= 0 && index <= next.length) {
        next.splice(index, 0, record);
      } else {
        next.unshift(record);
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch (e) {
        console.error('Failed to persist to localStorage:', e);
      }
      return next;
    });

    if (typeof fetch !== 'undefined') {
      setIsSyncing(true);
      fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
        .then((res) => {
          if (!res.ok) {
            toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
          }
        })
        .catch(() => {
          toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, []);

  const deleteRecord = useCallback((id: string, options?: { showUndoToast?: boolean }) => {
    let targetRecord: WoodReceivingRecord | undefined;
    let targetIndex = -1;

    setAllRecords((prev) => {
      const target = prev.find((r) => r.id === id);
      targetIndex = prev.findIndex((r) => r.id === id);
      if (target) {
        targetRecord = target;
      }

      const next = prev.filter((r) => r.id !== id);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch (e) {
        console.error('Failed to persist to localStorage:', e);
      }
      return next;
    });

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
            restoreRecord(targetRecord!, targetIndex);
            toast.success(
              'Data Penerimaan Dipulihkan (已恢复)',
              `${plate} berhasil dikembalikan ke buku besar.`
            );
          },
        }
      );
    }

    if (typeof fetch !== 'undefined') {
      setIsSyncing(true);
      fetch('/api/records?id=' + encodeURIComponent(id), {
        method: 'DELETE',
      })
        .then((res) => {
          if (!res.ok && res.status !== 404) {
            toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
          }
        })
        .catch(() => {
          toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [restoreRecord]);

  const resetDemo = useCallback(() => {
    const seed: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    setAllRecords(seed);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      }
    } catch (e) {
      console.error('Failed to persist to localStorage:', e);
    }
    setFilters({});
  }, []);

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
    isSyncing,
    setFilters,
    saveRecord,
    deleteRecord,
    restoreRecord,
    resetDemo,
    exportCsv,
  };
}
