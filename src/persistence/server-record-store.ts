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
import type {
  WoodReceivingRecord,
  ManifestFormInput,
  StorageYard,
  StorageLot,
  StorageLotStatus,
  StorageLotWithYard,
} from '../types/index.ts';
import { loadStorageLocations, addYard, addLot } from '../utils/storage-locations.ts';

export class ServerRecordStore {
  private explicitFilePath: string | null = null;
  private explicitSqliteStore: SqliteRecordStore | null = null;
  private fileStore: FileRecordStore | null = null;

  constructor(filePathOrStore?: string | SqliteRecordStore) {
    if (filePathOrStore instanceof SqliteRecordStore) {
      this.explicitSqliteStore = filePathOrStore;
    } else if (typeof filePathOrStore === 'string') {
      this.explicitFilePath = path.resolve(process.cwd(), filePathOrStore);
    }
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
    return this.isFileMode() ? this.getFileStore().getAll() : this.getSqliteStore().getAll();
  }

  async getById(id: string): Promise<WoodReceivingRecord | null> {
    return this.isFileMode() ? this.getFileStore().getById(id) : this.getSqliteStore().getById(id);
  }

  async save(record: WoodReceivingRecord): Promise<WoodReceivingRecord> {
    return this.isFileMode() ? this.getFileStore().save(record) : this.getSqliteStore().save(record);
  }

  async saveManifest(manifest: ManifestFormInput): Promise<WoodReceivingRecord[]> {
    return this.isFileMode() ? this.getFileStore().saveManifest(manifest) : this.getSqliteStore().saveManifest(manifest);
  }

  async delete(id: string): Promise<boolean> {
    return this.isFileMode() ? this.getFileStore().delete(id) : this.getSqliteStore().delete(id);
  }

  async deleteManifest(manifestId: string): Promise<boolean> {
    return this.isFileMode() ? this.getFileStore().deleteManifest(manifestId) : this.getSqliteStore().deleteManifest(manifestId);
  }

  async reset(): Promise<WoodReceivingRecord[]> {
    return this.isFileMode() ? this.getFileStore().reset() : this.getSqliteStore().reset();
  }

  /**
   * Retrieves storage locations (yards and joined lots).
   */
  async getStorageLocations(): Promise<{ yards: StorageYard[]; lots: StorageLotWithYard[] }> {
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
