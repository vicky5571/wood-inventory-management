/**
 * src/persistence/sqlite-record-store.ts
 *
 * Relational SQLite Record Store for Wood Receiving Records and Master Data.
 * Implements the asynchronous persistence contract backed by SQLite relational tables
 * and views using Node.js 26 native node:sqlite.
 */

import type { DatabaseSync } from 'node:sqlite';
import { createSqliteDatabase } from './sqlite/db.ts';
import { runMigrations } from './sqlite/migrations.ts';
import { migrateJsonToSqlite, saveManifestToSqlite } from './sqlite/migrate-json.ts';
import {
  seedStorageLocationsIfEmpty,
  getStorageLocationsFromDb,
  saveStorageYardToDb,
  saveStorageLotToDb,
} from './sqlite/storage-locations-db.ts';
import {
  seedMasterDataIfEmpty,
  getSuppliersFromDb,
  saveSupplierToDb,
  deleteSupplierFromDb,
  getSpeciesFromDb,
  saveSpeciesToDb,
} from './sqlite/master-data-queries.ts';
import {
  seedBrokersIfEmpty,
  getBrokersFromDb,
  saveBrokerToDb,
  deleteBrokerFromDb,
} from './sqlite/broker-queries.ts';
import {
  getSettingsFromDb,
  saveSettingsToDb,
  listActivityLogsFromDb,
  appendActivityLogToDb,
} from './sqlite/activity-queries.ts';
import { SEED_WOOD_RECORDS } from './seed/fixtures.ts';
import { queryPaginatedRecords, deleteRecordFromSqlite } from './sqlite/record-queries.ts';
import { seedSalesIfEmpty } from './sqlite/sales-queries.ts';
import type {
  WoodReceivingRecord,
  RecordQueryParams,
  PaginatedResult,
  ManifestFormInput,
  StorageYard,
  StorageLot,
  StorageLotStatus,
  StorageLotWithYard,
  Supplier,
  Broker,
  WoodSpecies,
  AppSettings,
  ActivityLogEntry,
} from '../types/index.ts';

export class SqliteRecordStore {
  private db: DatabaseSync;
  private initialized = false;

  constructor(dbPath?: string) {
    this.db = createSqliteDatabase(dbPath);
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    runMigrations(this.db);

    const countRow = this.db.prepare('SELECT COUNT(*) AS c FROM tenants;').get() as { c: number } | undefined;
    const isBrandNewDb = !countRow || countRow.c === 0;

    seedStorageLocationsIfEmpty(this.db);
    seedMasterDataIfEmpty(this.db);
    seedBrokersIfEmpty(this.db);

    if (isBrandNewDb) {
      migrateJsonToSqlite(this.db, SEED_WOOD_RECORDS);
      seedSalesIfEmpty(this.db);
    }
    this.initialized = true;
  }

  async getAll(): Promise<WoodReceivingRecord[]> {
    this.ensureInitialized();
    const rows = this.db.prepare('SELECT * FROM v_buku_besar_flat ORDER BY receiptDate DESC, id ASC;').all();
    return rows as unknown as WoodReceivingRecord[];
  }

  async getPaginated(params: RecordQueryParams = {}): Promise<PaginatedResult<WoodReceivingRecord>> {
    this.ensureInitialized();
    return queryPaginatedRecords(this.db, params);
  }

  async getById(id: string): Promise<WoodReceivingRecord | null> {
    this.ensureInitialized();
    const row = this.db.prepare('SELECT * FROM v_buku_besar_flat WHERE id = ?;').get(id);
    return (row as unknown as WoodReceivingRecord) || null;
  }

  async save(record: WoodReceivingRecord): Promise<WoodReceivingRecord> {
    this.ensureInitialized();
    const now = new Date().toISOString();
    const manifestId = record.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const recordToSave: WoodReceivingRecord = {
      ...record,
      id: manifestId,
      createdAt: record.createdAt || now,
      updatedAt: now,
    };

    migrateJsonToSqlite(this.db, [recordToSave]);
    const saved = await this.getById(manifestId);
    if (!saved) {
      throw new Error(`Failed to save record ${manifestId}`);
    }
    return saved;
  }

