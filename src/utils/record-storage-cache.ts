import type { WoodReceivingRecord, PaginationMeta } from '../types/index.ts';
import { SEED_WOOD_RECORDS } from '../persistence/seed-data.ts';
import { toast } from './toast-store.ts';

export const WOOD_RECORDS_STORAGE_KEY = 'wood_receiving_records_next_v1';

export const DEFAULT_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: 50,
  totalRecords: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

let memoryRecordsCache: WoodReceivingRecord[] | null = null;

export function getMemoryRecordsCache(): WoodReceivingRecord[] | null {
  return memoryRecordsCache;
}

export function setMemoryRecordsCache(records: WoodReceivingRecord[] | null): void {
  memoryRecordsCache = records;
}

export function areRecordsEqual(prev: WoodReceivingRecord[], next: WoodReceivingRecord[]): boolean {
  if (prev.length !== next.length) return false;
  if (prev.length === 0) return true;
  return prev[0]?.id === next[0]?.id && prev[0]?.updatedAt === next[0]?.updatedAt && prev[prev.length - 1]?.id === next[next.length - 1]?.id;
}

export function persistRecords(records: WoodReceivingRecord[]): void {
  memoryRecordsCache = records;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(WOOD_RECORDS_STORAGE_KEY, JSON.stringify(records));
    }
  } catch (e) {
    console.error('Failed to persist to localStorage:', e);
  }
}

export function createSeedRecords(): WoodReceivingRecord[] {
  const seed: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
  persistRecords(seed);
  return seed;
}

export function loadInitialRecords(): WoodReceivingRecord[] {
  const cached = getMemoryRecordsCache();
  if (cached) return cached;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(WOOD_RECORDS_STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMemoryRecordsCache(parsed);
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to parse localStorage records:', e);
  }
  return createSeedRecords();
}

export function notifySyncFailure(): void {
  toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
}

export function showDeleteRecordToast(record: WoodReceivingRecord, onUndo: () => void): void {
  const plate = record.truckPlateNumber ? `Truk ${record.truckPlateNumber}` : 'Penerimaan';
  const vol = record.tallyVolumeM3 ? `${record.tallyVolumeM3} m³` : '0 m³';
  toast.warning(
    'Data Penerimaan Dihapus (入库记录已删除)',
    `${plate} • ${vol} (${record.woodSpecies || 'Kayu'})`,
    5000,
    {
      label: 'Urungkan (撤销)',
      onClick: () => {
        onUndo();
        toast.success('Data Penerimaan Dipulihkan (已恢复)', `${plate} berhasil dikembalikan ke buku besar.`);
      },
    }
  );
}

export function computeEffectivePagination(
  pagination: PaginationMeta,
  totalItems: number,
  page: number,
  pageSize: number
): PaginationMeta {
  if (pagination.totalRecords > 0) return pagination;
  const totalPages = totalItems === 0 ? 0 : pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1;
  return {
    page,
    pageSize,
    totalRecords: totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}
