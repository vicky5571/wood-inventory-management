/**
 * src/persistence/file-record-store.ts
 *
 * File-based JSON fallback store with serialized promise mutex and atomic writes.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { SEED_WOOD_RECORDS } from './seed-data.ts';
import type { WoodReceivingRecord, ManifestFormInput } from '../types/index.ts';
import { applyManifestToRecords } from '../utils/manifest-flattener.ts';

export class FileRecordStore {
  private filePath: string;
  private cache: WoodReceivingRecord[] | null = null;
  private writeLock: Promise<unknown> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private runExclusive<T>(action: () => Promise<T>): Promise<T> {
    const next = this.writeLock.then(action, action);
    this.writeLock = next.then(() => {}, () => {});
    return next;
  }

  private async writeAtomically(targetPath: string, data: WoodReceivingRecord[]): Promise<void> {
    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });
    const tmpPath = `${targetPath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpPath, targetPath);
  }

  private async hydrateSeed(targetPath: string): Promise<WoodReceivingRecord[]> {
    const seedClone: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    await this.writeAtomically(targetPath, seedClone);
    this.cache = seedClone;
    return JSON.parse(JSON.stringify(seedClone));
  }

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

    return this.hydrateSeed(this.filePath);
  }

  async getById(id: string): Promise<WoodReceivingRecord | null> {
    const all = await this.getAll();
    return all.find((r) => r.id === id) || null;
  }

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

      await this.writeAtomically(this.filePath, records);
      this.cache = records;
      return JSON.parse(JSON.stringify(targetRecord));
    });
  }

  async saveManifest(manifest: ManifestFormInput): Promise<WoodReceivingRecord[]> {
    return this.runExclusive(async () => {
      const records = await this.getAll();
      const { next, flattened } = applyManifestToRecords(records, manifest);
      await this.writeAtomically(this.filePath, next);
      this.cache = next;
      return JSON.parse(JSON.stringify(flattened));
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.runExclusive(async () => {
      const records = await this.getAll();
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) return false;

      records.splice(index, 1);
      await this.writeAtomically(this.filePath, records);
      this.cache = records;
      return true;
    });
  }

  async deleteManifest(manifestId: string): Promise<boolean> {
    return this.runExclusive(async () => {
      const records = await this.getAll();
      const initialLen = records.length;
      const filtered = records.filter((r) => r.manifest_id !== manifestId && r.id !== manifestId);
      if (filtered.length === initialLen) return false;

      await this.writeAtomically(this.filePath, filtered);
      this.cache = filtered;
      return true;
    });
  }

  async reset(): Promise<WoodReceivingRecord[]> {
    return this.runExclusive(async () => {
      return this.hydrateSeed(this.filePath);
    });
  }
}