  async saveManifest(manifest: ManifestFormInput): Promise<WoodReceivingRecord[]> {
    this.ensureInitialized();
    const manifestId = saveManifestToSqlite(this.db, manifest);
    const rows = this.db.prepare('SELECT * FROM v_buku_besar_flat WHERE manifest_id = ? ORDER BY id ASC;').all(manifestId);
    return rows as unknown as WoodReceivingRecord[];
  }

  async deleteManifest(manifestId: string): Promise<boolean> {
    this.ensureInitialized();
    const result = this.db.prepare('DELETE FROM receiving_manifests WHERE id = ?;').run(manifestId);
    return Number(result.changes) > 0;
  }

  async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    return deleteRecordFromSqlite(this.db, id);
  }

  async reset(): Promise<WoodReceivingRecord[]> {
    this.ensureInitialized();
    this.db.exec('DELETE FROM receiving_items;');
    this.db.exec('DELETE FROM receiving_manifests;');
    migrateJsonToSqlite(this.db, SEED_WOOD_RECORDS);
    return this.getAll();
  }

  async getStorageLocations(): Promise<{ yards: StorageYard[]; lots: StorageLotWithYard[] }> {
    this.ensureInitialized();
    return getStorageLocationsFromDb(this.db);
  }

  async saveStorageYard(yard: { id?: string; name: string; yardCode?: string; description?: string }): Promise<StorageYard> {
    this.ensureInitialized();
    return saveStorageYardToDb(this.db, yard);
  }

  async saveStorageLot(lot: { id?: string; yardId: string; lotCode: string; status?: StorageLotStatus }): Promise<StorageLot> {
    this.ensureInitialized();
    return saveStorageLotToDb(this.db, lot);
  }

  async getSuppliers(): Promise<Supplier[]> {
    this.ensureInitialized();
    return getSuppliersFromDb(this.db);
  }

  async saveSupplier(data: Partial<Supplier> & { name: string }): Promise<Supplier> {
    this.ensureInitialized();
    return saveSupplierToDb(this.db, data);
  }

  async deleteSupplier(id: string): Promise<boolean> {
    this.ensureInitialized();
    return deleteSupplierFromDb(this.db, id);
  }

  async getBrokers(): Promise<Broker[]> {
    this.ensureInitialized();
    return getBrokersFromDb(this.db);
  }

  async saveBroker(data: Partial<Broker> & { name: string }): Promise<Broker> {
    this.ensureInitialized();
    return saveBrokerToDb(this.db, data);
  }

  async deleteBroker(id: string): Promise<boolean> {
    this.ensureInitialized();
    return deleteBrokerFromDb(this.db, id);
  }

  async getSpecies(): Promise<WoodSpecies[]> {
    this.ensureInitialized();
    return getSpeciesFromDb(this.db);
  }

  async saveSpecies(species: Partial<WoodSpecies> & { code: string; commonName: string }): Promise<WoodSpecies> {
    this.ensureInitialized();
    return saveSpeciesToDb(this.db, species);
  }

  async getSettings(): Promise<AppSettings> {
    this.ensureInitialized();
    return getSettingsFromDb(this.db);
  }

  async saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    this.ensureInitialized();
    return saveSettingsToDb(this.db, patch);
  }

  async getActivityLogs(actionFilter?: string, limit?: number): Promise<ActivityLogEntry[]> {
    this.ensureInitialized();
    return listActivityLogsFromDb(this.db, actionFilter, limit);
  }

  async appendActivityLog(
    entry: Omit<ActivityLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): Promise<ActivityLogEntry> {
    this.ensureInitialized();
    return appendActivityLogToDb(this.db, entry);
  }

  public getDatabase(): DatabaseSync {
    this.ensureInitialized();
    return this.db;
  }

  close(): void {
    try {
      this.db.close();
    } catch {
      // Ignore if already closed
    }
  }
}

export const sqliteRecordStore = new SqliteRecordStore();
