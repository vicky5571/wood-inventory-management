/**
 * src/persistence/server-record-store.ts
 *
 * Persistent, atomic server-side JSON store for wood receiving records.
 * Serves as the single server persistence layer writing to data/wood_records.json
 * with automatic SEED_WOOD_RECORDS hydration fallback, serialized runExclusive
 * mutex queue, and atomic rename writes.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { SEED_WOOD_RECORDS } from './seed-data.ts';
import type { WoodReceivingRecord } from '../types/index.ts';

export class ServerRecordStore {
  private filePath: string;
  private cache: WoodReceivingRecord[] | null = null;
  private writeLock: Promise<unknown> = Promise.resolve();

  constructor(filePath?: string) {
    this.filePath = filePath
      ? path.resolve(process.cwd(), filePath)
      : path.resolve(process.env.WOOD_RECORDS_PATH || path.join(process.cwd(), 'data', 'wood_records.json'));
  }

  /**
   * Promise-queue mutex ensuring only one critical read-modify-write action
   * executes at any given time.
   */
  private runExclusive<T>(action: () => Promise<T>): Promise<T> {
    const next = this.writeLock.then(action, action);
    this.writeLock = next.then(() => {}, () => {});
    return next;
  }

  /**
   * Low-level atomic file writer using temporary file creation and atomic rename.
   */
  private async writeAtomically(data: WoodReceivingRecord[]): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmpPath = `${this.filePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpPath, this.filePath);
  }

  /**
   * Internal helper to persist seed records and initialize cache.
   * Called directly by getAll() and inside runExclusive by reset().
   */
  private async hydrateSeed(): Promise<WoodReceivingRecord[]> {
    const seedClone: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    await this.writeAtomically(seedClone);
    this.cache = seedClone;
    return JSON.parse(JSON.stringify(seedClone));
  }

  /**
   * Retrieves all records.
   * Reads from memory cache if available. If not, reads from JSON file.
   * If file does not exist or is invalid, hydrates with SEED_WOOD_RECORDS, persists, and returns.
   */
  async getAll(): Promise<WoodReceivingRecord[]> {
    if (this.cache !== null) {
      return JSON.parse(JSON.stringify(this.cache));
    }

    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.cache = parsed;
        return JSON.parse(JSON.stringify(this.cache));
      }
    } catch {
      // File does not exist or content is malformed -> fall through to reset/hydrate
    }

    return this.hydrateSeed();
  }

  /**
   * Re-seeds store with fresh SEED_WOOD_RECORDS within a mutex lock, writes to disk, and updates memory cache.
   */
  async reset(): Promise<WoodReceivingRecord[]> {
    return this.runExclusive(async () => {
      return this.hydrateSeed();
    });
  }

  /**
   * Saves or updates a record within a mutex lock to eliminate read-modify-write race conditions.
   * - If record exists (matched by id), updates attributes and sets updatedAt.
   * - If record is new, prepends to array with id, createdAt, and updatedAt.
   * Persists atomically and updates in-memory cache.
   */
  async save(record: WoodReceivingRecord): Promise<WoodReceivingRecord> {
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

      await this.writeAtomically(records);
      this.cache = records;
      return JSON.parse(JSON.stringify(targetRecord));
    });
  }

  /**
   * Deletes a record by ID within a mutex lock.
   * Returns true if record existed and was removed, false otherwise.
   */
  async delete(id: string): Promise<boolean> {
    return this.runExclusive(async () => {
      const records = await this.getAll();
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) {
        return false;
      }

      records.splice(index, 1);
      await this.writeAtomically(records);
      this.cache = records;
      return true;
    });
  }
}

export const serverRecordStore = new ServerRecordStore();
