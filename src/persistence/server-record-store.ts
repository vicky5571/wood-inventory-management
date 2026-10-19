/**
 * src/persistence/server-record-store.ts
 *
 * Server persistence bridge for wood receiving records.
 * Primary backing engine: native relational SQLite (SqliteRecordStore).
 * Backward-compatible fallback: file-based JSON store (FileRecordStore)
 * when explicit filePath or WOOD_RECORDS_PATH is configured.
 */

import path from 'node:path';
import { SqliteRecordStore, sqliteRecordStore } from './sqlite-record-store.ts';
import { FileRecordStore } from './file-record-store.ts';
import { isSupabaseConfigured, supabaseFetch } from './supabase/supabase-client.ts';
import { SupabaseRecordStore } from './supabase/supabase-record-store.ts';
import type {
  WoodReceivingRecord,
  RecordQueryParams,
  PaginatedResult,
  ManifestFormInput,
  StorageYard,
  StorageLot,
  StorageLotStatus,
  StorageLotWithYard,
} from '../types/index.ts';
import { loadStorageLocations, addYard, addLot } from '../utils/storage-locations.ts';

const ALLOWED_SORT_COLUMNS = new Set<string>([
  'receiptDate',
  'truckPlateNumber',
  'supplierName',
  'tallyVolumeM3',
  'grandNetPayable',
  'createdAt',
]);

