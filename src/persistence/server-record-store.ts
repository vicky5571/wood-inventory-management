/**
 * src/persistence/server-record-store.ts
 *
 * Server persistence bridge for wood receiving records, master data, settings, and audit logs.
 * Primary backing engine: native relational SQLite (SqliteRecordStore) or Supabase (when configured).
 * Backward-compatible fallback: file-based JSON store (FileRecordStore).
 */

import path from 'node:path';
import { SqliteRecordStore, sqliteRecordStore } from './sqlite-record-store.ts';
import { FileRecordStore } from './file-record-store.ts';
import { isSupabaseConfigured } from './supabase/supabase-client.ts';
import { SupabaseRecordStore } from './supabase/supabase-record-store.ts';
import { paginateInMemoryRecords } from './in-memory-pagination.ts';
import { ServerMasterDataBridge } from './server-master-data-bridge.ts';
import { ServerPriceBridge } from './server-price-bridge.ts';
import type {
  WoodReceivingRecord, RecordQueryParams, PaginatedResult, ManifestFormInput,
  StorageYard, StorageLot, StorageLotStatus, StorageLotWithYard,
  Supplier, Broker, WoodSpecies, AppSettings, ActivityLogEntry,
  TimberPriceEntry, ReportPeriod, ReportPeriodClosePreview,
} from '../types/index.ts';

export class ServerRecordStore {
  private fileStore: FileRecordStore | null = null;
  private sqliteStore: SqliteRecordStore | null = null;
  private supabaseStore: SupabaseRecordStore | null = null;
  private explicitFilePath?: string;
  private masterDataBridge: ServerMasterDataBridge;
  private priceBridge: ServerPriceBridge;

  constructor(filePathOrStore?: string | SqliteRecordStore) {
    if (typeof filePathOrStore === 'string') {
      this.explicitFilePath = filePathOrStore;
    } else if (filePathOrStore instanceof SqliteRecordStore) {
      this.sqliteStore = filePathOrStore;
    }
    this.masterDataBridge = new ServerMasterDataBridge(
      () => this.isSupabaseMode(),
      () => this.isFileMode(),
      () => this.getSqliteStore()
    );
    this.priceBridge = new ServerPriceBridge(() => this.getSqliteStore());
  }

  private isSupabaseMode(): boolean {
    return !this.isFileMode() && isSupabaseConfigured();
  }

  private isFileMode(): boolean {
    if (this.sqliteStore) return false;
    if (this.explicitFilePath) return true;
    const envPath = process.env.WOOD_RECORDS_PATH;
    return Boolean(envPath && envPath.trim() !== '');
  }

  private getFileStore(): FileRecordStore {
    if (!this.fileStore) {
      const targetPath = this.explicitFilePath || process.env.WOOD_RECORDS_PATH || path.resolve(process.cwd(), 'data/wood-records.json');
      this.fileStore = new FileRecordStore(targetPath);
    }
    return this.fileStore;
  }

  private getSqliteStore(): SqliteRecordStore {
    if (!this.sqliteStore) {
      this.sqliteStore = this.explicitFilePath ? new SqliteRecordStore(this.explicitFilePath) : sqliteRecordStore;
    }
    return this.sqliteStore;
  }

  private getSupabaseStore(): SupabaseRecordStore {
    if (!this.supabaseStore) {
      this.supabaseStore = new SupabaseRecordStore();
    }
    return this.supabaseStore;
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
    if (this.isFileMode()) {
      const records = await this.getFileStore().getAll();
      return paginateInMemoryRecords(records, params);
    }
    return this.getSqliteStore().getPaginated(params);
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

  getStorageLocations() { return this.masterDataBridge.getStorageLocations(); }
  saveStorageYard(yard: { id?: string; name: string; yardCode?: string; description?: string }) { return this.masterDataBridge.saveStorageYard(yard); }
  saveStorageLot(lot: { id?: string; yardId: string; lotCode: string; status?: StorageLotStatus }) { return this.masterDataBridge.saveStorageLot(lot); }
  updateStorageLotStatus(id: string, status: StorageLotStatus) { return this.masterDataBridge.updateStorageLotStatus(id, status); }
  deleteStorageLot(id: string) { return this.masterDataBridge.deleteStorageLot(id); }
  deleteStorageYard(id: string) { return this.masterDataBridge.deleteStorageYard(id); }
  getSuppliers() { return this.masterDataBridge.getSuppliers(); }
  saveSupplier(data: Partial<Supplier> & { name: string }) { return this.masterDataBridge.saveSupplier(data); }
  deleteSupplier(id: string) { return this.masterDataBridge.deleteSupplier(id); }
  getBrokers() { return this.masterDataBridge.getBrokers(); }
  saveBroker(data: Partial<Broker> & { name: string }) { return this.masterDataBridge.saveBroker(data); }
  deleteBroker(id: string) { return this.masterDataBridge.deleteBroker(id); }
  getSpecies() { return this.masterDataBridge.getSpecies(); }
  saveSpecies(species: Partial<WoodSpecies> & { code: string; commonName: string }) { return this.masterDataBridge.saveSpecies(species); }
  getSettings() { return this.masterDataBridge.getSettings(); }
  saveSettings(patch: Partial<AppSettings>) { return this.masterDataBridge.saveSettings(patch); }
  getActivityLogs(actionFilter?: string, limit?: number) { return this.masterDataBridge.getActivityLogs(actionFilter, limit); }
  getUserActivityLogs(userId: string, limit?: number) { return this.masterDataBridge.getUserActivityLogs(userId, limit); }
  appendActivityLog(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) { return this.masterDataBridge.appendActivityLog(entry); }

  getAllPriceEntries() { return this.priceBridge.getAllPriceEntries(); }
  savePriceEntry(entry: Omit<TimberPriceEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) { return this.priceBridge.savePriceEntry(entry); }
  deletePriceEntry(id: string) { return this.priceBridge.deletePriceEntry(id); }
  getAllReportPeriods() { return this.priceBridge.getAllReportPeriods(); }
  saveReportPeriod(period: Omit<ReportPeriod, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) { return this.priceBridge.saveReportPeriod(period); }
  previewReportPeriodClose(periodId: string, records: WoodReceivingRecord[]) { return this.priceBridge.previewReportPeriodClose(periodId, records); }
  closeReportPeriod(periodId: string, records: WoodReceivingRecord[], closedBy: string) { return this.priceBridge.closeReportPeriod(periodId, records, closedBy); }
  reopenReportPeriod(periodId: string, reopenedBy: string, reason: string) { return this.priceBridge.reopenReportPeriod(periodId, reopenedBy, reason); }

  close(): void {
    if (!this.isFileMode()) {
      this.getSqliteStore().close();
    }
  }
}

export const serverRecordStore = new ServerRecordStore();
