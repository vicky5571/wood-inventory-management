/**
 * src/persistence/server-record-store.ts
 *
 * Server persistence bridge for wood receiving records.
 * Primary backing engine: native relational SQLite (SqliteRecordStore).
 * Backward-compatible fallback: file-based JSON store with serialized mutex
 * when explicit filePath or WOOD_RECORDS_PATH is configured.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { SEED_WOOD_RECORDS } from './seed-data.ts';
import { SqliteRecordStore, sqliteRecordStore } from './sqlite-record-store.ts';
import type { WoodReceivingRecord } from '../types/index.ts';

export class ServerRecordStore {
  private explicitFilePath: string | null = null;
  private explicitSqliteStore: SqliteRecordStore | null = null;
  private cache: WoodReceivingRecord[] | null = null;
  private writeLock: Promise<unknown> = Promise.resolve();

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

  private getSqliteStore(): SqliteRecordStore {
    return this.explicitSqliteStore || sqliteRecordStore;
  }

  /**
   * Promise-queue mutex ensuring only one critical read-modify-write action
   * executes at any given time for file-based operations.
   */
  private runExclusive<T>(action: () => Promise<T>): Promise<T> {
    const next = this.writeLock.then(action, action);
    this.writeLock = next.then(() => {}, () => {});
    return next;
  }

  /**
   * Low-level atomic file writer using temporary file creation and atomic rename.
   */
  private async writeAtomically(targetPath: string, data: WoodReceivingRecord[]): Promise<void> {
    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });
    const tmpPath = `${targetPath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpPath, targetPath);
  }

  /**
   * Internal helper to persist seed records and initialize cache in file mode.
   */
  private async hydrateSeed(targetPath: string): Promise<WoodReceivingRecord[]> {
    const seedClone: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    await this.writeAtomically(targetPath, seedClone);
    this.cache = seedClone;
    return JSON.parse(JSON.stringify(seedClone));
  }

  /**
   * Retrieves all records.
   * Delegates to SQLite in relational mode, or JSON cache/file in file mode.
   */
  async getAll(): Promise<WoodReceivingRecord[]> {
    if (!this.isFileMode()) {
      return this.getSqliteStore().getAll();
    }

    const targetPath = this.getEffectiveFilePath();
    if (this.cache !== null) {
      return JSON.parse(JSON.stringify(this.cache));
    }

    try {
      const raw = await fs.readFile(targetPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.cache = parsed;
        return JSON.parse(JSON.stringify(this.cache));
      }
    } catch {
      // File does not exist or content is malformed -> fall through to reset/hydrate
    }

    return this.hydrateSeed(targetPath);
  }

  /**
   * Retrieves a single record by ID.
   */
  async getById(id: string): Promise<WoodReceivingRecord | null> {
    if (!this.isFileMode()) {
      return this.getSqliteStore().getById(id);
    }
    const all = await this.getAll();
    return all.find((r) => r.id === id) || null;
  }

  /**
   * Saves or updates a record.
   * Delegates to SQLite relational engine or mutex-guarded atomic file write.
   */
  async save(record: WoodReceivingRecord): Promise<WoodReceivingRecord> {
    if (!this.isFileMode()) {
      return this.getSqliteStore().save(record);
    }

    const targetPath = this.getEffectiveFilePath();
    return this.runExclusive(async () => {
      const records = await this.getAll();
      const now = new Date().toISOString();

      const existingIndex = record.id ? records.findIndex((r) => r.id === record.id) : -1;

      let targetRecord: WoodReceivingRecord;

      if (existingIndex >= 0) {
        targetRecord = {
          ...records[existingIndex],
          ...record,
          updatedAt: now,
        };
        records[existingIndex] = targetRecord;
      } else {
        const id = record.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        targetRecord = {
          ...record,
          id,
          createdAt: record.createdAt || now,
          updatedAt: now,
        };
        records.unshift(targetRecord);
      }

      await this.writeAtomically(targetPath, records);
      this.cache = records;
      return JSON.parse(JSON.stringify(targetRecord));
    });
  }

  /**
   * Deletes a record by ID.
   */
  async delete(id: string): Promise<boolean> {
    if (!this.isFileMode()) {
      return this.getSqliteStore().delete(id);
    }

    const targetPath = this.getEffectiveFilePath();
    return this.runExclusive(async () => {
      const records = await this.getAll();
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) {
        return false;
      }

      records.splice(index, 1);
      await this.writeAtomically(targetPath, records);
      this.cache = records;
      return true;
    });
  }

  /**
   * Re-seeds store with fresh SEED_WOOD_RECORDS.
   */
  async reset(): Promise<WoodReceivingRecord[]> {
    if (!this.isFileMode()) {
      return this.getSqliteStore().reset();
    }

    const targetPath = this.getEffectiveFilePath();
    return this.runExclusive(async () => {
      return this.hydrateSeed(targetPath);
    });
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
