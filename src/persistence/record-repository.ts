/**
 * src/persistence/record-repository.ts
 *
 * Repository pattern implementation for wood receiving records.
 * Provides resilient CRUD, filtering, and seed resetting over a StorageAdapter.
 */

import { SEED_WOOD_RECORDS } from './seed-data.ts';
import type { StorageAdapter } from './storage.ts';
import type { WoodReceivingRecord, RecordFilterCriteria } from '../types/index.ts';
import { recordMatchesSearchQuery } from '../utils/record-search.ts';

const STORAGE_KEY = 'wood_receiving_records_v1';

export class WoodRecordRepository {
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  async getAll(): Promise<WoodReceivingRecord[]> {
    const stored = await this.storage.getItem<WoodReceivingRecord[]>(STORAGE_KEY);
    if (stored === null || stored === undefined || !Array.isArray(stored)) {
      const fresh: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
      await this.storage.setItem(STORAGE_KEY, fresh);
      return fresh;
    }
    return stored;
  }

  async filter(criteria: RecordFilterCriteria = {}): Promise<WoodReceivingRecord[]> {
    return this.getFiltered(criteria);
  }

  async getFiltered(criteria: RecordFilterCriteria = {}): Promise<WoodReceivingRecord[]> {
    const records = await this.getAll();
    return records.filter((r) => {
      if (criteria.species && r.woodSpecies !== criteria.species) {
        return false;
      }
      if (criteria.kavling && r.kavlingNumber !== criteria.kavling) {
        return false;
      }
      if (criteria.startDate && r.receiptDate < criteria.startDate) {
        return false;
      }
      if (criteria.endDate && r.receiptDate > criteria.endDate) {
        return false;
      }
      if (criteria.searchQuery && !recordMatchesSearchQuery(r, criteria.searchQuery)) {
        return false;
      }
      return true;
    });
  }

  async getById(id: string): Promise<WoodReceivingRecord | null> {
    const records = await this.getAll();
    return records.find((r) => r.id === id) ?? null;
  }

  async save(record: WoodReceivingRecord): Promise<void> {
    const records = await this.getAll();
    const index = records.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      records[index] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      records.unshift({
        ...record,
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await this.storage.setItem(STORAGE_KEY, records);
  }

  async delete(id: string): Promise<void> {
    const records = await this.getAll();
    const filtered = records.filter((r) => r.id !== id);
    await this.storage.setItem(STORAGE_KEY, filtered);
  }

  async resetToSeed(): Promise<WoodReceivingRecord[]> {
    const fresh = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    await this.storage.setItem(STORAGE_KEY, fresh);
    return fresh;
  }
}