function paginateInMemoryRecords(
  records: WoodReceivingRecord[],
  params: RecordQueryParams = {}
): PaginatedResult<WoodReceivingRecord> {
  const page = Math.max(1, Number(params.page) || 1);
  const rawPageSize = params.pageSize !== undefined ? Number(params.pageSize) : 50;
  const pageSize = rawPageSize === -1 ? -1 : Math.max(1, rawPageSize || 50);

  const filtered = records.filter((r) => {
    if (params.species && r.woodSpecies !== params.species) return false;
    if (params.kavling && r.kavlingNumber !== params.kavling) return false;
    if (params.yard && r.storageYard !== params.yard) return false;
    if (params.startDate && r.receiptDate < params.startDate) return false;
    if (params.endDate && r.receiptDate > params.endDate) return false;
    if (params.paymentStatus && params.paymentStatus !== 'ALL') {
      const status = r.paymentStatus || 'UNPAID';
      if (params.paymentStatus !== status) return false;
    }
    if (params.searchQuery && params.searchQuery.trim().length > 0) {
      const q = params.searchQuery.trim().toLowerCase();
      const match =
        Boolean(r.truckPlateNumber?.toLowerCase().includes(q)) ||
        Boolean(r.forestryDocNumber?.toLowerCase().includes(q)) ||
        Boolean(r.receiptNumber?.toLowerCase().includes(q)) ||
        Boolean(r.contractNumber?.toLowerCase().includes(q)) ||
        Boolean(r.supplierName?.toLowerCase().includes(q)) ||
        Boolean(r.invoiceNumber?.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const validSortBy = params.sortBy && ALLOWED_SORT_COLUMNS.has(params.sortBy)
    ? params.sortBy
    : 'receiptDate';
  const sortMultiplier = params.sortOrder === 'ASC' ? 1 : -1;

  filtered.sort((a, b) => {
    const valA = (a as unknown as Record<string, unknown>)[validSortBy] ?? '';
    const valB = (b as unknown as Record<string, unknown>)[validSortBy] ?? '';
    if (valA < valB) return -1 * sortMultiplier;
    if (valA > valB) return 1 * sortMultiplier;
    return a.id < b.id ? -1 : 1;
  });

  const totalRecords = filtered.length;
  const totalPages = totalRecords === 0
    ? 0
    : pageSize > 0
    ? Math.ceil(totalRecords / pageSize)
    : 1;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1 && totalPages > 0;

  const data = pageSize > 0
    ? filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
    : filtered;

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export class ServerRecordStore {
  private explicitFilePath: string | null = null;
  private explicitSqliteStore: SqliteRecordStore | null = null;
  private fileStore: FileRecordStore | null = null;
  private supabaseStore: SupabaseRecordStore | null = null;

  constructor(filePathOrStore?: string | SqliteRecordStore) {
    if (filePathOrStore instanceof SqliteRecordStore) {
      this.explicitSqliteStore = filePathOrStore;
    } else if (typeof filePathOrStore === 'string') {
      this.explicitFilePath = path.resolve(process.cwd(), filePathOrStore);
    }
  }

  private isSupabaseMode(): boolean {
    if (this.explicitFilePath || this.explicitSqliteStore) return false;
    return isSupabaseConfigured();
  }

  private getSupabaseStore(): SupabaseRecordStore {
    if (!this.supabaseStore) {
      this.supabaseStore = new SupabaseRecordStore();
    }
    return this.supabaseStore;
  }

  private isFileMode(): boolean {
    if (this.explicitFilePath) return true;
    if (this.explicitSqliteStore) return false;
    return Boolean(process.env.WOOD_RECORDS_PATH);
  }

  private getEffectiveFilePath(): string {
    if (this.explicitFilePath) return this.explicitFilePath;
    if (process.env.WOOD_RECORDS_PATH) return path.resolve(process.env.WOOD_RECORDS_PATH);
    return path.resolve(path.join(process.cwd(), 'data', 'wood_records.json'));
  }

  private getFileStore(): FileRecordStore {
    if (!this.fileStore) {
      this.fileStore = new FileRecordStore(this.getEffectiveFilePath());
    }
    return this.fileStore;
  }

  private getSqliteStore(): SqliteRecordStore {
    return this.explicitSqliteStore || sqliteRecordStore;
  }

  async getAll(): Promise<WoodReceivingRecord[]> {
    if (this.isSupabaseMode()) {
      try {
        return await this.getSupabaseStore().getAll();
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase getAll failed, falling back to SQLite:', err);
      }
    }
    return this.isFileMode() ? this.getFileStore().getAll() : this.getSqliteStore().getAll();
  }

  async getPaginated(params: RecordQueryParams = {}): Promise<PaginatedResult<WoodReceivingRecord>> {
    if (this.isSupabaseMode()) {
      try {
        return await this.getSupabaseStore().getPaginated(params);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase getPaginated failed, falling back to SQLite:', err);
      }
    }
    if (!this.isFileMode()) {
      return this.getSqliteStore().getPaginated(params);
    }
    const records = await this.getFileStore().getAll();
    return paginateInMemoryRecords(records, params);
  }

  async getById(id: string): Promise<WoodReceivingRecord | null> {
    if (this.isSupabaseMode()) {
      try {
        return await this.getSupabaseStore().getById(id);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase getById failed, falling back to SQLite:', err);
      }
    }
    return this.isFileMode() ? this.getFileStore().getById(id) : this.getSqliteStore().getById(id);
  }

  async save(record: WoodReceivingRecord): Promise<WoodReceivingRecord> {
    if (this.isSupabaseMode()) {
      try {
        return await this.getSupabaseStore().save(record);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase save failed, falling back to SQLite:', err);
      }
    }
    return this.isFileMode() ? this.getFileStore().save(record) : this.getSqliteStore().save(record);
  }

  async saveManifest(manifest: ManifestFormInput): Promise<WoodReceivingRecord[]> {
    if (this.isSupabaseMode()) {
      try {
        return await this.getSupabaseStore().saveManifest(manifest);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase saveManifest failed, falling back to SQLite:', err);
      }
    }
    return this.isFileMode() ? this.getFileStore().saveManifest(manifest) : this.getSqliteStore().saveManifest(manifest);
  }

  async delete(id: string): Promise<boolean> {
    if (this.isSupabaseMode()) {
      try {
        return await this.getSupabaseStore().delete(id);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase delete failed, falling back to SQLite:', err);
      }
    }
    return this.isFileMode() ? this.getFileStore().delete(id) : this.getSqliteStore().delete(id);
  }

  async deleteManifest(manifestId: string): Promise<boolean> {
    if (this.isSupabaseMode()) {
      try {
        return await this.getSupabaseStore().deleteManifest(manifestId);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase deleteManifest failed, falling back to SQLite:', err);
      }
    }
    return this.isFileMode() ? this.getFileStore().deleteManifest(manifestId) : this.getSqliteStore().deleteManifest(manifestId);
  }

  async reset(): Promise<WoodReceivingRecord[]> {
    return this.isFileMode() ? this.getFileStore().reset() : this.getSqliteStore().reset();
  }

  /**
   * Retrieves storage locations (yards and joined lots).
   */
  async getStorageLocations(): Promise<{ yards: StorageYard[]; lots: StorageLotWithYard[] }> {
    if (this.isSupabaseMode()) {
      try {
        const yardsData = await supabaseFetch<any[]>('/storage_yards?select=*&order=name.asc');
        const yards: StorageYard[] = yardsData.map((y) => ({
          id: y.id,
          tenantId: y.tenant_id || 'default-tenant',
          yardCode: y.yard_code,
          name: y.name,
          description: y.description || undefined,
          createdAt: y.created_at || new Date().toISOString(),
          updatedAt: y.updated_at || new Date().toISOString(),
        }));
        const lotsData = await supabaseFetch<any[]>('/storage_lots?select=*,storage_yards(name,location_code)&order=lot_code.asc');
        const lots: StorageLotWithYard[] = lotsData.map((l) => ({
          id: l.id,
          tenantId: l.tenant_id || 'default-tenant',
          yardId: l.yard_id,
          lotCode: l.lot_code,
          status: l.status,
          createdAt: l.created_at || new Date().toISOString(),
          updatedAt: l.updated_at || new Date().toISOString(),
          yardCode: l.storage_yards?.location_code || '',
          yardName: l.storage_yards?.name || '',
        }));
        return { yards, lots };
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase getStorageLocations failed, falling back to SQLite:', err);
      }
    }
    if (!this.isFileMode()) {
      return this.getSqliteStore().getStorageLocations();
    }
    const data = loadStorageLocations();
    const lots: StorageLotWithYard[] = data.lots.map((lot) => {
      const yard = data.yards.find((y) => y.id === lot.yardId);
      return {
        ...lot,
        yardCode: yard?.yardCode || '',
        yardName: yard?.name || '',
      };
    });
    return { yards: data.yards, lots };
  }

  /**
   * Saves or updates a storage yard.
   */
  async saveStorageYard(yard: { id?: string; name: string; yardCode?: string; description?: string }): Promise<StorageYard> {
    if (!this.isFileMode()) {
      return this.getSqliteStore().saveStorageYard(yard);
    }
    return addYard(yard.name, yard.description);
  }

  /**
   * Saves or updates a storage lot.
   */
  async saveStorageLot(lot: { id?: string; yardId: string; lotCode: string; status?: StorageLotStatus }): Promise<StorageLot> {
    if (!this.isFileMode()) {
      return this.getSqliteStore().saveStorageLot(lot);
    }
    return addLot(lot.yardId, lot.lotCode, lot.status);
  }

  /**
   * Closes SQLite database connection if active.
   */
  close(): void {
    if (!this.isFileMode()) {
      this.getSqliteStore().close();
    }
  }
}

export const serverRecordStore = new ServerRecordStore();
